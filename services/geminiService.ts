import { GoogleGenAI, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SensorData } from "../types";

const SYSTEM_INSTRUCTION = `
You are the AI Agricultural Scientist for the 'Riyadh AI-Oasis'.

**CORE DIRECTIVE:**
Provide clear, natural, and helpful responses.
For simple questions, give a complete sentence (approx. 20-30 words).
For explanations or complex data, you **MUST** use Tables or Bullet Points.

**RESPONSE GUIDELINES:**

1.  **SIMPLE QUERIES (e.g., "How is the humidity?", "Is it raining?"):**
    *   **Action:** Reply with a detailed, natural sentence.
    *   **Content:** State the value, its status (e.g., Optimal, Dry, High), and a brief context or tip.
    *   **Example:** "<p>The humidity is currently <strong>28.4%</strong>. This is within the stable range, but strictly monitor it as it approaches the lower threshold for plant stress.</p>"

2.  **EXPLANATIONS / DETAILED REQUESTS:**
    *   **Action:** Provide a detailed answer.
    *   **Structure:** Use **Bullet Points** (\`<ul>\`) for lists of reasons or steps. Use **Tables** (\`<table>\`) if comparing multiple data points.

3.  **GENERAL STATUS REPORT:**
    *   **Action:** Provide a summary table of all sensors followed by a brief text analysis.

**FORMATTING:**
- Use **HTML tags** strictly (<p>, <ul>, <li>, <table>, <tr>, <td>, <th>, <strong>).
- **Emphasis:** Use \`<strong>\` (renders as Neon Green) for values and key terms.

**CRITICAL RULES:**
1.  **RAIN:** If Rain > 500, advise: "Adjust solar panels to safe angle (45 degrees)".
2.  **IRRIGATION:** If Soil < 30% AND Water > 20%, suggest: "Activate irrigation pump" or "Manual watering".
3.  **WATER TANK:** If Water < 10%, warn: "CRITICAL: Low water supply. Refill tank immediately."
4.  **HEAT:** If Temp > 35°C, Warn immediately.

**THRESHOLDS:**
- **Lux:** <1k (Night), 10k-25k (Optimal), >30k (High).
- **Rain:** >500 (Raining), <500 (Dry).
- **Soil:** <30% (Dry), 30-70% (Optimal), >70% (Wet).
`;

let chatInstance: Chat | null = null;
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
    const response = await chatInstance!.sendMessage({
      message: prompt
    });
    
    if (response.text) {
      return response.text;
    }

    if (response.candidates && response.candidates.length > 0) {
       const reason = response.candidates[0].finishReason;
       if (reason && reason !== 'STOP') {
         return `<p><strong>System Alert:</strong> Response blocked (${reason}).</p>`;
       }
    }

    return "<p>System returned empty response.</p>";
  } catch (error) {
    console.error("Gemini API Error:", error);
    chatInstance = null; 
    aiInstance = null;
    return "<p><strong>Connection Error:</strong> Unable to reach AI node.</p>";
  }
};