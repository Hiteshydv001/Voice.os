const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

// Get recording audio file directly from backend (already authenticated)
export const getRecordingUrl = (callSid: string): string => {
  return `${BACKEND_URL}/api/twilio/recording/${callSid}`;
};

export const downloadRecording = (callSid: string, filename: string) => {
  const url = getRecordingUrl(callSid);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};
