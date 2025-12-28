import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { APIKeyService, APIKeys } from '../../services/apiKeyService';

interface APIKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function APIKeysModal({ isOpen, onClose }: APIKeysModalProps) {
  const [keys, setKeys] = useState<APIKeys>(APIKeyService.loadAPIKeys());
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [saved, setSaved] = useState(false);
  const platformKeys = APIKeyService.hasPlatformKeys();

  useEffect(() => {
    if (isOpen) {
      setKeys(APIKeyService.loadAPIKeys());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    APIKeyService.saveAPIKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleShowKey = (service: string) => {
    setShowKeys((prev) => ({ ...prev, [service]: !prev[service] }));
  };

  const getKeyDisplay = (key: string | undefined, show: boolean) => {
    if (!key) return '';
    if (show) return key;
    return '•'.repeat(Math.min(key.length, 40));
  };

  const validateAndUpdate = (service: string, key: string) => {
    const isValid = APIKeyService.validateKey(service, key);
    return isValid;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black max-w-3xl w-full max-h-[90vh] overflow-y-auto font-mono shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="sticky top-0 bg-white border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={24} />
            <h2 className="text-lg font-bold uppercase">API Keys Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 border-2 border-black"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-500 p-4">
            <div className="flex gap-2">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold mb-1">Choose Your Mode:</p>
                <p>
                  • <strong>Use Platform Keys:</strong> Free to use, no setup needed (default)
                </p>
                <p>
                  • <strong>Use Your Own Keys:</strong> More control, your own quota, better for production
                </p>
              </div>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="border-2 border-black p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm uppercase mb-1">Google Gemini API</h3>
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                {platformKeys.gemini && (
                  <span className="text-xs bg-green-100 border border-green-500 px-2 py-1">
                    Platform Key Available
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={keys.useOwnGemini}
                onChange={(e) =>
                  setKeys({ ...keys, useOwnGemini: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Use my own Gemini API key</span>
            </label>

            {keys.useOwnGemini && (
              <div className="relative">
                <input
                  type={showKeys.gemini ? 'text' : 'password'}
                  value={keys.geminiApiKey || ''}
                  onChange={(e) =>
                    setKeys({ ...keys, geminiApiKey: e.target.value })
                  }
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-20"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('gemini')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 border border-black bg-white hover:bg-stone-50"
                >
                  {showKeys.gemini ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
          </div>

          {/* Groq API Key */}
          <div className="border-2 border-black p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm uppercase mb-1">Groq API</h3>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                {platformKeys.groq && (
                  <span className="text-xs bg-green-100 border border-green-500 px-2 py-1">
                    Platform Key Available
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={keys.useOwnGroq}
                onChange={(e) => setKeys({ ...keys, useOwnGroq: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Use my own Groq API key</span>
            </label>

            {keys.useOwnGroq && (
              <div className="relative">
                <input
                  type={showKeys.groq ? 'text' : 'password'}
                  value={keys.groqApiKey || ''}
                  onChange={(e) => setKeys({ ...keys, groqApiKey: e.target.value })}
                  placeholder="gsk_..."
                  className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-20"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('groq')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 border border-black bg-white hover:bg-stone-50"
                >
                  {showKeys.groq ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
          </div>

          {/* Deepgram API Key */}
          <div className="border-2 border-black p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm uppercase mb-1">Deepgram API</h3>
                <a
                  href="https://console.deepgram.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                {platformKeys.deepgram && (
                  <span className="text-xs bg-green-100 border border-green-500 px-2 py-1">
                    Platform Key Available
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={keys.useOwnDeepgram}
                onChange={(e) =>
                  setKeys({ ...keys, useOwnDeepgram: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Use my own Deepgram API key</span>
            </label>

            {keys.useOwnDeepgram && (
              <div className="relative">
                <input
                  type={showKeys.deepgram ? 'text' : 'password'}
                  value={keys.deepgramApiKey || ''}
                  onChange={(e) =>
                    setKeys({ ...keys, deepgramApiKey: e.target.value })
                  }
                  placeholder="Your Deepgram API key"
                  className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-20"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('deepgram')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 border border-black bg-white hover:bg-stone-50"
                >
                  {showKeys.deepgram ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
          </div>

          {/* ElevenLabs API Key */}
          <div className="border-2 border-black p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm uppercase mb-1">ElevenLabs API</h3>
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                {platformKeys.elevenlabs && (
                  <span className="text-xs bg-green-100 border border-green-500 px-2 py-1">
                    Platform Key Available
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={keys.useOwnElevenlabs}
                onChange={(e) =>
                  setKeys({ ...keys, useOwnElevenlabs: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Use my own ElevenLabs API key</span>
            </label>

            {keys.useOwnElevenlabs && (
              <div className="relative">
                <input
                  type={showKeys.elevenlabs ? 'text' : 'password'}
                  value={keys.elevenlabsApiKey || ''}
                  onChange={(e) =>
                    setKeys({ ...keys, elevenlabsApiKey: e.target.value })
                  }
                  placeholder="Your ElevenLabs API key"
                  className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-20"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('elevenlabs')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 border border-black bg-white hover:bg-stone-50"
                >
                  {showKeys.elevenlabs ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t-2 border-black">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white font-bold uppercase hover:bg-stone-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              {saved ? (
                <>
                  <Check size={16} />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-black font-bold uppercase hover:bg-stone-100 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Security Note */}
          <div className="bg-yellow-50 border-2 border-yellow-500 p-3 text-xs">
            <p className="font-bold mb-1">🔒 Security Note:</p>
            <p>
              Your API keys are stored locally in your browser and never sent to our servers.
              They are only used to make direct API calls to the respective services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
