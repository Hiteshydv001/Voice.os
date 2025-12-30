import { useState, useEffect, useRef } from 'react';
import { Calendar, User, Mail, Clock, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';

interface ScheduledDemo {
  id: string;
  customer_name?: string;
  preferred_time: string;
  email?: string;
  phone?: string;
  scheduled_at: string;
  status: 'pending' | 'completed' | 'cancelled';
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

export default function DemoSchedule() {
  const [demos, setDemos] = useState<ScheduledDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const demosRef = useRef<ScheduledDemo[]>([]);

  const fetchDemos = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/demos`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();

      // Only update if data has changed (prevent unnecessary re-renders)
      const newDemos = data.demos || [];
      if (JSON.stringify(newDemos) !== JSON.stringify(demosRef.current)) {
        demosRef.current = newDemos;
        setDemos(newDemos);
      }
    } catch (error) {
      console.error('Failed to fetch demos:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos(true); // Show loader on initial fetch

    // Refresh every 10 seconds (without showing loader)
    const interval = setInterval(() => fetchDemos(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const updateDemoStatus = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/demos/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchDemos(false); // Don't show loader on update
      }
    } catch (error) {
      console.error('Failed to update demo:', error);
    }
  };

  const deleteDemo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this demo?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/demos/${id}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      if (response.ok) {
        fetchDemos(false); // Don't show loader on delete
      }
    } catch (error) {
      console.error('Failed to delete demo:', error);
    }
  };

  const filteredDemos = demos.filter(demo => 
    filter === 'all' || demo.status === filter
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-orange-100 text-orange-900',
      completed: 'bg-green-100 text-green-900',
      cancelled: 'bg-red-100 text-red-900',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-stone-100 p-3 sm:p-4 md:p-6 lg:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black uppercase mb-2 flex items-center">
              <Calendar className="h-8 w-8 mr-3" />
              Demo Schedule
            </h1>
            <p className="text-stone-600 text-sm sm:text-base uppercase font-bold">
              Manage all scheduled product demos
            </p>
          </div>

          <button
            onClick={() => fetchDemos(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-black text-white px-4 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-bold uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs uppercase font-bold text-stone-500 tracking-widest">Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-black mt-1">{demos.length}</p>
              </div>
              <div className="p-2 sm:p-3 border-2 border-black bg-stone-200">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs uppercase font-bold text-stone-500 tracking-widest">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                  {demos.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 border-2 border-black bg-orange-200">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs uppercase font-bold text-stone-500 tracking-widest">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                  {demos.filter(d => d.status === 'completed').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 border-2 border-black bg-green-200">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs uppercase font-bold text-stone-500 tracking-widest">Cancelled</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1">
                  {demos.filter(d => d.status === 'cancelled').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 border-2 border-black bg-red-200">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'pending', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 border-2 border-black font-bold uppercase text-sm transition-all ${
                filter === status
                  ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Demos List */}
        {loading ? (
          <div className="text-center py-12 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <RefreshCw className="animate-spin mx-auto mb-4 text-black" size={48} />
            <p className="text-stone-600 uppercase font-bold">Loading demos...</p>
          </div>
        ) : filteredDemos.length === 0 ? (
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
            <Calendar className="mx-auto mb-4 text-stone-400" size={64} />
            <p className="text-black text-lg mb-2 font-bold uppercase">No demos scheduled</p>
            <p className="text-stone-500 text-sm uppercase">
              {filter === 'all' 
                ? 'Demos will appear here when James schedules them during calls'
                : `No ${filter} demos found`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredDemos.map((demo) => (
              <div
                key={demo.id}
                className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-6 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 border-2 border-black text-xs font-bold uppercase ${getStatusBadge(demo.status)}`}>
                        {demo.status}
                      </span>
                      <span className="text-stone-400 text-xs font-mono border border-stone-300 px-2 py-1">{demo.id}</span>
                    </div>

                    {/* Demo Details */}
                    <div className="space-y-2">
                      {demo.customer_name && (
                        <div className="flex items-center gap-2 text-black">
                          <User size={16} className="text-black shrink-0" />
                          <span className="text-sm sm:text-base font-bold">{demo.customer_name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-black">
                        <Clock size={16} className="text-black shrink-0" />
                        <span className="text-sm sm:text-base font-bold">{demo.preferred_time}</span>
                      </div>

                      {demo.email && (
                        <div className="flex items-center gap-2 text-black">
                          <Mail size={16} className="text-black shrink-0" />
                          <span className="text-sm sm:text-base">{demo.email}</span>
                        </div>
                      )}

                      <div className="text-xs text-stone-500 uppercase font-bold pt-2 border-t border-stone-200">
                        Scheduled: {new Date(demo.scheduled_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {demo.status === 'pending' && (
                    <div className="flex flex-row sm:flex-col gap-2">
                      <button
                        onClick={() => updateDemoStatus(demo.id, 'completed')}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm font-bold uppercase"
                      >
                        <CheckCircle size={16} />
                        <span className="hidden sm:inline">Complete</span>
                      </button>

                      <button
                        onClick={() => updateDemoStatus(demo.id, 'cancelled')}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm font-bold uppercase"
                      >
                        <XCircle size={16} />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>

                      <button
                        onClick={() => deleteDemo(demo.id)}
                        className="flex items-center justify-center gap-2 bg-white text-black px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm font-bold uppercase"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                  {demo.status !== 'pending' && (
                    <button
                      onClick={() => deleteDemo(demo.id)}
                      className="flex items-center justify-center gap-2 bg-white text-black px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm font-bold uppercase"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
