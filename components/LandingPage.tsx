import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Terminal, Cpu, Globe, Zap, ArrowRight, ShieldCheck, 
  Check, Star, ChevronDown, ChevronUp,
  Phone, Code, Upload, BarChart3, Radio, Play
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-black font-mono overflow-x-hidden selection:bg-orange-600 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-stone-100/90 backdrop-blur-md border-b-4 border-black px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase hidden sm:inline">Voice.OS</span>
        </div>
        <div className="flex items-center gap-6">
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="hidden md:block font-bold hover:underline decoration-2 underline-offset-4 bg-transparent border-none cursor-pointer"
            >
              PROCESS
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="hidden md:block font-bold hover:underline decoration-2 underline-offset-4 bg-transparent border-none cursor-pointer"
            >
              PRICING
            </button>
            <button 
            onClick={() => navigate('/app/dashboard')}
            className="bg-black text-white px-6 py-2 border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
            Enter System
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-6 border-b-4 border-black bg-stone-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-orange-200 border-2 border-black px-3 py-1 mb-6 text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              v2.0 System Online
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-none mb-6 uppercase tracking-tighter">
              The Future of <br/>
              <span className="bg-orange-600 text-white px-2">Voice Sales</span> <br/>
              Is Autonomous.
            </h1>
            <p className="text-xl md:text-2xl text-stone-600 mb-8 max-w-lg font-bold">
              Deploy AI agents that talk, negotiate, and close deals in real-time. Zero latency. Infinite scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/app/dashboard')}
                className="flex items-center justify-center px-8 py-4 bg-black text-white border-2 border-black font-bold text-lg uppercase hover:bg-white hover:text-black hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Initialize Agent <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="flex items-center justify-center px-8 py-4 bg-white text-black border-2 border-black font-bold text-lg uppercase hover:bg-stone-100 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                Read Documentation
              </button>
            </div>
          </div>
          
          {/* Hero Visual / Grid Decoration */}
          <div className="relative hidden lg:block h-[400px] border-4 border-black bg-black p-4 shadow-[12px_12px_0px_0px_rgba(200,200,200,1)]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-20"></div>
            <div className="h-full w-full border-2 border-green-500/30 p-4 relative overflow-hidden flex flex-col">
                <div className="flex justify-between text-green-500 font-mono text-xs mb-4">
                    <span>SYS_ROOT</span>
                    <span>CPU: 98%</span>
                </div>
                <div className="space-y-2 text-green-500 font-mono text-sm opacity-80">
                    <p>{'>'} INITIATING NEURAL LINK...</p>
                    <p>{'>'} CONNECTING TO TWILIO GATEWAY... [OK]</p>
                    <p>{'>'} LOADING AGENT MODEL [GEMINI-FLASH-LATEST]...</p>
                    <p>{'>'} SYNTHESIZING VOICE PATTERNS...</p>
                    <p className="text-white animate-pulse">{'>'} READY FOR DEPLOYMENT_</p>
                </div>
                
                {/* Abstract visualization */}
                <div className="mt-auto grid grid-cols-4 gap-2">
                    {[...Array(16)].map((_, i) => (
                        <div key={i} className={`h-8 border border-green-900 ${i % 3 === 0 ? 'bg-green-500' : 'bg-transparent'}`}></div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trusted By Section */}
      <section className="py-10 border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-xs font-bold uppercase tracking-widest mb-6 text-stone-500">Trusted By Advanced Teams At</p>
            <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale">
                {['ACME_CORP', 'CYBER_DYNE', 'MASSIVE_DYNAMIC', 'TYRELL_CORP', 'WAYNE_ENT'].map((corp) => (
                    <span key={corp} className="text-xl font-black uppercase tracking-tight">{corp}</span>
                ))}
            </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-20 px-6 bg-black text-white border-b-4 border-black relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
            <div className="inline-block border-2 border-white px-4 py-1 mb-6 text-sm font-bold uppercase tracking-widest bg-black">
                System Demonstration
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-12 tracking-tight">
                Watch The Intelligence <span className="text-orange-500">In Action</span>
            </h2>

            <div className="relative w-full aspect-video border-4 border-white shadow-[12px_12px_0px_0px_rgba(255,165,0,1)] bg-stone-900 group">
                 <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/nrDoF9bg6jU" 
                    title="Pitch Deck" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
            </div>
            
            <p className="mt-8 text-stone-400 font-mono text-sm max-w-2xl mx-auto">
                DEMO_LOG: See how our agents handle objections, qualify leads, and update the CRM in real-time. No human intervention required.
            </p>
        </div>
      </section>

      {/* Pitch & Product Videos */}
      <section id="videos" className="py-20 px-6 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <div className="inline-block border-2 border-black px-4 py-1 mb-6 text-sm font-bold uppercase tracking-widest bg-orange-100">
              Media
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase">Pitch Deck & Product Demo</h2>
            <p className="mt-4 text-stone-600 max-w-2xl mx-auto">Two short videos showcasing our pitch deck and a live product demo. Click play or open on YouTube to view full screen.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { key: 'product', title: 'Product Demo', subtitle: 'Full walkthrough of the live demo', videoId: 'nrDoF9bg6jU' }
            ].map((v) => (
              <div key={v.key} className="relative bg-black text-white border-4 border-black p-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold uppercase">{v.title}</h3>
                    <p className="text-sm text-stone-300">{v.subtitle}</p>
                  </div>
                  <a
                    href={`https://youtu.be/${v.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-orange-600 text-black px-3 py-2 font-bold uppercase border-2 border-black hover:bg-white hover:text-orange-600 transition-all"
                  >
                    <Play className="h-4 w-4" />
                    Watch on YouTube
                  </a>
                </div>

                <div className="relative w-full aspect-video bg-stone-900 border-4 border-white">
                  <iframe
                    src={`https://www.youtube.com/embed/${v.videoId}`}
                    title={`${v.title} Video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  ></iframe>
                </div>

                <p className="mt-4 text-sm text-stone-300">Short clips to help partners and customers quickly understand what Voice.OS can do — perfect for decks, demos, or investor meetings.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-stone-100 border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
            <div className="mb-16">
                <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Deployment Protocol</h2>
                <div className="h-2 w-32 bg-black"></div>
                <p className="mt-4 text-xl text-stone-600 font-bold max-w-2xl">Four steps to fully autonomous sales operations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { title: "Define Agent", icon: Code, text: "Set tone, goals, and products. AI generates the perfect script instantly." },
                    { title: "Upload Data", icon: Upload, text: "Import CSV leads. System validates numbers and filters duplicates." },
                    { title: "Execute", icon: Phone, text: "Launch campaign. 1000s of parallel calls initiated via Twilio." },
                    { title: "Analyze", icon: BarChart3, text: "Review transcripts, lead scores, and conversion metrics in real-time." }
                ].map((step, idx) => (
                    <div key={idx} className="relative bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all group">
                        <div className="absolute -top-4 -left-4 w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-xl border-2 border-white">
                            {idx + 1}
                        </div>
                        <div className="h-12 w-12 bg-stone-100 border-2 border-black flex items-center justify-center mb-6 group-hover:bg-orange-100 transition-colors">
                            <step.icon className="h-6 w-6 text-black" />
                        </div>
                        <h3 className="text-xl font-bold uppercase mb-3 border-b-2 border-black pb-2 inline-block">{step.title}</h3>
                        <p className="text-stone-600 text-sm font-medium leading-relaxed">
                            {step.text}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <div className="inline-block px-3 py-1 bg-green-100 border-2 border-black text-xs font-bold uppercase tracking-widest mb-4">
                    System Capabilities
                </div>
                <h2 className="text-4xl font-black uppercase mb-4">Built For Scale</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Card 1 */}
                <div className="bg-stone-50 p-8 border-2 border-black hover:bg-white transition-colors">
                    <Cpu className="h-8 w-8 text-orange-600 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-3">LLM Brain</h3>
                    <p className="text-stone-600">
                        Powered by Gemini 2.0 Flash. Understands context, nuance, and interruptions better than human reps.
                    </p>
                </div>

                {/* Card 2 */}
                <div className="bg-stone-50 p-8 border-2 border-black hover:bg-white transition-colors">
                    <Globe className="h-8 w-8 text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-3">Global Telephony</h3>
                    <p className="text-stone-600">
                        Instant provisioning of local numbers in 100+ countries. Low-latency voice streaming.
                    </p>
                </div>

                {/* Card 3 */}
                <div className="bg-stone-50 p-8 border-2 border-black hover:bg-white transition-colors">
                    <Zap className="h-8 w-8 text-green-600 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-3">Sub-Second Latency</h3>
                    <p className="text-stone-600">
                        Optimized architecture ensures the AI responds instantly, maintaining natural conversation flow.
                    </p>
                </div>
                
                {/* Card 4 */}
                <div className="bg-stone-50 p-8 border-2 border-black hover:bg-white transition-colors">
                    <Radio className="h-8 w-8 text-purple-600 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-3">Text-to-Speech</h3>
                    <p className="text-stone-600">
                        Generate high-quality speech from text with 100+ pre-made voices. (Voice cloning is coming soon — paid feature.)
                    </p>
                </div>

                 {/* Card 5 */}
                 <div className="bg-stone-50 p-8 border-2 border-black hover:bg-white transition-colors">
                    <ShieldCheck className="h-8 w-8 text-red-600 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-3">Compliance Guard</h3>
                    <p className="text-stone-600">
                        Automatic filtering of DNC lists and adherence to calling hour regulations per region.
                    </p>
                </div>

                 {/* Card 6 */}
                 <div className="bg-stone-50 p-8 border-2 border-black hover:bg-white transition-colors">
                    <BarChart3 className="h-8 w-8 text-yellow-600 mb-4" />
                    <h3 className="text-xl font-bold uppercase mb-3">Auto-CRM</h3>
                    <p className="text-stone-600">
                        Calls are summarized, leads are scored (1-100), and data is pushed to your CRM automatically.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-stone-900 text-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black uppercase mb-12 text-center text-white">User Logs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { name: "ALEX_R", role: "SALES_DIR", text: "We replaced our entire SDR team. Lead qual speed increased by 400%. ROI is mathematically impossible to ignore." },
                    { name: "SARAH_K", role: "FOUNDER", text: "Latency is zero. Customers literally cannot tell they are speaking to a machine. This is the singularity of sales." },
                    { name: "DAVID_M", role: "VP_MKTG", text: "Setup took 15 mins. Uploaded 10k leads and had qualified appointments booking my calendar while I slept." }
                ].map((t, i) => (
                    <div key={i} className="bg-black border-2 border-stone-700 p-6 font-mono text-sm shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
                        <div className="flex items-center text-green-500 mb-4 border-b border-stone-800 pb-2">
                            <Terminal className="h-4 w-4 mr-2" />
                            <span className="font-bold">{t.name}@{t.role}:~$ cat review.txt</span>
                        </div>
                        <p className="text-stone-300 mb-4 leading-relaxed">
                            "{t.text}"
                        </p>
                        <div className="flex text-yellow-500">
                            {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-stone-100 border-b-4 border-black">
        <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black uppercase mb-12 text-center">System Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Basic */}
                <div className="bg-white border-2 border-black p-8">
                    <h3 className="text-2xl font-black uppercase mb-2">Bootstrap</h3>
                    <div className="text-4xl font-bold mb-6">$499<span className="text-sm font-normal text-stone-500">/mo</span></div>
                    <ul className="space-y-4 mb-8 text-sm font-bold text-stone-600">
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> 1 Agent Instance</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> 500 Calls / mo</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> Basic Analytics</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> Email Support</li>
                    </ul>
                    <button 
                      onClick={() => navigate('/login')}
                      className="w-full py-3 border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-all"
                    >
                      Select
                    </button>
                </div>

                {/* Pro */}
                <div className="bg-black text-white border-4 border-black p-8 transform md:-translate-y-4 shadow-[12px_12px_0px_0px_rgba(255,165,0,1)] relative">
                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-3 py-1 uppercase">Recommended</div>
                    <h3 className="text-2xl font-black uppercase mb-2">Scale</h3>
                    <div className="text-4xl font-bold mb-6">$1,299<span className="text-sm font-normal text-stone-400">/mo</span></div>
                    <ul className="space-y-4 mb-8 text-sm font-bold text-stone-300">
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-orange-500" /> 5 Agent Instances</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-orange-500" /> Unlimited Calls*</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-orange-500" /> Real-time Transcription</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-orange-500" /> CRM Integration</li>
                    </ul>
                    <button 
                      onClick={() => navigate('/login')}
                      className="w-full py-3 bg-white text-black border-2 border-white font-bold uppercase hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all"
                    >
                      Deploy Now
                    </button>
                </div>

                {/* Enterprise */}
                <div className="bg-white border-2 border-black p-8">
                    <h3 className="text-2xl font-black uppercase mb-2">Enterprise</h3>
                    <div className="text-4xl font-bold mb-6">CUSTOM</div>
                    <ul className="space-y-4 mb-8 text-sm font-bold text-stone-600">
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> Custom Voice Cloning (Coming Soon, Paid)</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> On-premise Deployment</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> Dedicated Engineer</li>
                        <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-black" /> SLA 99.99%</li>
                    </ul>
                    <button 
                      onClick={() => navigate('/login')}
                      className="w-full py-3 border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-all"
                    >
                      Contact Sales
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white border-b-4 border-black">
        <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-black uppercase mb-12 text-center">System Queries</h2>
            <div className="space-y-4">
                {[
                    { q: "Is this compliant with US calling laws?", a: "Yes. Our system includes mandatory DNC checking, time-zone awareness calling windows, and required disclosure injection." },
                    { q: "Can I interrupt the AI while it speaks?", a: "Absolutely. Our low-latency architecture handles interruptions gracefully, stopping speech immediately to listen, just like a human." },
                    { q: "What languages are supported?", a: "Currently supports English, Spanish, French, German, and Portuguese with native accents." },
                    { q: "Do I need my own Twilio account?", a: "For the Bootstrap plan, you can use our shared infrastructure. For Scale and above, we recommend connecting your own Twilio SID." }
                ].map((item, idx) => (
                    <div key={idx} className="border-2 border-black">
                        <button 
                            onClick={() => toggleFaq(idx)}
                            className="w-full flex justify-between items-center p-4 bg-stone-50 hover:bg-stone-100 font-bold uppercase text-left"
                        >
                            <span>{item.q}</span>
                            {faqOpen === idx ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        {faqOpen === idx && (
                            <div className="p-4 bg-white border-t-2 border-black text-stone-600 font-medium">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-stone-800 pb-12">
                <div className="max-w-xl">
                    <h3 className="text-3xl font-black text-white uppercase mb-4">Ready to Automate?</h3>
                    <p>Join 500+ forward-thinking sales teams deploying Voice.OS today.</p>
                </div>
                <button 
                    onClick={() => navigate('/app/dashboard')}
                    className="bg-orange-600 text-white px-8 py-4 border-2 border-transparent font-bold uppercase hover:bg-white hover:text-orange-600 transition-all text-lg"
                >
                    Get Started Free
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-orange-600" />
                    <span className="font-bold text-white uppercase tracking-wider">Voice.OS Systems</span>
                </div>
                
                <div className="flex gap-8 text-sm font-bold uppercase">
                    <a href="#" className="hover:text-white transition-colors">Privacy Protocol</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Engagement</a>
                    <a href="#" className="hover:text-white transition-colors">System Status</a>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>ALL SYSTEMS OPERATIONAL</span>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;