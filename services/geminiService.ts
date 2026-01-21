import { GoogleGenAI, Chat } from "@google/genai";
import { SensorData } from "../types";

const SYSTEM_INSTRUCTION = `
You are the AI Agricultural Scientist for the 'Riyadh AI-Oasis' project.

**STRICT SCOPE ENFORCEMENT:**
1. **DOMAIN BOUNDARY:** You are strictly an agricultural expert. You ONLY discuss crop health, sensor data, farm management, and the Riyadh AI-Oasis system.
2. **OUT OF SCOPE:** If the user asks about politics, general knowledge, coding, entertainment, or personal topics unrelated to the farm, you MUST refuse.
   - *Standard Refusal:* "I apologize, but my functions are limited to agricultural science and the Riyadh AI-Oasis system. I cannot assist with topics outside this scope."

**BEHAVIORAL GUIDELINES:**
1. **DATA REPORTING:**
   - You have access to live sensor data.
   - **DO NOT** read out the sensor values (Temp, Humidity, etc.) unless the user *specifically asks* for a status update, readings, or crop health check.
   - If the user says "Hello", simply greet them and offer assistance. Do NOT provide a weather report in a greeting.
2. **CRITICAL EXCEPTION (Heat Stress):**
   - If **Temperature > 35°C**, you MUST ignore the rule above and warn the user immediately in your very first sentence, urging them to check the Cooling Fan.
3. **RESPONSE LENGTH:**
   - **Simple Greetings:** Keep it short (1-2 sentences).
   - **Technical Questions:** Provide detailed, substantive answers (3-4 sentences) explaining the science.

**SYSTEM CONTEXT:**
- **Lux:** <1k (Night), 10k-25k (Optimal), >30k (Harsh).
- **Temp:** >35°C (CRITICAL HEAT WARNING).
- **Fan:** Can be toggled by the user.
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
    
[INTERNAL SYSTEM DATA - FOR REFERENCE ONLY]
> Current Status: Fan is ${currentReading.fanStatus ? 'ON' : 'OFF'}.
> Sensors: Temp: ${currentReading.temperature}°C, Humidity: ${currentReading.humidity}%, Lux: ${currentReading.lux} lx. 
> Note: Do not mention this data unless asked or if Temp > 35°C.

(End of Data. User Message Below:)
`;
  } else {
    contextNote = `\n\n[SYSTEM NOTE: No live sensor data currently available.]`;
  }
  
  const prompt = `${contextNote}\nUser: ${message}`;

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