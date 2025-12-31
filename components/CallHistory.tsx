import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Phone, Clock, FileText, PlayCircle, Download, Filter, Search, Calendar, TrendingUp, AlertCircle, CheckCircle, XCircle, Terminal } from 'lucide-react';
import { CallHistoryRecord } from '../types';
import { getRecordingUrl, downloadRecording } from '../services/recordingService';

const CallHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [calls, setCalls] = useState<CallHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<CallHistoryRecord | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    console.log('Subscribing to call_history for user:', currentUser.uid);

    const callsQuery = query(
      collection(db, 'call_history'),
      where('userId', '==', currentUser.uid)
    );

    // Real-time listener so UI updates immediately when new calls are saved
    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      const callRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CallHistoryRecord[];
      callRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log(`Loaded ${callRecords.length} call records from snapshot`);
      setCalls(callRecords);
      setLoading(false);
    }, (err) => {
      console.error('Call history snapshot error:', err);
      setLoading(false);
    });

    return () => {
      console.log('Unsubscribing from call_history listener');
      unsubscribe();
    };
  }, [currentUser]);

  const loadCallHistory = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Manual refresh fallback (uses storage wrapper)
      const calls = await import('../services/storageService').then(m => m.storage.getCallHistory(currentUser.uid));
      console.log(`Manual refresh loaded ${calls.length} calls`);
      setCalls(calls);
    } catch (error) {
      console.error('Error loading call history (manual):', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = (call: CallHistoryRecord) => {
    if (call.callSid) {
      const recordingUrl = getRecordingUrl(call.callSid);
      window.open(recordingUrl, '_blank');
    } else {
      alert('Recording not available for this call.');
    }
  };

  const handleDownloadRecording = (call: CallHistoryRecord) => {
    if (call.callSid) {
      downloadRecording(
        call.callSid,
        `recording_${call.agentName}_${call.leadPhone}_${new Date(call.timestamp).toISOString().split('T')[0]}.mp3`
      );
    } else {
      alert('Recording not available for this call.');
    }
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = 
      call.leadPhone.includes(searchTerm) ||
      call.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.agentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || call.status === filterStatus;
    const matchesType = filterType === 'all' || call.callType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'In Progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-600';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-600';
      case 'No Answer':
      case 'Voicemail':
        return 'bg-orange-100 text-orange-800 border-orange-600';
      case 'Busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-600';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-600';
    }
  };

  const downloadTranscript = (call: CallHistoryRecord) => {
    const transcriptText = call.transcript
      ?.map(msg => `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n\n');
    
    const fullReport = `
==============================================
CALL REPORT
==============================================

Call ID: ${call.id}
Agent: ${call.agentName}
Customer: ${call.leadName || 'Unknown'} (${call.leadPhone})
Type: ${call.callType}
Campaign: ${call.campaignName || 'N/A'}
Status: ${call.status}
Duration: ${formatDuration(call.duration)}
Date: ${formatTimestamp(call.timestamp)}
Sentiment: ${call.sentiment || 'N/A'}
Outcome: ${call.outcome || 'N/A'}

==============================================
AGENT SCRIPT USED
==============================================

OPENING:
${call.script.opening}

OBJECTION HANDLING:
${call.script.objectionHandling}

CLOSING:
${call.script.closing}

==============================================
CALL TRANSCRIPT
==============================================

${transcriptText || 'No transcript available'}

==============================================
NOTES
==============================================
${call.notes || 'No additional notes'}

==============================================
METADATA
==============================================
AI Model: ${call.aiModel || 'N/A'}
Twilio Call SID: ${call.callSid || 'N/A'}
Recording URL: ${call.recordingUrl || 'Not available'}
    `.trim();
    
    const blob = new Blob([fullReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-report-${call.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-black font-bold uppercase">Loading Call History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">CALL HISTORY</h1>
              <p className="text-stone-600 font-bold uppercase text-sm">Complete Call Records & Transcripts</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-black">{calls.length}</div>
            <div className="text-xs text-stone-600 font-bold uppercase">Total Calls</div>
            <button
              onClick={loadCallHistory}
              className="mt-2 text-xs px-3 py-1 border-2 border-black bg-white font-bold uppercase hover:bg-stone-100 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-black">
              {calls.filter(c => c.status === 'Completed').length}
            </span>
          </div>
          <p className="text-xs font-bold uppercase text-stone-600 mt-2">Completed</p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <AlertCircle className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-black">
              {calls.filter(c => c.status === 'No Answer' || c.status === 'Voicemail').length}
            </span>
          </div>
          <p className="text-xs font-bold uppercase text-stone-600 mt-2">No Answer</p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-black">
              {calls.filter(c => c.callType === 'Campaign').length}
            </span>
          </div>
          <p className="text-xs font-bold uppercase text-stone-600 mt-2">Campaign</p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <Phone className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-black">
              {calls.filter(c => c.callType === 'Manual').length}
            </span>
          </div>
          <p className="text-xs font-bold uppercase text-stone-600 mt-2">Manual</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by phone, name, agent..."
              className="w-full pl-10 pr-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none font-mono text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <select
              className="w-full pl-10 pr-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none font-bold text-sm uppercase appearance-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
              <option value="No Answer">No Answer</option>
              <option value="Voicemail">Voicemail</option>
              <option value="Busy">Busy</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <select
              className="w-full pl-10 pr-4 py-3 border-2 border-black bg-stone-50 focus:bg-white focus:outline-none font-bold text-sm uppercase appearance-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Campaign">Campaign</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Call List */}
      {filteredCalls.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <Phone className="h-16 w-16 mx-auto text-stone-400 mb-4" />
          <h3 className="text-xl font-black uppercase text-black mb-2">No Calls Found</h3>
          <p className="text-stone-600 font-mono text-sm">
            {calls.length === 0 
              ? 'Start making calls to see your call history here'
              : 'No calls match your current filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map((call) => (
            <div
              key={call.id}
              className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer"
              onClick={() => setSelectedCall(call)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(call.status)}
                    <div>
                      <h3 className="font-black text-lg uppercase text-black">
                        {call.leadName || 'Unknown'} - {call.leadPhone}
                      </h3>
                      <p className="text-xs text-stone-600 font-mono">
                        Agent: {call.agentName} • {call.callType}
                        {call.campaignName && ` • Campaign: ${call.campaignName}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs font-mono text-stone-600 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTimestamp(call.timestamp)}
                    </span>
                    {call.sentiment && (
                      <span className={`px-2 py-1 border text-[10px] font-bold uppercase ${
                        call.sentiment === 'Positive' ? 'bg-green-100 border-green-600 text-green-800' :
                        call.sentiment === 'Negative' ? 'bg-red-100 border-red-600 text-red-800' :
                        'bg-gray-100 border-gray-600 text-gray-800'
                      }`}>
                        {call.sentiment}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 border-2 text-xs font-bold uppercase ${getStatusColor(call.status)}`}>
                    {call.status}
                  </span>
                  <div className="flex gap-2">
                    {call.callSid && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayRecording(call);
                          }}
                          className="p-2 bg-blue-600 border-2 border-black text-white hover:bg-blue-700 transition-colors"
                          title="Play Recording"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadRecording(call);
                          }}
                          className="p-2 bg-purple-600 border-2 border-black text-white hover:bg-purple-700 transition-colors"
                          title="Download Recording"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTranscript(call);
                      }}
                      className="p-2 bg-black border-2 border-black text-white hover:bg-stone-800 transition-colors"
                      title="Download Report"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <h2 className="text-xl font-black uppercase">Call Details</h2>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-2 hover:bg-white hover:text-black transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-black p-3 bg-stone-50">
                  <p className="text-xs font-bold uppercase text-stone-600 mb-1">Customer</p>
                  <p className="font-black text-lg">{selectedCall.leadName || 'Unknown'}</p>
                  <p className="font-mono text-sm text-stone-600">{selectedCall.leadPhone}</p>
                </div>
                <div className="border-2 border-black p-3 bg-stone-50">
                  <p className="text-xs font-bold uppercase text-stone-600 mb-1">Agent</p>
                  <p className="font-black text-lg">{selectedCall.agentName}</p>
                  <p className="font-mono text-sm text-stone-600">{selectedCall.callType}</p>
                </div>
                <div className="border-2 border-black p-3 bg-stone-50">
                  <p className="text-xs font-bold uppercase text-stone-600 mb-1">Duration</p>
                  <p className="font-black text-lg">{formatDuration(selectedCall.duration)}</p>
                </div>
                <div className="border-2 border-black p-3 bg-stone-50">
                  <p className="text-xs font-bold uppercase text-stone-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 border-2 text-xs font-bold uppercase ${getStatusColor(selectedCall.status)}`}>
                    {selectedCall.status}
                  </span>
                </div>
              </div>

              {/* Script Used */}
              <div className="border-2 border-black p-4 bg-stone-50">
                <h3 className="font-black uppercase text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Script Used
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-stone-600 mb-1">Opening:</p>
                    <p className="text-sm font-mono">{selectedCall.script.opening}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-stone-600 mb-1">Objection Handling:</p>
                    <p className="text-sm font-mono">{selectedCall.script.objectionHandling}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-stone-600 mb-1">Closing:</p>
                    <p className="text-sm font-mono">{selectedCall.script.closing}</p>
                  </div>
                </div>
              </div>

              {/* Transcript */}
              {selectedCall.transcript && selectedCall.transcript.length > 0 && (
                <div className="border-2 border-black p-4 bg-black text-green-400">
                  <h3 className="font-black uppercase text-sm mb-3 flex items-center gap-2 text-white">
                    <Terminal className="h-4 w-4" />
                    Call Transcript
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                    {selectedCall.transcript.map((msg, idx) => (
                      <div key={idx} className={msg.role === 'agent' ? 'text-blue-400' : 'text-green-400'}>
                        <span className="text-stone-400">[{new Date(msg.timestamp).toLocaleTimeString()}]</span>
                        <span className="font-bold uppercase"> {msg.role}:</span> {msg.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedCall.sentiment && (
                  <div className="border-2 border-black p-3 bg-stone-50">
                    <p className="text-xs font-bold uppercase text-stone-600 mb-1">Sentiment</p>
                    <span className={`inline-block px-3 py-1 border text-xs font-bold uppercase ${
                      selectedCall.sentiment === 'Positive' ? 'bg-green-100 border-green-600 text-green-800' :
                      selectedCall.sentiment === 'Negative' ? 'bg-red-100 border-red-600 text-red-800' :
                      'bg-gray-100 border-gray-600 text-gray-800'
                    }`}>
                      {selectedCall.sentiment}
                    </span>
                  </div>
                )}
                {selectedCall.outcome && (
                  <div className="border-2 border-black p-3 bg-stone-50">
                    <p className="text-xs font-bold uppercase text-stone-600 mb-1">Outcome</p>
                    <p className="font-mono text-sm">{selectedCall.outcome}</p>
                  </div>
                )}
              </div>

              {selectedCall.notes && (
                <div className="border-2 border-black p-4 bg-stone-50">
                  <p className="text-xs font-bold uppercase text-stone-600 mb-2">Notes</p>
                  <p className="font-mono text-sm">{selectedCall.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t-4 border-black p-4 bg-stone-100 flex gap-3">
              {selectedCall.callSid && (
                <>
                  <button
                    onClick={() => handlePlayRecording(selectedCall)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white border-2 border-black font-bold uppercase hover:bg-blue-700 transition-colors"
                  >
                    <PlayCircle className="h-5 w-5" />
                    Play Recording
                  </button>
                  <button
                    onClick={() => handleDownloadRecording(selectedCall)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white border-2 border-black font-bold uppercase hover:bg-purple-700 transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Download Recording
                  </button>
                </>
              )}
              <button
                onClick={() => downloadTranscript(selectedCall)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white border-2 border-black font-bold uppercase hover:bg-stone-800 transition-colors"
              >
                <FileText className="h-5 w-5" />
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallHistory;
