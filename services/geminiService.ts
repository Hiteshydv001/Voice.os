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

    Return a JSON object containing:
    - "opening": A natural, short opening line (under 2 sentences).
    - "objectionHandling": A strategy or line to handle common objections.
    - "closing": A strong closing line to achieve the goal.
  `;

  try {
    const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate script:", error);
    // Fallback for demo purposes
    return {
      opening: `Hi, this is ${name}. I'm calling to tell you about our amazing ${product}. Do you have a moment?`,
      objectionHandling: "I understand your hesitation. However, our solution is designed to be risk-free.",
      closing: `Great! Let's get that ${goal} set up for you right away.`
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
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't quite catch that, could you repeat?";
    return text;
  } catch (error) {
    console.error("Chat error:", error);
    return "I apologize, I'm having trouble connecting. Can you say that again?";
  }
};