import { Agent } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

const replaceAgentNameInScript = (script: string, agentName: string): string => {
  // Replace any name in greeting patterns with the actual agent name
  // Handles: "Hello this is James", "Hi, I'm TESTING", "Hey I am SarahBot", etc.
  return script.replace(/(?:Hello|Hi|Hey),?\s+(?:this\s+is|I'm|I am)\s+[A-Za-z0-9_]+/gi, (match) => {
    const greeting = match.split(/\s+(?:this\s+is|I'm|I am)\s+/i)[0];
    return `${greeting} this is ${agentName}`;
  });
};

export const makeOutboundCall = async (to: string, agent: Agent) => {
  // Check if Twilio is configured via backend
  try {
    const checkResponse = await fetch(`${BACKEND_URL}/api/twilio`);
    const { credentialsSet } = await checkResponse.json();
    
    if (!credentialsSet) {
      console.log('🔊 SIMULATION MODE: Twilio not configured on backend');
      return simulateCall(to, agent.name);
    }
  } catch (error) {
    console.warn('Could not check Twilio status, using simulation mode', error);
    return simulateCall(to, agent.name);
  }

  // Get phone numbers from backend
  try {
    const numbersResponse = await fetch(`${BACKEND_URL}/api/twilio/numbers`);
    const { numbers} = await numbersResponse.json();
    
    if (!numbers || numbers.length === 0) {
      throw new Error('No Twilio phone numbers available');
    }

    const from = numbers[0].phoneNumber;
    
    // Make call via backend with agent configuration
    const callResponse = await fetch(`${BACKEND_URL}/api/twilio/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to, 
        from,
        agentName: agent.name,
        agentScript: {
          opening: replaceAgentNameInScript(agent.script.opening, agent.name),
          goal: agent.goal,
          tone: agent.tone
        }
      }),
    });

    if (!callResponse.ok) {
      const error = await callResponse.json();
      throw new Error(error.error || 'Failed to initiate call');
    }

    const data = await callResponse.json();
    console.log('✅ Call initiated successfully:', data);
    
    // Return data including callSid and callId for recording retrieval
    return {
      callSid: data.callSid,
      callId: data.callId,
      status: data.status
    };
  } catch (error: any) {
    console.error("❌ Twilio Call Failed:", error);
    throw error;
  }
};

// Simulation helper function
async function simulateCall(to: string, agentName: string) {
  console.log('🔊 SIMULATION MODE: Making simulated call to', to, 'with agent', agentName);
  
  const callDuration = Math.floor(Math.random() * 3000) + 2000;
  await new Promise(resolve => setTimeout(resolve, callDuration));
  
  const isSuccessful = Math.random() > 0.2;
  
  if (isSuccessful) {
    console.log('✅ Simulated call successful');
    return {
      sid: `CALL_SIM_${Date.now()}`,
      status: 'completed',
      to: to,
      from: 'Simulated',
      duration: Math.floor(callDuration / 1000)
    };
  } else {
    console.log('❌ Simulated call failed');
    throw new Error('Simulated call failure (no answer)');
  }
}
