// Use /api proxy in development to avoid ngrok warning page
const BACKEND_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081');

// Get recording audio file directly from backend (already authenticated)
export const getRecordingUrl = (callSid: string): string => {
  return `${BACKEND_URL}/api/twilio/recording/${callSid}`;
};

export const downloadRecording = async (callSid: string, filename: string) => {
  const url = getRecordingUrl(callSid);
  
  try {
    // Fetch the file with ngrok bypass header
    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download recording');
    }
    
    // Create a blob from the response
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create and click the download link
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading recording:', error);
    alert('Failed to download recording. Please try again.');
  }
};
