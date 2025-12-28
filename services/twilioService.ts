import { TWILIO_CONFIG } from '../config';

export const makeOutboundCall = async (to: string, agentName: string, agentScript?: { opening: string; closing: string; objectionHandling: string }) => {
  const { accountSid, authToken, phoneNumber } = TWILIO_CONFIG;

  // Check if Twilio is configured
  const isTwilioConfigured = accountSid && authToken && phoneNumber;

  // If Twilio not configured, use simulation mode
  if (!isTwilioConfigured) {
    console.log('🔊 SIMULATION MODE: Making simulated call to', to, 'with agent', agentName);
    
    // Simulate call delay (2-5 seconds)
    const callDuration = Math.floor(Math.random() * 3000) + 2000;
    await new Promise(resolve => setTimeout(resolve, callDuration));
    
    // Simulate 80% success rate
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

  // Real Twilio API call (if configured)
  // Helper to ensure E.164 format (e.g., +919876543210 for India, +15550000000 for US)
  const formatPhoneNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, ''); // Remove non-digits
    
    // If already has + prefix, return as-is
    if (num.startsWith('+')) return num;
    
    // Detect country based on length and first digits
    if (cleaned.length === 10) {
      // 10 digits starting with 6-9 = India, otherwise US
      if (cleaned.startsWith('6') || cleaned.startsWith('7') || 
          cleaned.startsWith('8') || cleaned.startsWith('9')) {
        return `+91${cleaned}`; // India
      }
      return `+1${cleaned}`; // US
    }
    
    // If 12 digits starting with 91, it's already India format
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    
    // Default: just add + prefix
    return `+${cleaned}`;
  };

  const formattedTo = formatPhoneNumber(to);
  const formattedFrom = formatPhoneNumber(phoneNumber);

  // 2. Generate TwiML URL - use backend for AI conversation
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  // Prepare agent data for backend (for future use)
  const _agentData = {
    name: agentName,
    productDescription: agentScript?.opening || '',
    tone: 'professional',
    goal: 'Engage customer and achieve sales objective',
    script: agentScript || {
      opening: `Hello! This is ${agentName} from Voice Marketing AI.`,
      closing: 'Thank you for your time. Have a great day!',
      objectionHandling: 'I understand your concern. Let me address that.'
    }
  };

  // Construct System Prompt (for reference, not used in call)
  // const systemPrompt = `You are ${agentData.name}...`;
  // const initialGreeting = agentData.script.opening;
  
  // Backend endpoint handles TwiML generation and WebSocket stream
  // UPDATED: Pointing to OpenAI Realtime endpoint (Clean URL, no params)
  const twimlUrl = `${backendUrl}/voice/openai/incoming`;

  // 3. Construct Form Data for Twilio API
  const formData = new URLSearchParams();
  formData.append('To', formattedTo);
  formData.append('From', formattedFrom);
  formData.append('Url', twimlUrl);

  try {
    console.log('📞 Making Twilio API call:', {
      to: formattedTo,
      from: formattedFrom,
      accountSid: accountSid
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        // Basic Auth: AccountSid : AuthToken
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const data = await response.json();
    console.log('📞 Twilio response:', data);

    if (!response.ok) {
      // Improve error message readability
      const msg = data.message || `Twilio Error: ${data.status}`;
      console.error('❌ Twilio error code:', data.code, 'Message:', msg);
      
      if (data.code === 21210) {
        throw new Error("Twilio Error 21210: The 'From' number (+17206139480) is not verified. Please verify it in Twilio Console.");
      }
      if (data.code === 21211) {
        throw new Error(`Twilio Error 21211: The 'To' number (${formattedTo}) is invalid or incorrectly formatted.`);
      }
      if (data.code === 21608) {
        throw new Error(`Twilio Trial Account: You can only call verified numbers. Please verify ${formattedTo} in Twilio Console at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified`);
      }
      if (data.code === 20003) {
        throw new Error("Twilio Authentication Failed: Invalid Account SID or Auth Token. Please check your .env file.");
      }
      throw new Error(`Twilio Error ${data.code}: ${msg}`);
    }

    console.log('✅ Call initiated successfully:', data.sid);
    return data;
  } catch (error: any) {
    console.error("❌ Twilio Call Failed:", error);
    
    // Check for common CORS error which happens when calling Twilio from client-side
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("🚫 CORS Error: Browser blocked the Twilio API request. This happens because Twilio doesn't allow direct API calls from browsers. Solutions: 1) Use a backend server to make calls, or 2) Install a CORS extension for testing.");
    }
    
    throw error;
  }
};