import { GoogleGenAI, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SensorData } from "../types";

const SYSTEM_INSTRUCTION = `
You are the AI Agricultural Scientist for the 'Riyadh AI-Oasis'.

**CORE DIRECTIVE: RESPONSE FORMATTING**
You MUST respond using **HTML tags** for all formatting. Do NOT use markdown (no ** or ##).
Your goal is to provide data that is visually structured and easy to read.

**HTML STYLE GUIDE:**
- **Paragraphs:** Use \`<p>\`.
- **Lists:** Use \`<ul>\` and \`<li>\`.
- **Tables:** Use \`<table>\`, \`<thead>\`, \`<tbody>\`, \`<tr>\`, \`<th>\`, \`<td>\`.
- **Emphasis:** Use \`<strong>\` (renders as Neon Green).
- **Line Breaks:** Use \`<br>\`.
- **No Outer Wrappers:** Do not wrap the response in \`<html>\` or \`<body>\`. Just return the inner elements.

**LOGIC FOR RESPONSE LENGTH & STRUCTURE:**

1.  **SCENARIO: STATUS CHECK / "HOW IS THE FARM?"**
    *   **Action:** You MUST create a \`<table>\` comparing current readings to optimal ranges.
    *   **Length:** Short text summary + The Table.
    *   **Example Output:**
        \`\`\`html
        <p>The farm is currently stable.</p>
        <table>
          <thead><tr><th>Metric</th><th>Value</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Temp</td><td>24°C</td><td>Optimal</td></tr>
            <tr><td>Lux</td><td>15000</td><td>Good</td></tr>
          </tbody>
        </table>
        \`\`\`

2.  **SCENARIO: EXPLANATION / "WHY...?" / "DETAILS..."**
    *   **Action:** Use \`<ul>\` for bullet points. Break text into multiple short \`<p>\` tags.
    *   **Length:** Detailed and comprehensive.
    *   **Structure:**
        *   <p>Direct Answer/Concept</p>
        *   <strong>Key Factors:</strong>
        *   <ul><li>Factor 1</li><li>Factor 2</li></ul>
        *   <p>Conclusion</p>

3.  **SCENARIO: SIMPLE GREETING / "HELLO"**
    *   **Action:** Single \`<p>\` tag.
    *   **Content:** Polite greeting only. No data dump.

**STRICT DATA & SCOPE RULES:**
1.  **Scope:** Agriculture & System Status only.
2.  **Data Privacy:** Do NOT read out numbers in text unless asked. Use the Table format if asked for data.
3.  **Heat Warning:** If **Temp > 35°C**, start with: \`<p><strong>⚠️ CRITICAL WARNING: HIGH TEMPERATURE DETECTED. CHECK COOLING FAN.</strong></p>\`

**SYSTEM CONTEXT (THRESHOLDS):**
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

  const recentHistory = historyContext.slice(-30);
  
  // Format history for the AI to analyze trends
  const historyLog = recentHistory.map(row => 
    `Time:${row.timestamp}, T:${row.temperature}, H:${row.humidity}, L:${row.lux}, Fan:${row.fanStatus}`
  ).join(' | ');

  let contextNote = "";
  
  if (currentReading) {
    contextNote = `
[SYSTEM DATA]
Current: Temp=${currentReading.temperature}, Hum=${currentReading.humidity}, Lux=${currentReading.lux}, Fan=${currentReading.fanStatus}.
History (last 30 pts): ${historyLog}
(Use this data for tables if requested. If Temp > 35, Warn immediately.)
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