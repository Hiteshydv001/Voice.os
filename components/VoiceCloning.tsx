import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Upload, Volume2, Play, Pause, Download, RefreshCw, 
  Radio, Sparkles, AlertCircle, X, Check, Loader2, Terminal, Save, Trash2, Clock
} from 'lucide-react';
import elevenLabsService from '../services/elevenLabsService';
import { storage, SavedAudioFile } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

const VoiceCloning: React.FC = () => {
  const { currentUser } = useAuth();

  // Voice Library State
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  // Saved Audio Library
  const [savedAudioFiles, setSavedAudioFiles] = useState<SavedAudioFile[]>([]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TTS State
  const [testText, setTestText] = useState('Hello! This is a test of the voice synthesis system.');
  const [selectedModel, setSelectedModel] = useState('eleven_turbo_v2_5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  // Playback State
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Notification Modal
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  // Confirmation Modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'library' | 'synthesize' | 'saved'>('library');

  // Show notification
  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  // Show confirmation
  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmationMessage(message);
    setConfirmationAction(() => onConfirm);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (confirmationAction) {
      confirmationAction();
    }
    setShowConfirmation(false);
    setConfirmationAction(null);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setConfirmationAction(null);
  };

  // Load Voices
  const loadElevenVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const response = await elevenLabsService.getVoices();
      if (response.success && response.voices) {
        setVoices(response.voices);
        if (response.voices.length > 0 && !selectedVoice) {
          setSelectedVoice(response.voices[0].voice_id);
        }
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Load Saved Audio
  const loadSavedAudio = async () => {
    if (!currentUser) return;
    try {
      const audioFiles = await storage.getSavedAudio(currentUser.uid);
      setSavedAudioFiles(audioFiles.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to load saved audio:', error);
    }
  };

  // Save Audio File
  const saveAudioFile = async (
    audioUrl: string,
    type: 'recording' | 'tts',
    name: string,
    metadata?: SavedAudioFile['metadata']
  ) => {
    if (!currentUser) return;

    const newAudioFile: SavedAudioFile = {
      id: Date.now().toString(),
      name,
      type,
      audioUrl,
      mimeType: type === 'recording' ? 'audio/wav' : 'audio/mpeg',
      createdAt: new Date().toISOString(),
      metadata,
    };

    const updatedFiles = [newAudioFile, ...savedAudioFiles];
    setSavedAudioFiles(updatedFiles);
    await storage.saveSavedAudio(currentUser.uid, updatedFiles);
  };

  // Delete Audio File
  const deleteAudioFile = async (id: string) => {
    if (!currentUser) return;
    const updatedFiles = savedAudioFiles.filter(file => file.id !== id);
    setSavedAudioFiles(updatedFiles);
    await storage.saveSavedAudio(currentUser.uid, updatedFiles);
  };

  useEffect(() => {
    loadElevenVoices();
    loadSavedAudio();
  }, [currentUser]);

  // Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload Functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file);
    } else {
      alert('Please upload a valid audio file');
    }
  };

  // TTS Functions
  const generateSpeech = async () => {
    if (!selectedVoice || !testText) return;

    setIsGenerating(true);
    try {
      const response = await elevenLabsService.textToSpeech({
        text: testText,
        voiceId: selectedVoice,
        modelId: selectedModel as any,
      });
      
      if (response.success && response.audioUrl) {
        setGeneratedAudioUrl(response.audioUrl);
      }
    } catch (error) {
      console.error('Failed to generate speech:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Playback Functions
  const playAudio = (url: string, id: string) => {
    if (currentlyPlaying === id) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setCurrentlyPlaying(null);
    audioRef.current.play();
    setCurrentlyPlaying(id);
  };

  const downloadAudio = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen bg-stone-100 font-mono">
      {/* Notification Modal */}
      {showNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md w-full animate-in fade-in zoom-in duration-200`}>
            <div className={`p-4 border-b-4 border-black ${notificationType === 'success' ? 'bg-orange-200' : 'bg-red-200'}`}>
              <div className="flex items-center gap-3">
                {notificationType === 'success' ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
                <h3 className="font-black uppercase text-lg tracking-tight">
                  {notificationType === 'success' ? 'Success' : 'Error'}
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="font-bold uppercase text-sm mb-6">{notificationMessage}</p>
              <button
                onClick={() => setShowNotification(false)}
                className="w-full px-6 py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b-4 border-black bg-orange-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-black uppercase text-lg tracking-tight">Confirm Action</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="font-bold uppercase text-sm mb-6">{confirmationMessage}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-6 py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  OK
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 bg-white text-black border-2 border-black font-bold uppercase hover:bg-stone-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b-4 border-black bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-600 flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Radio className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">VOICE SYNTHESIS LAB</h1>
            </div>
            <p className="text-stone-600 font-bold uppercase text-sm tracking-wide">
              TTS Engine • Voice Library • Audio Processing
            </p>
          </div>
          <button
            onClick={loadElevenVoices}
            disabled={isLoadingVoices}
            className="flex items-center gap-2 px-4 py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingVoices ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b-4 border-black px-6">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'library', label: 'Voice Library', icon: Volume2 },
            { id: 'synthesize', label: 'Synthesize', icon: Sparkles },
            { id: 'saved', label: 'My Audio', icon: Save },
            { id: 'record', label: 'Record', icon: Mic },
            { id: 'upload', label: 'Upload', icon: Upload }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-bold uppercase border-2 border-b-0 border-black transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-stone-100 -mb-[4px]'
                  : 'bg-white hover:bg-stone-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Voice Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Available Voice Models
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {voices.map((voice) => (
                  <div
                    key={voice.voice_id}
                    onClick={() => setSelectedVoice(voice.voice_id)}
                    className={`p-4 border-2 border-black cursor-pointer transition-all ${
                      selectedVoice === voice.voice_id
                        ? 'bg-orange-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white hover:bg-stone-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold uppercase">{voice.name}</h3>
                      {selectedVoice === voice.voice_id && (
                        <Check className="w-5 h-5 text-black" />
                      )}
                    </div>
                    <p className="text-xs uppercase text-stone-600 font-bold">
                      {voice.category || 'PRE-MADE'}
                    </p>
                    {voice.preview_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(voice.preview_url!, `preview-${voice.voice_id}`);
                        }}
                        className="mt-3 flex items-center gap-2 px-3 py-1 bg-black text-white border-2 border-black text-xs font-bold uppercase hover:bg-white hover:text-black transition-all"
                      >
                        {currentlyPlaying === `preview-${voice.voice_id}` ? (
                          <><Pause className="w-3 h-3" /> Pause</>
                        ) : (
                          <><Play className="w-3 h-3" /> Preview</>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Record Tab */}
        {activeTab === 'record' && (
          <div className="space-y-6">
            <div className="bg-orange-200 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-black uppercase">Voice Cloning → Coming Soon</h3>
              </div>
              <p className="text-sm font-bold">
                Custom voice cloning requires an upgraded ElevenLabs subscription. Feature in development for future release.
              </p>
            </div>

            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-xl font-black uppercase mb-6">Audio Recorder</h2>
              
              <div className="flex flex-col items-center gap-6">
                {/* Recording Display */}
                <div className="w-full max-w-md p-8 border-2 border-black bg-stone-100">
                  <div className="text-center">
                    <div className="text-6xl font-black font-mono mb-4">
                      {formatTime(recordingTime)}
                    </div>
                    {isRecording && (
                      <div className="flex justify-center gap-2 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-12 bg-orange-600 border border-black animate-pulse"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recording Controls */}
                <div className="flex gap-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-8 py-4 bg-orange-600 text-white border-2 border-black font-bold uppercase hover:bg-orange-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-8 py-4 bg-black text-white border-2 border-black font-bold uppercase hover:bg-stone-800 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all animate-pulse"
                    >
                      <X className="w-5 h-5" />
                      Stop Recording
                    </button>
                  )}
                </div>

                {/* Recorded Audio Playback */}
                {recordedAudioUrl && !isRecording && (
                  <div className="w-full max-w-md p-4 border-2 border-black bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => playAudio(recordedAudioUrl, 'recorded')}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black transition-all"
                      >
                        {currentlyPlaying === 'recorded' ? (
                          <><Pause className="w-4 h-4" /> Pause</>
                        ) : (
                          <><Play className="w-4 h-4" /> Play</>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const name = `Recording_${new Date().toLocaleDateString()}_${new Date().toLocaleTimeString()}`;
                          saveAudioFile(recordedAudioUrl, 'recording', name, { recordingTime });
                          showNotif('Recording saved to library!');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white border-2 border-black font-bold uppercase hover:bg-orange-700 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => downloadAudio(recordedAudioUrl, 'recording.wav')}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black border-2 border-black font-bold uppercase hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <Download className="w-4 h-4" />
                        DL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-orange-200 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-black uppercase">Voice Cloning → Coming Soon</h3>
              </div>
              <p className="text-sm font-bold">
                Custom voice cloning requires an upgraded ElevenLabs subscription. Feature in development for future release.
              </p>
            </div>

            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-xl font-black uppercase mb-6">Upload Audio Sample</h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-black p-12 text-center cursor-pointer hover:bg-stone-50 transition-all"
              >
                <Upload className="w-12 h-12 mx-auto mb-4" />
                <p className="font-bold uppercase text-lg mb-2">
                  {uploadedFile ? uploadedFile.name : 'Drop Audio File Here'}
                </p>
                <p className="text-sm text-stone-600 uppercase font-bold">
                  or click to browse
                </p>
              </div>

              {uploadedFile && (
                <div className="mt-6 p-4 border-2 border-black bg-stone-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-black" />
                      <span className="font-bold uppercase">{uploadedFile.name}</span>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="px-3 py-1 bg-black text-white border-2 border-black font-bold uppercase text-xs hover:bg-white hover:text-black transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Synthesize Tab */}
        {activeTab === 'synthesize' && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Text-to-Speech Engine
              </h2>

              <div className="space-y-6">
                {/* Voice Selection */}
                <div>
                  <label className="block text-sm font-bold uppercase mb-2 tracking-wide">
                    Voice Model
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black font-mono font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <option value="">SELECT VOICE...</option>
                    {voices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-bold uppercase mb-2 tracking-wide">
                    TTS Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black font-mono font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <option value="eleven_turbo_v2_5">TURBO V2.5 [FREE - FAST]</option>
                    <option value="eleven_flash_v2">FLASH V2 [FREE - LOW LATENCY]</option>
                    <option value="eleven_multilingual_v2">MULTILINGUAL V2 [PAID]</option>
                  </select>
                </div>

                {/* Text Input */}
                <div>
                  <label className="block text-sm font-bold uppercase mb-2 tracking-wide">
                    Input Text
                  </label>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-black font-mono focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all resize-none"
                    placeholder="ENTER TEXT TO SYNTHESIZE..."
                  />
                  <div className="mt-2 text-xs font-bold text-stone-500 uppercase">
                    {testText.length} CHARACTERS
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateSpeech}
                  disabled={!selectedVoice || !testText || isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white border-2 border-black font-bold uppercase hover:bg-orange-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Speech
                    </>
                  )}
                </button>

                {/* Audio Player */}
                {generatedAudioUrl && (
                  <div className="p-6 border-2 border-black bg-black">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => playAudio(generatedAudioUrl, 'generated')}
                          className="p-4 bg-orange-600 text-white border-2 border-white font-bold uppercase hover:bg-orange-700 transition-all"
                        >
                          {currentlyPlaying === 'generated' ? (
                            <Pause className="w-6 h-6" />
                          ) : (
                            <Play className="w-6 h-6" />
                          )}
                        </button>
                        <div className="text-white">
                          <p className="font-bold uppercase text-sm">
                            {currentlyPlaying === 'generated' ? 'PLAYING...' : 'READY'}
                          </p>
                          <p className="text-xs text-stone-400 uppercase font-mono">
                            AUDIO_OUTPUT.MP3
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const voiceName = voices.find(v => v.voice_id === selectedVoice)?.name || 'Unknown';
                            const name = `TTS_${voiceName}_${new Date().toLocaleDateString()}`;
                            saveAudioFile(generatedAudioUrl, 'tts', name, {
                              text: testText.substring(0, 100),
                              voiceId: selectedVoice,
                              voiceName,
                              model: selectedModel,
                            });
                            showNotif('TTS audio saved to library!');
                          }}
                          className="flex items-center gap-2 px-4 py-3 bg-orange-600 text-white border-2 border-white font-bold uppercase hover:bg-orange-700 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => downloadAudio(generatedAudioUrl, 'voice-synthesis.mp3')}
                          className="flex items-center gap-2 px-4 py-3 bg-white text-black border-2 border-white font-bold uppercase hover:bg-stone-100 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Audio Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  My Saved Audio
                </h2>
                <div className="text-sm font-bold uppercase text-stone-600">
                  {savedAudioFiles.length} FILES
                </div>
              </div>

              {savedAudioFiles.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-black">
                  <Save className="w-12 h-12 mx-auto mb-4 text-stone-400" />
                  <p className="font-bold uppercase text-stone-600 mb-2">No Saved Audio</p>
                  <p className="text-sm text-stone-500 uppercase">
                    Save recordings or generated TTS to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAudioFiles.map((audioFile) => (
                    <div
                      key={audioFile.id}
                      className="p-4 border-2 border-black bg-stone-50 hover:bg-white transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-2 py-1 border-2 border-black text-xs font-bold uppercase ${
                              audioFile.type === 'recording' ? 'bg-orange-200' : 'bg-purple-200'
                            }`}>
                              {audioFile.type === 'recording' ? 'Recording' : 'TTS'}
                            </div>
                            <h3 className="font-bold uppercase">{audioFile.name}</h3>
                          </div>
                          
                          {audioFile.metadata && (
                            <div className="text-xs text-stone-600 uppercase font-mono space-y-1 mb-3">
                              {audioFile.metadata.voiceName && (
                                <p>Voice: {audioFile.metadata.voiceName}</p>
                              )}
                              {audioFile.metadata.model && (
                                <p>Model: {audioFile.metadata.model}</p>
                              )}
                              {audioFile.metadata.text && (
                                <p className="truncate">Text: "{audioFile.metadata.text}..."</p>
                              )}
                              {audioFile.metadata.recordingTime && (
                                <p>Duration: {formatTime(audioFile.metadata.recordingTime)}</p>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-stone-500 uppercase font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(audioFile.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => audioFile.audioUrl && playAudio(audioFile.audioUrl, audioFile.id)}
                            className="p-2 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black transition-all"
                          >
                            {currentlyPlaying === audioFile.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => audioFile.audioUrl && downloadAudio(
                              audioFile.audioUrl,
                              `${audioFile.name}.${audioFile.type === 'recording' ? 'wav' : 'mp3'}`
                            )}
                            className="p-2 bg-white text-black border-2 border-black font-bold uppercase hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              showConfirm('Delete this audio file?', () => {
                                deleteAudioFile(audioFile.id);
                              });
                            }}
                            className="p-2 bg-white text-black border-2 border-black font-bold uppercase hover:bg-red-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCloning;
