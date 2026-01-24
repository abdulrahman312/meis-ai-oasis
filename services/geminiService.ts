import { GoogleGenAI, Chat, HarmCategory, HarmBlockThreshold, FunctionDeclaration, Type } from "@google/genai";
import { SensorData } from "../types";
import { toggleFanControl } from "./sheetService";

const SYSTEM_INSTRUCTION = `
You are the AI Agricultural Scientist for the 'Riyadh AI-Oasis'.

**CAPABILITIES:**
You have the ability to control the **Climate Control Fan** using the \`controlFan\` tool.

**CORE DIRECTIVE:**
You must provide **SHORT, CONCISE** responses by default.
**DO NOT** provide a list of sensor readings unless explicitly asked.

**RESPONSE GUIDELINES:**

1.  **DEFAULT RESPONSE (Short & Direct):**
    *   **Length:** Keep it under 30 words.
    *   **Actions:** If you perform an action (like turning off the fan), simply confirm the action. Do NOT list temperature, humidity, etc.
    *   **Questions:** Answer only the specific metric asked (e.g., if asked for Humidity, do not mention Temperature).
    *   **Format:** Use a single <p> tag.

2.  **DETAILED RESPONSE (Only when asked to "Explain", "Analyze", or "Report"):**
    *   If the user asks for details, reasons, or a full status update, you may use **Bullet Points** (<ul>) or **Tables** (<table>).

**FORMATTING:**
- Use **HTML tags** strictly (<p>, <ul>, <li>, <table>, <tr>, <td>, <th>, <strong>).
- **Emphasis:** Use \`<strong>\` for values/status.

**CRITICAL ALERTS (Inject only if urgent):**
- Rain > 500: "Adjust solar panels."
- Water < 10%: "CRITICAL: Low water."
- Temp > 35°C: "High Heat Warning."
`;

const ANALYSIS_SYSTEM_INSTRUCTION = `
You are the **Lead Data Analyst** for Riyadh AI-Oasis.
You have access to the **ENTIRE HISTORICAL DATASET** from the farm sensors.

**YOUR GOAL:**
Analyze trends, compare data points, and generate detailed reports.

**GUIDELINES:**
1. **COMPARISONS:** When asked to compare (e.g., "Compare temperature changes"), ALWAYS create a **HTML Table**.
2. **TRENDS:** Look for patterns in the provided CSV data (e.g., "Temperature rises at noon").
3. **FORMATTING:** 
   - Use <table> for data presentation.
   - Use <ul> for insights.
   - Use <strong> for key findings.
   - Keep the tone professional, analytical, and precise.

**DATA STRUCTURE:**
The user will provide a CSV representation of the sheet.
Columns: Timestamp, Temperature, Humidity, Lux, Rain, Soil, Water, FanStatus.
`;

const controlFanTool: FunctionDeclaration = {
  name: "controlFan",
  parameters: {
    type: Type.OBJECT,
    properties: {
      enable: {
        type: Type.BOOLEAN,
        description: "Set to TRUE to turn the fan ON (Activate), FALSE to turn it OFF (Deactivate)."
      }
    },
    required: ["enable"]
  },
  description: "Controls the Climate Control Unit (Fan) state."
};

let chatInstance: Chat | null = null;
let analysisChatInstance: Chat | null = null;
let aiInstance: GoogleGenAI | null = null;

const getAIInstance = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const initializeChat = (): Chat => {
  const ai = getAIInstance();
  chatInstance = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [controlFanTool] }],
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });
  return chatInstance;
};

// Separate initialization for the Analyst AI
export const initializeAnalysisChat = (): Chat => {
  const ai = getAIInstance();
  analysisChatInstance = ai.chats.create({
    model: 'gemini-3-flash-preview', // Flash is good for large context (full sheet)
    config: {
      systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });
  return analysisChatInstance;
};

export const sendMessageToGemini = async (
  message: string, 
  historyContext: SensorData[]
): Promise<string> => {
  if (!chatInstance) {
    initializeChat();
  }

  const currentReading = historyContext.length > 0 
    ? historyContext[historyContext.length - 1] 
    : null;

  const recentHistory = historyContext.slice(-10); // Reduce history to minimize token noise
  
  const historyLog = recentHistory.map(row => 
    `Time:${row.timestamp}, T:${row.temperature}, H:${row.humidity}, Rain:${row.rain}, Soil:${row.soilMoisture}%, Water:${row.waterLevel}%`
  ).join(' | ');

  let contextNote = "";
  
  if (currentReading) {
    contextNote = `
[SYSTEM DATA]
Current: 
- Temp=${currentReading.temperature}
- Hum=${currentReading.humidity}
- Lux=${currentReading.lux}
- Rain Sensor=${currentReading.rain} (${currentReading.rain > 500 ? 'RAINING' : 'DRY'})
- Soil Moisture=${currentReading.soilMoisture}%
- Water Tank=${currentReading.waterLevel}%
- Fan=${currentReading.fanStatus}

History: ${historyLog}
(Only use this data if asked. Be brief.)
`;
  } else {
    contextNote = `[SYSTEM DATA] No live data available.`;
  }
  
  const prompt = `${contextNote}\n\nUser Question: "${message}"`;

  try {
    const result = await chatInstance!.sendMessage({
      message: prompt
    });

    let response = result;

    while (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      
      if (call.name === 'controlFan') {
        const { enable } = call.args as { enable: boolean };
        console.log(`[AI COMMAND] Turning Fan ${enable ? 'ON' : 'OFF'}`);
        
        const success = await toggleFanControl(enable);
        
        const functionResponsePart = {
          functionResponse: {
            name: 'controlFan',
            response: { 
              result: success ? 'Success' : 'Failed',
              currentStatus: enable ? 'ON' : 'OFF'
            }
          }
        };

        const nextResult = await chatInstance!.sendMessage({
            message: [functionResponsePart]
        });
        response = nextResult;
      } else {
        break;
      }
    }
    
    if (response.text) return response.text;
    return "<p>System completed action.</p>";
  } catch (error) {
    console.error("Gemini API Error:", error);
    chatInstance = null; 
    aiInstance = null;
    return "<p><strong>Connection Error:</strong> Unable to reach AI node.</p>";
  }
};

// NEW FUNCTION: Send Message to Analyst AI with FULL Dataset
export const sendAnalysisMessage = async (
  message: string, 
  allData: SensorData[]
): Promise<string> => {
  if (!analysisChatInstance) {
    initializeAnalysisChat();
  }

  // Convert ALL data to CSV format for the AI
  const csvHeader = "Timestamp,Temperature,Humidity,Lux,Rain,SoilMoisture,WaterLevel,FanStatus\n";
  const csvRows = allData.map(d => 
    `${d.timestamp},${d.temperature},${d.humidity},${d.lux},${d.rain},${d.soilMoisture},${d.waterLevel},${d.fanStatus}`
  ).join("\n");
  
  const fullDatasetBlock = `
[FULL HISTORICAL DATASET START]
${csvHeader}${csvRows}
[FULL HISTORICAL DATASET END]
`;

  const prompt = `
${fullDatasetBlock}

User Request: "${message}"
  `;

  try {
    const result = await analysisChatInstance!.sendMessage({
      message: prompt
    });
    return result.text || "<p>Analysis complete (No text output).</p>";
  } catch (error) {
    console.error("Analysis API Error:", error);
    analysisChatInstance = null;
    return "<p><strong>Analysis Error:</strong> Unable to process full dataset.</p>";
  }
};