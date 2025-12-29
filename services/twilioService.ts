const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

export const makeOutboundCall = async (to: string, agentName: string, _agentScript?: { opening: string; closing: string; objectionHandling: string }) => {
  // Check if Twilio is configured via backend
  try {
    const checkResponse = await fetch(`${BACKEND_URL}/api/twilio`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const { credentialsSet } = await checkResponse.json();
    
    if (!credentialsSet) {
      console.log('🔊 SIMULATION MODE: Twilio not configured on backend');
      return simulateCall(to, agentName);
    }
  } catch (error) {
    console.warn('Could not check Twilio status, using simulation mode', error);
    return simulateCall(to, agentName);
  }

  // Get phone numbers from backend
  try {
    const numbersResponse = await fetch(`${BACKEND_URL}/api/twilio/numbers`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const { numbers} = await numbersResponse.json();
    
    if (!numbers || numbers.length === 0) {
      throw new Error('No Twilio phone numbers available');
    }

    const from = numbers[0].phoneNumber;
    
    // Make call via backend
    const callResponse = await fetch(`${BACKEND_URL}/api/twilio/call`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ to, from }),
    });

    if (!callResponse.ok) {
      const error = await callResponse.json();
      throw new Error(error.error || 'Failed to initiate call');
    }

    const data = await callResponse.json();
    console.log('✅ Call initiated successfully:', data.callSid);
    return data;
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
