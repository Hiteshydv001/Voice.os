import React, { useState } from 'react';
import { Play, Phone, BarChart2, CheckCircle, Database, Upload } from 'lucide-react';
import { Agent, Campaign, Lead } from '../types';

interface CampaignManagerProps {
  agents: Agent[];
  campaigns: Campaign[];
  leads: Lead[];
  onCreateCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ agents, campaigns, leads, onCreateCampaign, onDeleteCampaign }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', agentId: '' });
  const [selectedReport, setSelectedReport] = useState<Campaign | null>(null);
  const [selectedDataCampaign, setSelectedDataCampaign] = useState<Campaign | null>(null);
  const [uploadedLeads, setUploadedLeads] = useState<Lead[]>([]);

  // Check for pre-selected leads from LeadsManager
  const selectedLeadIds = React.useMemo(() => {
    const stored = sessionStorage.getItem('selectedLeads');
    if (stored) {
      sessionStorage.removeItem('selectedLeads'); // Clear after reading
      return JSON.parse(stored) as string[];
    }
    return [];
  }, []);

  // Calculate available leads - allow calling ANY lead, not just 'New' ones
  const availableLeadsCount = uploadedLeads.length > 0
    ? uploadedLeads.length
    : selectedLeadIds.length > 0 
    ? selectedLeadIds.length 
    : leads.length; // Changed: removed status filter to allow re-calling leads

  // Auto-open create dialog if leads were selected
  React.useEffect(() => {
    if (selectedLeadIds.length > 0) {
      setShowCreate(true);
    }
  }, [selectedLeadIds.length]);

  // CSV Import Handler
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newLeads: Lead[] = [];
        
        const firstLine = lines[0]?.toLowerCase() || '';
        const hasHeader = firstLine.includes('name') || firstLine.includes('phone') || firstLine.includes('city');
        const startIdx = hasHeader ? 1 : 0;
        
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
          const p0 = parts[0];

          if (parts.length === 1 && p0) {
            if (p0.replace(/\D/g, '').length > 3) {
              newLeads.push({
                id: `campaign_${Date.now()}_${i}`,
                name: `${file.name.replace(/\.[^/.]+$/, '')} ${p0}`,
                phone: p0,
                city: 'Unknown',
                status: 'New',
                score: 0
              });
            }
          } else if (parts.length >= 2) {
            newLeads.push({
              id: `campaign_${Date.now()}_${i}`,
              name: p0 || 'Unknown',
              phone: parts[1] || 'Unknown',
              city: parts[2] || 'Unknown',
              status: 'New',
              score: 0
            });
          }
        }
        
        setUploadedLeads(newLeads);
      } catch (err) {
        alert('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleStart = () => {
    if (!newCampaign.name || !newCampaign.agentId) return;
    
    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      agentId: newCampaign.agentId,
      status: 'Active',
      leadsCount: availableLeadsCount, 
      callsMade: 0,
      progress: 0
    };
    onCreateCampaign(campaign);
    setShowCreate(false);
    setNewCampaign({ name: '', agentId: '' });
  };

  // Check if Twilio is configured via backend
  const [isTwilioConfigured, setIsTwilioConfigured] = React.useState(false);
  const [twilioPhoneNumber, setTwilioPhoneNumber] = React.useState('');

  React.useEffect(() => {
    const checkTwilio = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';
        const response = await fetch(`${backendUrl}/api/twilio`);
        const { credentialsSet } = await response.json();
        setIsTwilioConfigured(credentialsSet);
        
        if (credentialsSet) {
          // Get phone numbers from backend
          const numbersResponse = await fetch(`${backendUrl}/api/twilio/numbers`);
          const { numbers } = await numbersResponse.json();
          if (numbers && numbers.length > 0) {
            setTwilioPhoneNumber(numbers[0].phoneNumber);
          }
        }
      } catch (error) {
        console.warn('Could not check Twilio configuration', error);
        setIsTwilioConfigured(false);
      }
    };
    checkTwilio();
  }, []);

  return (
    <div className="space-y-6 font-mono">
      {/* Mode Status Banner */}
      <div className={`border-2 p-4 flex items-start gap-3 ${
        isTwilioConfigured 
          ? 'bg-green-100 border-green-600' 
          : 'bg-blue-100 border-blue-600'
      }`}>
        <CheckCircle className={`h-5 w-5 shrink-0 mt-0.5 ${
          isTwilioConfigured ? 'text-green-600' : 'text-blue-600'
        }`} />
        <div className="flex-1">
          {isTwilioConfigured ? (
            <>
              <p className="text-sm font-bold text-green-900 uppercase">🔊 Real Twilio Calls Enabled</p>
              <p className="text-xs text-green-800 mt-1">
                Campaigns will make actual phone calls using Twilio. {twilioPhoneNumber && `Phone: ${twilioPhoneNumber}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-blue-900 uppercase">Demo Mode Active</p>
              <p className="text-xs text-blue-800 mt-1">
                Campaigns are running in simulation mode. Calls are simulated with 80% success rate. 
                To enable real Twilio calls, add your credentials to the .env file.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black text-black uppercase">Campaign Ops</h1>
          <p className="text-stone-600 mt-1">Orchestrate outbound maneuvers.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="px-6 py-3 bg-orange-600 text-white border-2 border-black font-bold uppercase hover:bg-orange-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center"
        >
          <Play className="h-4 w-4 mr-2" />
          INIT CAMPAIGN
        </button>
      </div>

      {showCreate && (
        <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 animate-in slide-in-from-top-4 duration-200">
          <h3 className="text-xl font-bold text-black mb-6 uppercase border-b-2 border-black pb-2">Launch Protocol</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-black uppercase mb-2">Campaign Designation</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="e.g. ALPHA_NOV_OUTREACH"
                value={newCampaign.name}
                onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-black uppercase mb-2">Assign Unit</label>
              <select 
                className="w-full px-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                value={newCampaign.agentId}
                onChange={e => setNewCampaign({...newCampaign, agentId: e.target.value})}
              >
                <option value="">-- SELECT UNIT --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CSV Import Section */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-black uppercase mb-2">Import Target List</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                id="campaign-csv-upload" 
                className="hidden" 
                accept=".csv,.txt" 
                onChange={handleImportCSV}
              />
              <label 
                htmlFor="campaign-csv-upload"
                className="cursor-pointer inline-flex items-center px-6 py-3 bg-white border-2 border-black text-black font-bold uppercase hover:bg-stone-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </label>
              {uploadedLeads.length > 0 && (
                <span className="text-sm font-bold text-green-600">
                  ✓ {uploadedLeads.length} leads uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-2 uppercase">Format: Name,Phone,City OR Phone Only</p>
          </div>

          {/* Leads Info Summary */}
          <div className={`border-2 border-black p-4 mb-6 flex items-start ${uploadedLeads.length > 0 ? 'bg-green-100' : selectedLeadIds.length > 0 ? 'bg-orange-100' : 'bg-stone-100'}`}>
             <Database className="h-5 w-5 mr-3 shrink-0" />
             <div className="flex-1">
                <p className="text-xs font-bold uppercase">Target Data</p>
                <p className="text-sm">
                    {uploadedLeads.length > 0
                    ? `✓ ${uploadedLeads.length} leads imported from CSV and ready to dial.`
                    : selectedLeadIds.length > 0 
                    ? `✓ ${selectedLeadIds.length} leads selected from database and ready to dial.` 
                    : availableLeadsCount > 0 
                    ? `Ready to dial ${availableLeadsCount} leads from database (includes all leads).` 
                    : "No leads found in database. Please upload leads first."}
                </p>
             </div>
             {uploadedLeads.length > 0 && (
               <button 
                 onClick={() => setUploadedLeads([])}
                 className="text-xs text-red-600 hover:text-red-800 font-bold uppercase ml-2"
               >
                 Clear
               </button>
             )}
          </div>

          <div className="flex justify-end space-x-4">
            <button 
              onClick={() => setShowCreate(false)}
              className="px-6 py-2 text-black font-bold uppercase border-2 border-transparent hover:border-black hover:bg-stone-100"
            >
              Abort
            </button>
            <button 
              onClick={handleStart}
              disabled={availableLeadsCount === 0}
              className="px-6 py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
            >
              Execute
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {campaigns.length === 0 && !showCreate && (
             <div className="text-center p-12 border-2 border-dashed border-black bg-stone-50 text-stone-400 font-bold uppercase">
                No active campaigns detected.
             </div>
        )}

        {campaigns.map((campaign) => {
          const agent = agents.find(a => a.id === campaign.agentId);
          return (
            <div key={campaign.id} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-black uppercase">{campaign.name}</h3>
                    <span className={`px-2 py-1 text-xs font-bold border-2 border-black uppercase 
                      ${campaign.status === 'Active' ? 'bg-green-200 text-black' : 
                        campaign.status === 'Completed' ? 'bg-stone-200 text-black' : 
                        'bg-yellow-200 text-black'}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 mt-2 font-mono">
                    UNIT: <span className="font-bold text-black uppercase">{agent?.name || 'UNKNOWN'}</span>
                    <span className="mx-2">|</span>
                    TARGETS: {campaign.leadsCount}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-3">
                  {campaign.status === 'Active' ? (
                    <button className="flex items-center px-4 py-2 border-2 border-black text-sm font-bold uppercase hover:bg-stone-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                      <Phone className="h-4 w-4 mr-2 animate-pulse text-red-600" />
                      Dialing...
                    </button>
                  ) : (
                    <button 
                      onClick={() => setSelectedReport(campaign)}
                      className="flex items-center px-4 py-2 border-2 border-black text-sm font-bold uppercase hover:bg-stone-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Report
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedDataCampaign(campaign)}
                    className="flex items-center px-4 py-2 bg-blue-100 border-2 border-black text-black text-sm font-bold uppercase hover:bg-blue-200 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Data
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) {
                        onDeleteCampaign(campaign.id);
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-red-100 border-2 border-black text-black text-sm font-bold uppercase hover:bg-red-200 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-black">Progress</span>
                  <span className="text-black">{campaign.progress}% ({campaign.callsMade}/{campaign.leadsCount})</span>
                </div>
                <div className="w-full bg-stone-200 h-4 border-2 border-black p-0.5">
                  <div 
                    className="bg-black h-full transition-all duration-1000" 
                    style={{ width: `${campaign.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-mono">
          <div className="bg-white border-4 border-black w-full max-w-2xl shadow-[12px_12px_0px_0px_rgba(255,165,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="bg-black p-4 text-white flex justify-between items-center border-b-4 border-black sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold text-xl uppercase tracking-wider">Campaign Report</h3>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-white hover:text-orange-500 transition-colors text-2xl">
                ×
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black uppercase">{selectedReport.name}</h2>
                <p className="text-sm text-stone-600 mt-2">
                  Agent: <span className="font-bold text-black">{agents.find(a => a.id === selectedReport.agentId)?.name || 'Unknown'}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-100 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Total Targets</p>
                  <p className="text-3xl font-black">{selectedReport.leadsCount}</p>
                </div>
                <div className="bg-stone-100 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Calls Made</p>
                  <p className="text-3xl font-black">{selectedReport.callsMade}</p>
                </div>
                <div className="bg-green-100 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Completion Rate</p>
                  <p className="text-3xl font-black">{selectedReport.progress}%</p>
                </div>
                <div className="bg-blue-100 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Status</p>
                  <p className="text-xl font-black uppercase">{selectedReport.status}</p>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-black p-4">
                <p className="text-xs font-bold uppercase mb-2">Performance Summary</p>
                <ul className="space-y-2 text-sm">
                  <li>• Campaign executed with {agents.find(a => a.id === selectedReport.agentId)?.name || 'Unknown'} agent</li>
                  <li>• {selectedReport.callsMade} successful connections out of {selectedReport.leadsCount} attempts</li>
                  <li>• Success rate: {selectedReport.leadsCount > 0 ? Math.round((selectedReport.callsMade / selectedReport.leadsCount) * 100) : 0}%</li>
                  <li>• Campaign status: {selectedReport.status}</li>
                </ul>
              </div>

              <button 
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Modal - Detailed Call Results */}
      {selectedDataCampaign && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-mono">
          <div className="bg-white border-4 border-black w-full max-w-4xl shadow-[12px_12px_0px_0px_rgba(0,123,255,1)] max-h-[90vh] overflow-y-auto">
            <div className="bg-black p-4 text-white flex justify-between items-center border-b-4 border-black sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-xl uppercase tracking-wider">Campaign Data</h3>
              </div>
              <button onClick={() => setSelectedDataCampaign(null)} className="text-white hover:text-blue-400 transition-colors text-2xl">
                ×
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black uppercase">{selectedDataCampaign.name}</h2>
                <p className="text-sm text-stone-600 mt-2">
                  Agent: <span className="font-bold text-black">{agents.find(a => a.id === selectedDataCampaign.agentId)?.name || 'Unknown'}</span>
                  {selectedDataCampaign.startedAt && (
                    <span className="ml-4">Started: <span className="font-bold">{new Date(selectedDataCampaign.startedAt).toLocaleString()}</span></span>
                  )}
                </p>
              </div>

              {/* Statistics Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Total Calls</p>
                  <p className="text-2xl font-black">{selectedDataCampaign.callResults?.length || selectedDataCampaign.callsMade || 0}</p>
                </div>
                <div className="bg-green-50 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Successful</p>
                  <p className="text-2xl font-black text-green-600">
                    {selectedDataCampaign.callResults?.filter(c => c.status === 'Success').length || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">No Answer</p>
                  <p className="text-2xl font-black text-yellow-600">
                    {selectedDataCampaign.callResults?.filter(c => c.status === 'No Answer').length || 0}
                  </p>
                </div>
                <div className="bg-red-50 border-2 border-black p-4">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-1">Failed</p>
                  <p className="text-2xl font-black text-red-600">
                    {selectedDataCampaign.callResults?.filter(c => c.status === 'Failed').length || 0}
                  </p>
                </div>
              </div>

              {/* Call Results Table */}
              <div className="border-2 border-black">
                <div className="bg-black text-white p-3">
                  <h4 className="font-bold uppercase text-sm">Call Details</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {selectedDataCampaign.callResults && selectedDataCampaign.callResults.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-stone-100 border-b-2 border-black sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Lead</th>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Phone</th>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Duration</th>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Sentiment</th>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {selectedDataCampaign.callResults.map((result, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="px-4 py-3 text-sm font-medium">{result.leadName}</td>
                            <td className="px-4 py-3 text-sm font-mono">{result.leadPhone}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-bold border border-black ${
                                result.status === 'Success' ? 'bg-green-200' :
                                result.status === 'Failed' ? 'bg-red-200' :
                                result.status === 'Voicemail' ? 'bg-purple-200' :
                                result.status === 'No Answer' ? 'bg-yellow-200' :
                                'bg-stone-200'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{result.duration}s</td>
                            <td className="px-4 py-3">
                              {result.sentiment && (
                                <span className={`px-2 py-1 text-xs font-bold ${
                                  result.sentiment === 'Positive' ? 'text-green-600' :
                                  result.sentiment === 'Negative' ? 'text-red-600' :
                                  'text-stone-600'
                                }`}>
                                  {result.sentiment}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-stone-500">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-stone-400">
                      <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-bold uppercase">No detailed call data available</p>
                      <p className="text-sm mt-2">This campaign was run before detailed tracking was enabled.</p>
                      <div className="mt-4 p-4 bg-stone-100 border-2 border-stone-300 text-left">
                        <p className="text-xs font-bold uppercase mb-2">Basic Stats:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Total Targets: {selectedDataCampaign.leadsCount}</li>
                          <li>• Calls Made: {selectedDataCampaign.callsMade}</li>
                          <li>• Success Rate: {selectedDataCampaign.leadsCount > 0 ? Math.round((selectedDataCampaign.callsMade / selectedDataCampaign.leadsCount) * 100) : 0}%</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setSelectedDataCampaign(null)}
                className="w-full py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Close Data View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;