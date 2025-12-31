import { Agent, ChatMessage } from "../types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

export const generateAgentScript = async (
  name: string,
  tone: string,
  product: string,
  goal: string
) => {
  const prompt = `
    You are an expert sales script writer. Create a sales script for an AI voice agent.
    
    Agent Details:
    - Name: ${name}
    - Tone: ${tone}
    - Product: ${product}
    - Goal: ${goal}

    IMPORTANT: The agent must introduce itself with its exact name "${name}" in the opening line.

    Return a JSON object containing:
    - "opening": A natural, short opening line (under 2 sentences).
    - "objectionHandling": A strategy or line to handle common objections.
    - "closing": A strong closing line to achieve the goal.
  `;

  try {
    const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Strip markdown code blocks if present
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate script:", error);
    // On failure, return placeholders that reference the provided agent details (no fabricated content)
    return {
      opening: `Hi, this is ${name}. [Insert concise opening about ${product}]`,
      objectionHandling: `[Insert objection-handling guidance tailored to ${product}]`,
      closing: `[Insert closing to achieve: ${goal}]`
    };
  }
};

export const chatWithAgent = async (
  agent: Agent,
  history: ChatMessage[],
  userMessage: string
): Promise<string> => {
  const conversationContext = history.map(msg => 
    `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.text}`
  ).join('\n');

  const systemPrompt = `
    You are ${agent.name}, an AI voice marketing agent.
    Tone: ${agent.tone}
    Product: ${agent.productDescription}
    Goal: ${agent.goal}
    
    Script Guidelines:
    - Opening (already said): "${agent.script.opening}"
    - Objection Handling Strategy: "${agent.script.objectionHandling}"
    - Closing: "${agent.script.closing}"

    Instructions:
    - Respond to the Customer's last message.
    - Keep responses SHORT (under 2 sentences) and conversational, as this is a phone call.
    - Do not repeat the opening unless asked.
    - Be polite but persistent towards the goal.
    - If the customer agrees to the goal, use the closing line.
  `;

  const fullPrompt = `${systemPrompt}\n\nConversation History:\n${conversationContext}\nCustomer: ${userMessage}\nAgent:`;

  try {
    const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't quite catch that, could you repeat?";

    // Ensure the agent's name is used consistently - replace any stray "James" with the agent name
    try {
      const safeName = agent.name || 'Unit';
      const before = text;

      // Replace explicit 'James' leftover
      text = text.replace(/\bJames\b/gi, safeName);

      // Replace a variety of generic agent-name phrases with the correct name
      text = text.replace(/\b(Voice Rep|Voice Representative|Sales Rep|Sales Representative|Senior Sales Rep|Voice\.OS Rep|Voice OS Rep)\b/gi, safeName);

      // If the opening line was present in the script but contains a different name, replace common greeting patterns
      text = text.replace(/((?:Hello|Hi|Hey),?\s+(?:this\s+is|I'm|I am)\s+)[A-Za-z0-9_()\-\s]+/gi, `$1${safeName}`);

      if (text !== before) {
        console.log('Sanitized agent name in LM response. Replaced content to use:', safeName);
      }
    } catch (err) {
      console.warn('Failed to sanitize agent name in response:', err);
    }

    return text;
  } catch (error) {
    console.error("Chat error:", error);
    return "I apologize, I'm having trouble connecting. Can you say that again?";
  }
};