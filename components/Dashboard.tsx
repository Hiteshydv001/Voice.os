import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Phone, Users, CheckCircle, TrendingUp, Activity, PhoneOutgoing, X, Loader2, AlertTriangle, Coins, Plus } from 'lucide-react';
import { Agent, ActivityLog } from '../types';
import { TWILIO_CONFIG } from '../config';
import { makeOutboundCall } from '../services/twilioService';
import { useAuth } from '../contexts/AuthContext';
import { deductCredits } from '../services/userService';
import SubscriptionModal from './SubscriptionModal';

interface DashboardProps {
  agents: Agent[];
  logs: ActivityLog[];
  onAddLog: (log: ActivityLog) => void;
}

// Placeholder data for the chart (Visualization only)
const chartData = [
  { name: 'MON', calls: 20, conversions: 5 },
  { name: 'TUE', calls: 32, conversions: 8 },
  { name: 'WED', calls: 15, conversions: 2 },
  { name: 'THU', calls: 45, conversions: 12 },
  { name: 'FRI', calls: 60, conversions: 20 },
  { name: 'SAT', calls: 10, conversions: 1 },
  { name: 'SUN', calls: 5, conversions: 0 },
];

const StatCard = ({ title, value, change, icon: Icon, colorClass, action }: any) => (
  <div className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-bold text-black mt-2 font-mono">{value}</p>
      </div>
      <div className={`p-3 border-2 border-black ${colorClass}`}>
        <Icon className="h-6 w-6 text-black" />
      </div>
    </div>
    {change && (
      <div className="mt-4 flex items-center text-sm font-mono border-t-2 border-stone-100 pt-2">
        <span className="text-green-600 font-bold flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          {change}
        </span>
        <span className="text-stone-400 ml-2 uppercase">vs last week</span>
      </div>
    )}
    {action && (
        <div className="mt-4 pt-2 border-t-2 border-stone-100">
            {action}
        </div>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ agents = [], logs = [], onAddLog }) => {
  const { userProfile, currentUser, refreshProfile } = useAuth();
  
  // Dialer State
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [dialerNumber, setDialerNumber] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'calling' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const CREDIT_COST_PER_CALL = 5;

  const handleCall = async () => {
    if (!dialerNumber || !selectedAgentId || !currentUser) return;

    // Credit Check
    const currentCredits = userProfile?.credits || 0;
    if (currentCredits < CREDIT_COST_PER_CALL) {
        setIsDialerOpen(false);
        setShowSubscription(true);
        return;
    }

    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;

    setCallStatus('connecting');
    setErrorMessage('');

    try {
        setCallStatus('calling');
        
        const callStartTime = Date.now();
        const callStartTimeISO = new Date().toISOString();
        
        // Call the real Twilio Service with full agent object
        await makeOutboundCall(dialerNumber, agent);
        
        const callDuration = Math.floor((Date.now() - callStartTime) / 1000);
        
        // Deduct Credits
        await deductCredits(currentUser.uid, CREDIT_COST_PER_CALL);
        await refreshProfile(); // Refresh UI

        setCallStatus('success');
        
        // Add to real logs
        const newLog: ActivityLog = {
          id: Date.now(),
          phone: dialerNumber,
          status: `Outbound (${agent.name})`,
          time: new Date().toLocaleTimeString(),
          agentName: agent.name
        };
        onAddLog(newLog);

        // Save to Call History
        const callHistoryRecord: import('../types').CallHistoryRecord = {
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: currentUser.uid,
          agentId: agent.id,
          agentName: agent.name,
          leadPhone: dialerNumber,
          callType: 'Manual',
          status: 'Completed',
          duration: callDuration,
          timestamp: new Date().toISOString(),
          startTime: callStartTimeISO,
          endTime: new Date().toISOString(),
          script: agent.script,
          aiModel: 'gemini-flash-latest',
          sentiment: 'Neutral',
          outcome: 'Manual call completed',
          notes: `Quick dial call to ${dialerNumber}`
        };
        await import('../services/storageService').then(module => 
          module.storage.saveCallHistory(currentUser.uid, callHistoryRecord)
        );

        // Reset after success
        setTimeout(() => {
          setCallStatus('idle');
          setIsDialerOpen(false);
          setDialerNumber('');
        }, 3000);

    } catch (error: any) {
        console.error(error);
        setCallStatus('error');
        setErrorMessage(error.message || "Failed to connect call");
    }
  };

  const totalCalls = logs.length;
  // Simple calculation for demo purposes
  const qualifiedLeads = logs.filter(l => l.status?.includes('Qualified')).length; 

  return (
    <div className="space-y-8 font-mono">
      {/* Subscription Modal */}
      {showSubscription && (
        <SubscriptionModal 
            currentCredits={userProfile?.credits || 0} 
            onClose={() => setShowSubscription(false)} 
        />
      )}

      {/* Dialer Modal */}
      {isDialerOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border-4 border-black w-full max-w-sm overflow-hidden shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="bg-black p-4 text-white flex justify-between items-center border-b-4 border-black">
              <h3 className="font-bold text-lg flex items-center uppercase tracking-wider">
                <PhoneOutgoing className="h-5 w-5 mr-3" />
                Quick Dial
              </h3>
              <button onClick={() => setIsDialerOpen(false)} className="text-white hover:text-orange-500 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 bg-stone-50">
              {callStatus === 'idle' || callStatus === 'error' ? (
                <>
                  <div className="bg-white border-2 border-black p-3 flex items-start justify-between">
                    <div className="flex items-start">
                        <Coins className="h-5 w-5 text-black mt-0.5 mr-3 shrink-0" />
                        <div>
                        <p className="text-xs font-bold uppercase text-black">Balance</p>
                        <p className={`text-sm font-bold font-mono ${(userProfile?.credits || 0) < 5 ? 'text-red-600' : 'text-stone-600'}`}>
                            {userProfile?.credits || 0} CR
                        </p>
                        </div>
                    </div>
                    <div className="text-right">
                         <p className="text-[10px] font-bold uppercase text-stone-500">Cost</p>
                         <p className="text-xs font-bold font-mono text-black">-{CREDIT_COST_PER_CALL} CR</p>
                    </div>
                  </div>

                  {callStatus === 'error' && (
                    <div className="bg-red-100 border-2 border-red-600 p-3 flex items-start text-red-900">
                        <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                        <p className="text-xs font-bold">{errorMessage}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase text-black mb-2">Target Number</label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow text-lg font-mono"
                      value={dialerNumber}
                      onChange={e => setDialerNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-black mb-2">Deploy Agent</label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow font-mono"
                      value={selectedAgentId}
                      onChange={e => setSelectedAgentId(e.target.value)}
                    >
                      <option value="">-- SELECT UNIT --</option>
                      {agents.length === 0 && <option disabled>NO UNITS AVAILABLE</option>}
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleCall}
                    disabled={!dialerNumber || !selectedAgentId}
                    className="w-full py-4 bg-orange-600 text-white border-2 border-black font-bold uppercase tracking-wider hover:bg-orange-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:hover:shadow-none transition-all flex justify-center items-center"
                  >
                    Initiate Sequence
                  </button>
                </>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  {callStatus === 'success' ? (
                    <div className="text-black mb-4 animate-bounce">
                      <CheckCircle className="h-16 w-16" />
                    </div>
                  ) : (
                    <div className="text-orange-600 mb-4">
                      <Loader2 className="h-16 w-16 animate-spin" />
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold text-black mb-2 uppercase">
                    {callStatus === 'connecting' && 'Establishing Uplink...'}
                    {callStatus === 'calling' && `Dialing Target...`}
                    {callStatus === 'success' && 'Signal Transmitted'}
                  </h3>
                  <div className="font-mono text-xs border-t-2 border-black pt-2 mt-2 px-4">
                    {callStatus === 'success' 
                      ? 'CREDITS DEDUCTED: 5' 
                      : `SOURCE: ${TWILIO_CONFIG.phoneNumber}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black uppercase tracking-tighter">Command Center</h1>
          <p className="text-stone-600 mt-1 font-mono text-sm">System Status: OPERATIONAL // {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
                setIsDialerOpen(true);
                setCallStatus('idle');
                setErrorMessage('');
            }}
            className="flex items-center bg-black text-white px-6 py-3 border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <PhoneOutgoing className="h-4 w-4 mr-2" />
            Manual Override
          </button>
          <div className="hidden md:flex items-center bg-white border-2 border-black text-black px-4 py-3 font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Activity className="h-4 w-4 mr-2 text-green-600" />
            ONLINE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Available Credits" 
          value={userProfile?.credits || 0} 
          icon={Coins} 
          colorClass="bg-yellow-200"
          action={
              <button 
                onClick={() => setShowSubscription(true)}
                className="w-full text-xs font-bold uppercase bg-black text-white py-2 hover:bg-stone-800 flex items-center justify-center"
              >
                  <Plus className="h-3 w-3 mr-1" /> Add Credits
              </button>
          }
        />
        <StatCard 
          title="Total Transmissions" 
          value={totalCalls} 
          icon={Phone} 
          colorClass="bg-blue-200"
        />
        <StatCard 
          title="Qualified Leads" 
          value={qualifiedLeads} 
          icon={CheckCircle} 
          colorClass="bg-green-200"
        />
        <StatCard 
          title="Deployed Agents" 
          value={agents.length} 
          icon={Users} 
          colorClass="bg-purple-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-black uppercase tracking-wider border-b-2 border-black pb-1">Traffic Analysis</h2>
          </div>
          <div className="h-80 font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#000" strokeWidth={1} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#000', fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} tick={{ fill: '#000', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '0', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                  cursor={{ fill: '#f5f5f4' }}
                />
                <Bar dataKey="calls" name="Calls" fill="#000" radius={[0, 0, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[450px]">
          <h2 className="text-lg font-bold text-black uppercase tracking-wider border-b-2 border-black pb-1 mb-4">Terminal Log</h2>
          <div className="space-y-0 flex-1 overflow-y-auto pr-2 bg-stone-100 border-2 border-black p-4 font-mono text-xs">
            {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400">
                    <span className="mb-2">_NO_DATA_</span>
                    <span>Waiting for input...</span>
                </div>
            ) : (
                logs.slice().reverse().map((log, _idx) => (
                <div key={log.id} className="mb-3 pb-3 border-b border-stone-300 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-black">{log.time || log.timestamp}</span>
                        <span className={`px-1 py-0.5 text-[10px] border border-black uppercase font-bold ${
                           log.status?.includes('Outbound') ? 'bg-blue-200 text-black' : 
                           log.status === 'Qualified Lead' ? 'bg-green-200 text-black' : 
                           log.status === 'No Answer' ? 'bg-red-200 text-black' : 'bg-white text-black'
                        }`}>
                            {log.status || log.action || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex items-center text-stone-600">
                        <span className="mr-2">{'>'}</span>
                        <span>{log.phone}</span>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;