import React, { useState, useRef } from 'react';
import { X, Play, Loader2, CheckCircle, XCircle, FileAudio, Mic, StopCircle } from 'lucide-react';
import { AgentNode, AgentEdge } from '../../types';
import { AgentExecutor } from '../../services/agentExecutor';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: AgentNode[];
  edges: AgentEdge[];
  flowName: string;
}

export function TestRunnerModal({ isOpen, onClose, nodes, edges, flowName }: TestRunnerModalProps) {
  const [testInput, setTestInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'audio'>('text');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showCustomAlertOpen, setShowCustomAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showLocalAlert = (message: string) => {
    setAlertMessage(message);
    setShowCustomAlertOpen(true);
  };

  if (!isOpen) return null;

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setInputType('audio');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(file);
        setInputType('audio');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      showLocalAlert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRunTest = async () => {
    if (!testInput && !audioFile) {
      showLocalAlert('Please provide test input (text or audio file)');
      return;
    }

    // Validate flow
    if (nodes.length === 0) {
      showLocalAlert('Flow is empty. Add nodes first.');
      return;
    }

    const hasStart = nodes.some(n => n.type === 'start');
    const hasEnd = nodes.some(n => n.type === 'end');
    
    if (!hasStart || !hasEnd) {
      showLocalAlert('Flow must have both Start and End nodes');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setAudioUrl(null);

    try {
      const executor = new AgentExecutor();
      
      // Check Start node configuration
      const startNode = nodes.find(n => n.type === 'start');
      const startConfig = startNode?.data?.config as any;
      const expectedInputType = startConfig?.inputType || 'text';
      
      // Prepare input based on type
      let input: string | Blob;
      let type: 'text' | 'audio';
      
      if (audioFile) {
        // Ensure audioFile is a proper File/Blob object
        if (!(audioFile instanceof Blob)) {
          throw new Error('Invalid audio file. Please upload a valid audio file.');
        }
        
        // Validate against Start node configuration
        if (expectedInputType !== 'audio') {
          throw new Error(`Start node is configured for TEXT input, but you provided an AUDIO file. Please:\n1. Double-click the Start node\n2. Change "Input Type" to "Audio"\n3. Try again`);
        }
        
        input = audioFile;
        type = 'audio';
        console.log('Audio file input:', { 
          name: audioFile.name, 
          type: audioFile.type, 
          size: audioFile.size,
          hasArrayBuffer: typeof audioFile.arrayBuffer === 'function'
        });
      } else {
        // Validate against Start node configuration
        if (expectedInputType !== 'text') {
          throw new Error(`Start node is configured for AUDIO input, but you provided TEXT. Please:\n1. Upload an audio file using the file input\n2. Or change Start node to "Text" input type`);
        }
        
        input = testInput;
        type = 'text';
      }

      // Execute the flow
      const executionResult = await executor.executeFlow(nodes, edges, input, type);
      
      setResult(executionResult);

      // If output is audio, create URL for playback
      if (executionResult.success && executionResult.outputType === 'audio' && executionResult.output instanceof Blob) {
        const url = URL.createObjectURL(executionResult.output);
        setAudioUrl(url);
      }

    } catch (error: any) {
      setResult({
        success: false,
        output: '',
        outputType: 'text',
        logs: [],
        error: error.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    // Cleanup audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setResult(null);
    setTestInput('');
    setAudioFile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono">
        <div className="flex items-center justify-between p-4 border-b-4 border-black bg-green-600">
          <div className="flex items-center gap-2">
            <Play size={24} className="text-white" />
            <h2 className="text-lg font-bold text-white uppercase">Test Agent Flow</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-black transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
          {/* Flow Summary */}
          <div className="border-2 border-black p-4 bg-stone-100">
            <h3 className="font-bold uppercase mb-2 text-sm">Flow: {flowName}</h3>
            <div className="text-sm space-y-1">
              <div>📊 Nodes: {nodes.length} | Connections: {edges.length}</div>
              <div>
                🔄 Path: {nodes.map(n => {
                  const emoji = n.type === 'start' ? '▶️' : n.type === 'end' ? '🏁' : n.type === 'stt' ? '🎤' : n.type === 'llm' ? '🤖' : n.type === 'tts' ? '🔊' : '⚙️';
                  return emoji;
                }).join(' → ')}
              </div>
            </div>
          </div>

          {/* Input Section */}
          {!result && (
            <div className="border-2 border-black p-4">
              <h3 className="font-bold uppercase mb-3 text-sm">Test Input</h3>
              
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setInputType('text')}
                  className={`flex-1 py-2 px-4 border-2 border-black font-bold uppercase text-sm ${
                    inputType === 'text' ? 'bg-black text-white' : 'bg-white hover:bg-stone-100'
                  }`}
                >
                  💬 Text Input
                </button>
                <button
                  onClick={() => setInputType('audio')}
                  className={`flex-1 py-2 px-4 border-2 border-black font-bold uppercase text-sm ${
                    inputType === 'audio' ? 'bg-black text-white' : 'bg-white hover:bg-stone-100'
                  }`}
                >
                  🎤 Audio File
                </button>
              </div>

              {inputType === 'text' ? (
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full h-32 p-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="Enter test message... (e.g., 'Hello, how are you?')"
                />
              ) : (
                <div className="space-y-3">
                  {/* Recording Button */}
                  {!audioFile && (
                    <div className="flex gap-2">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          className="flex-1 py-3 px-4 bg-red-500 text-white border-2 border-black font-bold uppercase hover:bg-red-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex items-center justify-center gap-2"
                        >
                          <Mic size={20} />
                          Record Voice
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="flex-1 py-3 px-4 bg-red-600 text-white border-2 border-black font-bold uppercase hover:bg-red-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 animate-pulse"
                        >
                          <StopCircle size={20} />
                          Stop Recording ({formatTime(recordingTime)})
                        </button>
                      )}
                    </div>
                  )}

                  {/* File Upload */}
                  <label className="flex items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-black hover:bg-stone-50 cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                    {audioFile ? (
                      <div className="text-center">
                        <FileAudio size={32} className="mx-auto mb-2" />
                        <div className="text-sm font-bold">{audioFile.name}</div>
                        <div className="text-xs text-stone-600">{(audioFile.size / 1024).toFixed(2)} KB</div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setAudioFile(null);
                          }}
                          className="mt-2 text-xs text-red-600 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileAudio size={32} className="mx-auto mb-2 text-stone-400" />
                        <div className="text-sm text-stone-600">Click to upload audio file</div>
                        <div className="text-xs text-stone-500">(WAV, MP3, etc.)</div>
                      </div>
                    )}
                  </label>
                </div>
              )}

              <button
                onClick={handleRunTest}
                disabled={isRunning || (!testInput && !audioFile)}
                className="w-full mt-4 py-3 bg-green-600 text-white border-2 border-black font-bold uppercase hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Run Test
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="space-y-4">
              {/* Status */}
              <div className={`border-2 border-black p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.success ? (
                    <>
                      <CheckCircle size={20} className="text-green-600" />
                      <h3 className="font-bold uppercase text-green-800">✅ Test Passed</h3>
                    </>
                  ) : (
                    <>
                      <XCircle size={20} className="text-red-600" />
                      <h3 className="font-bold uppercase text-red-800">❌ Test Failed</h3>
                    </>
                  )}
                </div>
                {result.error && (
                  <div className="text-sm text-red-700 mt-2">
                    Error: {result.error}
                  </div>
                )}
              </div>

              {/* Output */}
              {result.success && (
                <div className="border-2 border-black p-4">
                  <h3 className="font-bold uppercase mb-3 text-sm">Output</h3>
                  {result.outputType === 'text' ? (
                    <div className="bg-stone-100 p-3 border border-stone-300 text-sm whitespace-pre-wrap">
                      {result.output}
                    </div>
                  ) : (
                    <div className="bg-stone-100 p-4 border border-stone-300">
                      <div className="flex items-center gap-2 mb-2">
                        <FileAudio size={20} />
                        <span className="text-sm font-bold">Audio Output</span>
                      </div>
                      {audioUrl && (
                        <audio controls className="w-full">
                          <source src={audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Execution Logs */}
              <div className="border-2 border-black p-4">
                <h3 className="font-bold uppercase mb-3 text-sm">Execution Logs</h3>
                <div className="bg-black text-green-400 p-3 text-xs font-mono max-h-60 overflow-y-auto">
                  {result.logs.map((log: string, idx: number) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setResult(null);
                    setAudioUrl(null);
                  }}
                  className="flex-1 py-2 px-4 border-2 border-black font-bold uppercase hover:bg-stone-100"
                >
                  Run Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 px-4 bg-black text-white font-bold uppercase hover:bg-stone-800"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        {/* Local Alert Dialog */}
        {showCustomAlertOpen && (
          <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-3 sm:p-4">
            <div className="bg-stone-900 border-2 border-orange-600 rounded-lg p-4 sm:p-6 w-full max-w-[90vw] sm:max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">⚠️</div>
                <h3 className="text-lg sm:text-xl font-bold text-white font-mono uppercase">Alert</h3>
              </div>
              <p className="text-stone-300 text-sm sm:text-base mb-6">{alertMessage}</p>
              <button
                onClick={() => setShowCustomAlertOpen(false)}
                className="w-full bg-orange-600 text-white font-bold py-2 sm:py-3 px-4 rounded border-2 border-orange-500 hover:bg-orange-700 transition-colors uppercase text-sm sm:text-base"
              >
                OK
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
