import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AgentNodeType, NodeConfig } from '../../types';

interface NodeConfigModalProps {
  nodeId: string | null;
  nodeType: AgentNodeType | null;
  currentConfig: NodeConfig | null;
  onSave: (nodeId: string, config: NodeConfig) => void;
  onClose: () => void;
}

export function NodeConfigModal({
  nodeId,
  nodeType,
  currentConfig,
  onSave,
  onClose,
}: NodeConfigModalProps) {
  const [config, setConfig] = useState<any>(currentConfig || {});

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    } else {
      // Set defaults based on node type
      switch (nodeType) {
        case 'llm':
          setConfig({
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            temperature: 0.7,
            systemPrompt: 'You are a helpful AI assistant.',
          });
          break;
        case 'stt':
          setConfig({
            model: 'nova-2',
            language: 'en-US',
          });
          break;
        case 'tts':
          setConfig({
            voice: 'presenter_female',
            model: 'speech-02-turbo',
          });
          break;
        case 'start':
          setConfig({
            inputType: 'text',
          });
          break;
        case 'end':
          setConfig({
            outputType: 'text',
          });
          break;
      }
    }
  }, [nodeType, currentConfig]);

  if (!nodeId || !nodeType) return null;

  const handleSave = () => {
    onSave(nodeId, config);
    onClose();
  };

  const renderConfig = () => {
    switch (nodeType) {
      case 'llm':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Provider
              </label>
              <select
                value={config.provider || 'gemini'}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  const newModel = newProvider === 'gemini' ? 'gemini-2.0-flash' : 'llama-3.3-70b-versatile';
                  setConfig({ ...config, provider: newProvider, model: newModel });
                }}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Model
              </label>
              <select
                value={config.model || ''}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {config.provider === 'gemini' ? (
                  <>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </>
                ) : (
                  <>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Versatile)</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Instant)</option>
                    <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
                    <option value="openai/gpt-oss-20b">GPT-OSS 20B</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Temperature: {config.temperature || 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || 0.7}
                onChange={(e) =>
                  setConfig({ ...config, temperature: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                System Prompt
              </label>
              <textarea
                value={config.systemPrompt || ''}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="You are a helpful AI assistant..."
              />
            </div>
          </div>
        );

      case 'stt':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Deepgram Model
              </label>
              <select
                value={config.model || 'nova-2'}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nova-2">Nova 2 (Latest, Best)</option>
                <option value="nova">Nova (Fast)</option>
                <option value="base">Base (Balanced)</option>
                <option value="enhanced">Enhanced (High Accuracy)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Language
              </label>
              <select
                value={config.language || 'en-US'}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>
        );

      case 'tts':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Minimax Voice
              </label>
              <select
                value={config.voice || 'presenter_female'}
                onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="presenter_female">Presenter Female</option>
                <option value="presenter_male">Presenter Male</option>
                <option value="audiobook_female_1">Audiobook Female 1</option>
                <option value="audiobook_female_2">Audiobook Female 2</option>
                <option value="audiobook_male_1">Audiobook Male 1</option>
                <option value="audiobook_male_2">Audiobook Male 2</option>
                <option value="male-qn-qingse">Qingse (Male, Chinese)</option>
                <option value="female-shaonv">Shaonv (Female, Chinese)</option>
                <option value="male-qn-jingying">Jingying (Male, Chinese)</option>
                <option value="English_Lucky_Robot">Lucky Robot (English)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Model
              </label>
              <select
                value={config.model || 'speech-02-turbo'}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="speech-02-turbo">Speech-02 Turbo</option>
                <option value="speech-01">Speech-01</option>
              </select>
            </div>
          </div>
        );

      case 'start':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Input Type
              </label>
              <select
                value={config.inputType || 'text'}
                onChange={(e) => setConfig({ ...config, inputType: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="text">Text</option>
                <option value="audio">Audio</option>
              </select>
            </div>
          </div>
        );

      case 'end':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">
                Output Type
              </label>
              <select
                value={config.outputType || 'text'}
                onChange={(e) => setConfig({ ...config, outputType: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="text">Text</option>
                <option value="audio">Audio</option>
              </select>
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-stone-600">No configuration needed for this node type.</p>;
    }
  };

  const getNodeTitle = () => {
    switch (nodeType) {
      case 'llm':
        return 'LLM Configuration';
      case 'stt':
        return 'Speech-to-Text Configuration';
      case 'tts':
        return 'Text-to-Speech Configuration';
      case 'start':
        return 'Start Node Configuration';
      case 'end':
        return 'End Node Configuration';
      default:
        return 'Node Configuration';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black max-w-md w-full max-h-[80vh] overflow-y-auto font-mono shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="sticky top-0 bg-white border-b-4 border-black p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase">{getNodeTitle()}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 border-2 border-black"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {renderConfig()}

          <div className="mt-6 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-black font-bold uppercase hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-black text-white font-bold uppercase hover:bg-stone-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
