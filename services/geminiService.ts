import { GoogleGenAI, Chat } from "@google/genai";
import { SensorData } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert Saudi Agricultural Scientist for the 'Riyadh AI-Oasis' project.

**SYSTEM CAPABILITIES:**
You are now linked to the farm's **Cooling Fan System**.
- **Fan Status:** You can see if the fan is currently ON or OFF.
- **Protocol:** If the **Temperature > 35°C**, you MUST advise the user to click the 'Cooling Fan' button immediately if it is OFF. If it is already ON, explain that you are monitoring its effectiveness.

**RESPONSE GUIDELINES:**
1. **LENGTH & DEPTH:** Your answers must be **substantive (approx. 40-60 words)**. Do NOT give extremely short one-sentence replies. Explain the *reasoning* behind the data or offer a specific relevant tip.
2. **STRICTLY FOCUSED:** Answer ONLY what is asked. 
   - If asked about **Solar/Lux**: Discuss light levels, potential dust coverage.
   - If asked about **Temperature**: Discuss heat stress and the Cooling Fan status.
3. **CRITICAL ALERTS:** Break the "Focused" rule if Temp > 35°C to warn about heat and suggest the Fan.

**DATA CONTEXT:**
- **Lux:** <1k (Night), 10k-25k (Optimal), >30k (Harsh).
- **Temp:** >35°C (Heat Warning - Use Fan).
- **Humidity:** <30% (Dry).
`;

let chatInstance: Chat | null = null;
let aiInstance: GoogleGenAI | null = null;

const getAIInstance = () => {
  if (!aiInstance) {
    // Always use process.env.API_KEY directly when initializing the client.
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
      // permissive safety settings to prevent silent blocking of "Heat Warning" topics
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
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

  // 1. Get the single latest reading
  const currentReading = historyContext.length > 0 
    ? historyContext[historyContext.length - 1] 
    : null;

  // 2. Get recent history
  const recentHistory = historyContext.slice(-30);
  
  // Format history
  const historyLog = recentHistory.map(row => 
    `{ Time: ${row.timestamp}, T: ${row.temperature}, H: ${row.humidity}, Lux: ${row.lux}, Fan: ${row.fanStatus ? 'ON' : 'OFF'} }`
  ).join('\n');

  let contextNote = "";
  
  if (currentReading) {
    contextNote = `
    
[SYSTEM NOTE: LIVE TELEMETRY]
> Status: Fan is ${currentReading.fanStatus ? 'ON (Active Cooling)' : 'OFF (Idle)'}.
> Sensors: Temp: ${currentReading.temperature}°C, Humidity: ${currentReading.humidity}%, Lux: ${currentReading.lux} lx. 

> History Log:
${historyLog}

(End of System Note. Respond to the user below.)
`;
  } else {
    contextNote = `\n\n[SYSTEM NOTE: No live sensor data currently available.]`;
  }
  
  const prompt = `${message}${contextNote}`;

  try {
    const response = await chatInstance!.sendMessage({
      message: prompt
    });
    
    // Check for valid text
    if (response.text) {
      return response.text;
    }

    // Fallback: Check if there was a finish reason (e.g. Safety Block)
    console.warn("Gemini Response Empty. Full Response Object:", response);
    
    if (response.candidates && response.candidates.length > 0) {
      const firstCandidate = response.candidates[0];
      if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP') {
        return `[SYSTEM ALERT] The AI response was blocked. Reason: ${firstCandidate.finishReason}`;
      }
    }

    return "I received your message, but the system returned an empty response without an error code.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Reset instance in case it was a transient auth error
    chatInstance = null; 
    aiInstance = null;
    return "I am unable to connect to the AI network. Please check the system configuration (API Key).";
  }
};