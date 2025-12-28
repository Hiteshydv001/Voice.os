import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Save, Play, Edit3, Phone, Terminal, X, Loader2 } from 'lucide-react';
import { generateAgentScript } from '../services/geminiService';
import { Agent } from '../types';
import CallSimulator from './CallSimulator';

interface AgentBuilderProps {
  onSave: (agent: Agent) => void;
  initialAgent?: Agent | null;
  onCancel?: () => void;
}

const AgentBuilder: React.FC<AgentBuilderProps> = ({ onSave, initialAgent, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [showSimulator, setShowSimulator] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    tone: 'Professional & Friendly',
    productDescription: '',
    goal: ''
  });
  const [generatedScript, setGeneratedScript] = useState({
    opening: '',
    closing: '',
    objectionHandling: ''
  });

  // Effect to populate form when editing an agent
  useEffect(() => {
    if (initialAgent) {
      setFormData({
        name: initialAgent.name,
        tone: initialAgent.tone,
        productDescription: initialAgent.productDescription,
        goal: initialAgent.goal
      });
      setGeneratedScript(initialAgent.script);
      setStep(2); // Jump straight to preview/edit script
    } else {
      // Reset form when not editing
      setFormData({
        name: '',
        tone: 'Professional & Friendly',
        productDescription: '',
        goal: ''
      });
      setGeneratedScript({
        opening: '',
        closing: '',
        objectionHandling: ''
      });
      setStep(1);
    }
  }, [initialAgent]);

  const handleGenerate = async () => {
    if (!formData.productDescription || !formData.goal) return;
    setLoading(true);
    try {
      const script = await generateAgentScript(
        formData.name,
        formData.tone,
        formData.productDescription,
        formData.goal
      );
      setGeneratedScript(script);
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Validate required fields
    if (!formData.name || !formData.productDescription || !formData.goal) {
      alert('Please fill in all required fields (Name, Product Description, Goal)');
      return;
    }

    if (!generatedScript.opening || !generatedScript.closing || !generatedScript.objectionHandling) {
      alert('Please generate a script first');
      return;
    }

    const newAgent: Agent = {
      id: initialAgent ? initialAgent.id : Date.now().toString(),
      ...formData,
      script: generatedScript,
      createdAt: initialAgent ? initialAgent.createdAt : new Date().toISOString()
    };
    
    console.log('Saving agent:', newAgent);
    onSave(newAgent);
    
    // If creating a new agent, reset the form. 
    // If editing, the parent component should likely handle clearing the selection, 
    // which triggers the useEffect above.
    if (!initialAgent) {
        setFormData({ name: '', tone: 'Professional & Friendly', productDescription: '', goal: '' });
        setGeneratedScript({ opening: '', closing: '', objectionHandling: '' });
        setStep(1);
    }
  };

  const currentAgentPreview: Agent = {
    id: 'preview',
    ...formData,
    script: generatedScript,
    createdAt: new Date().toISOString()
  };

  return (
    <div className="max-w-5xl mx-auto font-mono">
      {showSimulator && (
        <CallSimulator 
          agent={currentAgentPreview} 
          onClose={() => setShowSimulator(false)} 
        />
      )}

      <div className="mb-8 border-b-4 border-black pb-4 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-black text-black uppercase">
                {initialAgent ? `Edit Unit: ${initialAgent.name}` : 'Agent Constructor'}
            </h1>
            <p className="text-stone-600 mt-2">
                {initialAgent ? 'Modify autonomous parameters.' : 'Initialize new autonomous voice entity.'}
            </p>
        </div>
        {initialAgent && onCancel && (
            <button 
                onClick={onCancel}
                className="flex items-center px-4 py-2 bg-stone-200 hover:bg-stone-300 text-black font-bold uppercase text-xs transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
                <X className="h-4 w-4 mr-2" />
                Cancel Edit
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-bold text-black mb-6 flex items-center uppercase tracking-wider border-b-2 border-black pb-2">
              <Bot className="h-5 w-5 mr-2" />
              Parameters
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-black uppercase mb-2">Designation (Name)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  placeholder="e.g. SARAH_V1"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-2">Personality Modulator</label>
                <div className="relative">
                    <select
                    className="w-full px-4 py-3 border-2 border-black bg-stone-50 appearance-none focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none"
                    value={formData.tone}
                    onChange={e => setFormData({...formData, tone: e.target.value})}
                    >
                    <option>Professional & Friendly</option>
                    <option>Energetic & Salesy</option>
                    <option>Calm & Empathetic</option>
                    <option>Assertive & Direct</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black border-l-2 border-black bg-stone-200">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-2">Product Spec</label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all min-h-[100px]"
                  placeholder="Describe unit function..."
                  value={formData.productDescription}
                  onChange={e => setFormData({...formData, productDescription: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-2">Primary Objective</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                  placeholder="e.g. ACQUIRE_APPOINTMENT"
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !formData.productDescription}
                className="w-full flex items-center justify-center px-4 py-3 bg-black text-white border-2 border-black font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:hover:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    PROCESSING...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {initialAgent ? 'REGENERATE SCRIPT' : 'GENERATE SCRIPT'}
                  </span>
                )}
              </button>
              
              {/* Quick Save Option */}
              {formData.name && formData.productDescription && formData.goal && step === 1 && (
                <button
                  onClick={() => {
                    // Allow saving without generating script (user can fill manually)
                    setGeneratedScript({
                      opening: 'Hi, this is ' + formData.name + '.',
                      closing: 'Thank you for your time!',
                      objectionHandling: 'I understand your concern. Let me address that...'
                    });
                    setStep(2);
                  }}
                  className="w-full mt-2 flex items-center justify-center px-4 py-3 bg-stone-200 text-black border-2 border-black font-bold uppercase tracking-wider hover:bg-stone-300 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Skip & Edit Manually
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Script Preview */}
        <div className="lg:col-span-2">
          {step === 2 ? (
            <div className="bg-white p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b-2 border-black pb-4">
                <h3 className="font-bold text-black flex items-center uppercase tracking-wider">
                  <Terminal className="h-5 w-5 mr-2" />
                  Codebase Preview
                </h3>
                <span className="px-3 py-1 bg-green-200 text-black text-xs font-bold border-2 border-black uppercase">
                  {initialAgent ? 'EDIT_MODE' : 'AI_GENERATED'}
                </span>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-2">Init Sequence (Opening)</label>
                  <textarea
                    className="w-full px-4 py-3 bg-stone-100 border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow text-black font-medium"
                    rows={2}
                    value={generatedScript.opening}
                    onChange={e => setGeneratedScript({...generatedScript, opening: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-2">Counter-Measure (Objection Handling)</label>
                  <textarea
                    className="w-full px-4 py-3 bg-stone-100 border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow text-black font-medium"
                    rows={3}
                    value={generatedScript.objectionHandling}
                    onChange={e => setGeneratedScript({...generatedScript, objectionHandling: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase mb-2">Termination Protocol (Closing)</label>
                  <textarea
                    className="w-full px-4 py-3 bg-stone-100 border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow text-black font-medium"
                    rows={2}
                    value={generatedScript.closing}
                    onChange={e => setGeneratedScript({...generatedScript, closing: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setShowSimulator(true)}
                  className="flex items-center px-6 py-3 bg-white border-2 border-black text-black font-bold uppercase hover:bg-stone-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  SIMULATE
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center px-6 py-3 bg-orange-600 border-2 border-black text-white font-bold uppercase hover:bg-orange-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {initialAgent ? 'UPDATE UNIT' : 'COMPILE & SAVE'}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-stone-100 border-2 border-dashed border-black opacity-60">
              <div className="p-4 bg-white border-2 border-black mb-4">
                <Sparkles className="h-8 w-8 text-black" />
              </div>
              <h3 className="text-xl font-bold text-black uppercase tracking-widest">Awaiting Input</h3>
              <p className="text-stone-600 mt-2 max-w-sm text-center font-mono text-sm">
                Enter parameters on the left console to initiate script generation algorithms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentBuilder;