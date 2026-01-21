import { GoogleGenAI, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SensorData } from "../types";

const SYSTEM_INSTRUCTION = `
You are the AI Agricultural Scientist for the 'Riyadh AI-Oasis'.

**CORE DIRECTIVE:**
Answer specific questions with **EXTREME BREVITY**.
If the user asks "What is the temperature?", reply ONLY: "<p>The temperature is <strong>[Value]</strong>.</p>"
DO NOT add tables, DO NOT add extra data, DO NOT add "Optimal status" unless asked.

**RESPONSE FORMATTING:**
- Use **HTML tags** for all formatting.
- **Paragraphs:** \`<p>\`.
- **Lists:** \`<ul>\` and \`<li>\`.
- **Tables:** \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, \`<td>\`.
- **Emphasis:** \`<strong>\` (renders as Neon Green).

**SCENARIOS:**

1.  **SPECIFIC METRIC QUERY (e.g., "What is the temperature?", "Is the fan on?")**
    *   **Action:** Provide a **direct, single-sentence answer**.
    *   **FORBIDDEN:** Do NOT generate a table. Do NOT mention other sensors.
    *   **Example:** "<p>The current temperature is <strong>21.1°C</strong>.</p>"

2.  **GENERAL STATUS / REPORT / "HOW IS THE FARM?"**
    *   **Action:** Create a summary table.
    *   **Example:**
        \`\`\`html
        <p>System Status:</p>
        <table>
          <thead><tr><th>Metric</th><th>Value</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Temp</td><td>24°C</td><td>Optimal</td></tr>
          </tbody>
        </table>
        \`\`\`

**THRESHOLDS:**
- **Lux:** <1k (Night), 10k-25k (Day/Optimal), >30k (High).
- **Temp:** >35°C (Danger).
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
    `Time:${row.timestamp}, T:${row.temperature}, H:${row.humidity}, L:${row.lux}, Fan:${row.fanStatus}`
  ).join(' | ');

  let contextNote = "";
  
  if (currentReading) {
    contextNote = `
[SYSTEM DATA]
Current: Temp=${currentReading.temperature}, Hum=${currentReading.humidity}, Lux=${currentReading.lux}, Fan=${currentReading.fanStatus}.
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