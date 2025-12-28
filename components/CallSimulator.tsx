import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, X, MessageSquare, Volume2, Terminal } from 'lucide-react';
import { Agent, ChatMessage } from '../types';
import { chatWithAgent } from '../services/geminiService';

interface CallSimulatorProps {
  agent: Agent;
  onClose: () => void;
}

const CallSimulator: React.FC<CallSimulatorProps> = ({ agent, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState('INIT_CONNECTION...');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const startCall = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('CONNECTED');
      const initialMsg: ChatMessage = {
        role: 'agent',
        text: agent.script.opening,
        timestamp: Date.now()
      };
      setMessages([initialMsg]);
      speak(initialMsg.text);
    };
    startCall();
    
    // Cleanup speech synthesis on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [agent]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setStatus('PROCESSING_INPUT...');

    try {
      const agentResponseText = await chatWithAgent(agent, messages, userMsg.text);
      
      const agentMsg: ChatMessage = {
        role: 'agent',
        text: agentResponseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, agentMsg]);
      setStatus('CONNECTED');
      speak(agentResponseText);
    } catch (error) {
      console.error(error);
      setStatus('NET_ERR');
    }
  };

  // Mock Voice Recognition for the demo if API not available
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("AUDIO_INPUT_MODULE_MISSING");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('RECEIVING_AUDIO...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      // Optional: Auto-send after voice
      // handleSendMessage(); 
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
      setStatus('CONNECTED');
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus('CONNECTED');
    };

    recognition.start();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/90 flex items-center justify-center z-50 p-4 font-mono backdrop-blur-sm">
      <div className="bg-black border-4 border-white w-full max-w-lg overflow-hidden shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-white p-3 flex items-center justify-between text-black border-b-4 border-black">
          <div className="flex items-center">
            <div className={`w-3 h-3 border-2 border-black mr-3 ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-black'}`}></div>
            <div>
              <h3 className="font-bold uppercase tracking-widest">{agent.name}_LINK</h3>
              <p className="text-xs font-bold font-mono uppercase bg-black text-white inline px-1 mt-1">{status}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-black hover:bg-black hover:text-white border-2 border-transparent hover:border-black transition-colors p-1">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-black space-y-4 font-mono">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-stone-500 mb-1 uppercase">{msg.role === 'user' ? 'YOU' : 'UNIT'}</span>
              <div 
                className={`max-w-[85%] p-3 text-sm border-2 ${
                  msg.role === 'user' 
                    ? 'bg-stone-800 text-white border-white rounded-none' 
                    : 'bg-green-900/30 text-green-400 border-green-600 rounded-none shadow-[4px_4px_0px_0px_rgba(0,100,0,0.5)]'
                }`}
              >
                {msg.role === 'agent' && <span className="mr-2">{'>'}</span>}
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="p-4 bg-stone-900 border-t-4 border-white">
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleListening}
              className={`p-3 border-2 border-white transition-colors ${
                isListening 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-black text-white hover:bg-white hover:text-black'
              }`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="INPUT_COMMAND..."
                className="w-full pl-4 pr-12 py-3 bg-black border-2 border-white text-green-400 placeholder-stone-600 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-shadow font-mono"
              />
              <button 
                onClick={handleSendMessage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-white hover:text-green-400"
              >
                <Terminal className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-stone-500 mt-3 uppercase tracking-widest">
            SECURE LINE ESTABLISHED // ENCRYPTION: ACTIVE
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallSimulator;