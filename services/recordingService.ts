const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

export const fetchRecordingUrl = async (callSid: string): Promise<string | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/twilio/recording/${callSid}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No recording found for call ${callSid}`);
        return null;
      }
      throw new Error(`Failed to fetch recording: ${response.status}`);
    }
    
    const data = await response.json();
    return data.recordingUrl;
  } catch (error) {
    console.error('Error fetching recording URL:', error);
    return null;
  }
};

export const downloadRecording = async (recordingUrl: string, filename: string) => {
  try {
    const response = await fetch(recordingUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading recording:', error);
    throw error;
  }
};
