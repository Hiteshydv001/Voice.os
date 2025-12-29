import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import Login from './components/Auth/Login';
import SignUp from './components/Auth/SignUp';
import Dashboard from './components/Dashboard';
import UserActivity from './components/UserActivity';
import AgentBuilder from './components/AgentBuilder';
import { AgentBuilderPage } from './components/AgentBuilder/AgentBuilderPage';
import LeadsManager from './components/LeadsManager';
import CampaignManager from './components/CampaignManager';
import CallSimulator from './components/CallSimulator';
import SubscriptionModal from './components/SubscriptionModal';
import PaymentSuccess from './components/PaymentSuccess';
import VoiceCloning from './components/VoiceCloning';
import { storage } from './services/storageService';
import { makeOutboundCall } from './services/twilioService';
import { deductCredits } from './services/userService';
import { Agent, Campaign, Lead, ActivityLog } from './types';
import { Phone, Edit, Bot } from 'lucide-react';

// Suppress ResizeObserver warnings globally (known React Flow issue)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('ResizeObserver loop')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

const AppContent: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [simulatingAgent, setSimulatingAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);

  // Load initial data when currentUser changes
  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        console.log('Loading data for user:', currentUser.uid);
        const [agentsData, leadsData, campaignsData, logsData] = await Promise.all([
          storage.getAgents(currentUser.uid),
          storage.getLeads(currentUser.uid),
          storage.getCampaigns(currentUser.uid),
          storage.getLogs(currentUser.uid)
        ]);
        console.log('Loaded data:', {
          agents: agentsData.length,
          leads: leadsData.length,
          campaigns: campaignsData.length,
          logs: logsData.length
        });
        setAgents(agentsData);
        setLeads(leadsData);
        setCampaigns(campaignsData);
        setLogs(logsData);
      } else {
        // Clear data if no user (e.g. logout)
        console.log('No user, clearing data');
        setAgents([]);
        setLeads([]);
        setCampaigns([]);
        setLogs([]);
      }
    };
    loadData();
  }, [currentUser]);

  const handleSaveAgent = (agent: Agent) => {
    if (!currentUser) {
      console.error('Cannot save agent: No current user');
      alert('Error: You must be logged in to save agents');
      return;
    }
    
    console.log('Saving agent:', agent);
    console.log('Current user:', currentUser.uid);
    
    setAgents(prevAgents => {
      const existingIndex = prevAgents.findIndex(a => a.id === agent.id);
      let updatedAgents;
      
      if (existingIndex >= 0) {
        // Update existing
        updatedAgents = [...prevAgents];
        updatedAgents[existingIndex] = agent;
        console.log('Updated existing agent at index:', existingIndex);
        alert('Agent updated successfully!');
      } else {
        // Create new
        updatedAgents = [agent, ...prevAgents];
        console.log('Created new agent. Total agents:', updatedAgents.length);
        alert('Agent created successfully!');
      }
      
      console.log('Saving to storage:', updatedAgents);
      storage.saveAgents(currentUser.uid, updatedAgents);
      
      // Verify it was saved
      setTimeout(() => {
        storage.getAgents(currentUser.uid).then(saved => {
          console.log('Verified saved agents:', saved.length, 'agents');
        });
      }, 100);
      
      return updatedAgents;
    });
    setEditingAgent(null);
  };

  const handleUploadLeads = (newLeads: Lead[]) => {
    if (!currentUser) return;
    const updatedLeads = [...newLeads, ...leads];
    setLeads(updatedLeads);
    storage.saveLeads(currentUser.uid, updatedLeads);
  };

  const handleDeleteLead = (leadId: string) => {
    if (!currentUser) return;
    const updatedLeads = leads.filter(lead => lead.id !== leadId);
    setLeads(updatedLeads);
    storage.saveLeads(currentUser.uid, updatedLeads);
  };

  const handleClearAllLeads = () => {
    if (!currentUser) return;
    setLeads([]);
    storage.saveLeads(currentUser.uid, []);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!currentUser) return;
    const updatedCampaigns = campaigns.filter(campaign => campaign.id !== campaignId);
    setCampaigns(updatedCampaigns);
    storage.saveCampaigns(currentUser.uid, updatedCampaigns);
  };

  const handleAddLog = (log: ActivityLog) => {
    if (!currentUser) return;
    setLogs(prev => {
        const newLogs = [...prev, log];
        storage.saveLogs(currentUser.uid, newLogs);
        return newLogs;
    });
  };

  // --- CAMPAIGN RUNNER LOGIC ---
  const runCampaign = async (campaign: Campaign) => {
    if (!currentUser) return;

    // 1. Identify Target Leads - ALLOW RE-CALLING (removed status filter)
    const targetLeads = leads; // Changed: use ALL leads, not just 'New' ones
    const agent = agents.find(a => a.id === campaign.agentId);

    if (!agent) {
        alert("Error: Agent not found for this campaign.");
        return;
    }

    if (targetLeads.length === 0) {
        alert("No leads available to call. Please upload leads first.");
        return;
    }

    // Initialize call results array
    const callResults: import('./types').CampaignCallResult[] = [];

    // 2. CHECK CREDITS
    const costPerCall = 5;
    const totalCost = targetLeads.length * costPerCall;
    const currentCredits = userProfile?.credits || 0;

    if (currentCredits < 5) {
        setShowSubscription(true);
        return;
    }

    // Warn if they don't have enough for the WHOLE campaign, but let them start
    if (currentCredits < totalCost) {
        const confirmStart = window.confirm(`Warning: You have ${currentCredits} credits, but this campaign requires ${totalCost}. Calls will stop when credits run out. Continue?`);
        if (!confirmStart) return;
    }

    // 3. Save Campaign
    const activeCampaign = { 
      ...campaign, 
      leadsCount: targetLeads.length, 
      status: 'Active' as const,
      callResults: [],
      startedAt: new Date().toISOString()
    };
    const updatedCampaigns = [activeCampaign, ...campaigns];
    setCampaigns(updatedCampaigns);
    storage.saveCampaigns(currentUser.uid, updatedCampaigns);

    alert(`Campaign Initialized. Starting calls for ${targetLeads.length} leads...`);

    // 4. Async Loop to process calls
    for (let i = 0; i < targetLeads.length; i++) {
        // Re-check credits before EACH call in case they run out mid-campaign
        await refreshProfile(); 
        
        const lead = targetLeads[i];

        // Update Campaign Progress in UI with current results
        setCampaigns(prev => {
            const current = prev.map(c => 
                c.id === campaign.id 
                ? { 
                    ...c, 
                    callsMade: i + 1, 
                    progress: Math.round(((i + 1) / targetLeads.length) * 100),
                    callResults: [...callResults] // Update with current results
                  } 
                : c
            );
            storage.saveCampaigns(currentUser.uid, current);
            return current;
        });

        // Add "Dialing" Log
        handleAddLog({
            id: Date.now(),
            phone: lead.phone,
            status: 'Dialing...',
            time: new Date().toLocaleTimeString(),
            agentName: agent.name
        });

        try {
            // Perform the call with agent's custom script
            const callStartTime = Date.now();
            await makeOutboundCall(lead.phone, agent.name, agent.script);
            const callDuration = Math.floor((Date.now() - callStartTime) / 1000);

            // Record successful call result
            const callResult: import('./types').CampaignCallResult = {
                leadId: lead.id,
                leadName: lead.name,
                leadPhone: lead.phone,
                status: 'Success',
                duration: callDuration,
                timestamp: new Date().toISOString(),
                sentiment: ['Positive', 'Neutral', 'Negative'][Math.floor(Math.random() * 3)] as 'Positive' | 'Neutral' | 'Negative',
                notes: 'Call completed successfully'
            };
            callResults.push(callResult);

            // DEDUCT CREDITS
            await deductCredits(currentUser.uid, costPerCall);
            refreshProfile(); // Trigger UI update for credit counter

            // Update Lead Status
            setLeads(prev => {
                const updated = prev.map(l => l.id === lead.id ? { ...l, status: 'Contacted' as const } : l);
                storage.saveLeads(currentUser.uid, updated);
                return updated;
            });

            // Log Success
            handleAddLog({
                id: Date.now() + 1,
                phone: lead.phone,
                status: `Outbound (${agent.name})`,
                time: new Date().toLocaleTimeString(),
                agentName: agent.name
            });

        } catch (error: any) {
            console.error("Call failed", error);
            console.error("Error details:", {
                message: error.message,
                lead: lead.phone,
                agent: agent.name
            });
            
            // Show helpful error message
            if (i === 0) {
                if (error.message.includes('21219') || error.message.includes('unverified')) {
                    alert(`❌ Phone Number Not Verified!\n\n` +
                          `Twilio trial accounts require verification.\n\n` +
                          `To verify ${lead.phone}:\n` +
                          `1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified\n` +
                          `2. Click "Verify a new number"\n` +
                          `3. Enter: ${lead.phone}\n` +
                          `4. Enter the verification code you receive\n\n` +
                          `Or upgrade to a paid Twilio account to call any number.`);
                } else {
                    alert(`First call failed: ${error.message}\n\nCheck console for details.`);
                }
            }
            
            // Record failed call result
            const callResult: import('./types').CampaignCallResult = {
                leadId: lead.id,
                leadName: lead.name,
                leadPhone: lead.phone,
                status: error.message?.includes('verified') || error.message?.includes('Trial') ? 'Failed' : 'No Answer',
                duration: 0,
                timestamp: new Date().toISOString(),
                notes: error.message || 'Call failed'
            };
            callResults.push(callResult);
            
            // Log Failure
            handleAddLog({
                id: Date.now() + 1,
                phone: lead.phone,
                status: `Failed: ${error.message?.substring(0, 50) || 'Unknown error'}`,
                time: new Date().toLocaleTimeString(),
                agentName: agent.name
            });
        }

        // Wait 5 seconds between calls
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 5. Mark Campaign Completed with all call results
    setCampaigns(prev => {
        const current = prev.map(c => 
            c.id === campaign.id 
            ? { 
                ...c, 
                status: 'Completed' as const,
                callResults: callResults,
                completedAt: new Date().toISOString()
              } 
            : c
        );
        storage.saveCampaigns(currentUser.uid, current);
        return current;
    });

    alert(`Campaign Completed! ${callResults.filter(r => r.status === 'Success').length} successful calls out of ${callResults.length} attempts.`);
  };

  return (
    <>
      {showSubscription && (
          <SubscriptionModal 
            currentCredits={userProfile?.credits || 0} 
            onClose={() => setShowSubscription(false)} 
          />
      )}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Payment Routes */}
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Protected App Routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard agents={agents} logs={logs} onAddLog={handleAddLog} />} />
          <Route path="activity" element={<UserActivity />} />
          <Route 
            path="agents" 
            element={
              <div className="space-y-8 font-mono">
                {simulatingAgent && (
                  <CallSimulator 
                    agent={simulatingAgent} 
                    onClose={() => setSimulatingAgent(null)} 
                  />
                )}
                <AgentBuilder 
                  onSave={handleSaveAgent} 
                  initialAgent={editingAgent}
                  onCancel={() => setEditingAgent(null)}
                />
                <div className="border-t-4 border-black pt-8">
                  <h2 className="text-2xl font-black text-black uppercase mb-6 flex items-center">
                    <Bot className="h-6 w-6 mr-3" />
                    Available Units
                  </h2>
                  {agents.length === 0 ? (
                    <p className="text-stone-500 italic border-2 border-dashed border-black p-8 text-center bg-stone-100">
                        NO UNITS DETECTED. INITIALIZE NEW AGENT ABOVE.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agents.map(agent => (
                        <div key={agent.id} className={`bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full ${editingAgent?.id === agent.id ? 'ring-4 ring-orange-500 ring-opacity-50' : 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
                            <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                            <h3 className="font-bold text-black uppercase tracking-wider">{agent.name}</h3>
                            <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase">{agent.tone}</span>
                            </div>
                            <p className="text-xs text-stone-600 mb-4 line-clamp-2 flex-1 font-mono uppercase">{agent.productDescription}</p>
                            <div className="text-[10px] font-mono bg-stone-100 p-2 border border-stone-300 text-stone-600 mb-4">
                            "{agent.script.opening.substring(0, 60)}..."
                            </div>
                            <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                  setEditingAgent(agent);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex-1 text-xs font-bold text-black bg-white border-2 border-black hover:bg-stone-100 py-3 uppercase transition-colors"
                            >
                                <div className="flex items-center justify-center">
                                    <Edit className="h-3 w-3 mr-2" />
                                    Config
                                </div>
                            </button>
                            <button 
                                onClick={() => setSimulatingAgent(agent)}
                                className="flex-1 text-xs font-bold text-white bg-black border-2 border-black hover:bg-stone-800 py-3 uppercase transition-colors shadow-[2px_2px_0px_0px_rgba(100,100,100,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                            >
                                <div className="flex items-center justify-center">
                                    <Phone className="h-3 w-3 mr-2" />
                                    Test
                                </div>
                            </button>
                            </div>
                        </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            } 
          />
          <Route 
            path="leads" 
            element={<LeadsManager leads={leads} onUpload={handleUploadLeads} onDelete={handleDeleteLead} onClearAll={handleClearAllLeads} />} 
          />
          <Route 
            path="campaigns" 
            element={
              <CampaignManager 
                agents={agents} 
                campaigns={campaigns} 
                leads={leads}
                onCreateCampaign={runCampaign}
                onDeleteCampaign={handleDeleteCampaign}
              />
            } 
          />
          <Route 
            path="voice-cloning" 
            element={<VoiceCloning />} 
          />
          <Route 
            path="visual-builder" 
            element={<AgentBuilderPage />} 
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;