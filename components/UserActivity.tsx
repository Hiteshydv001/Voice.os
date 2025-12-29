import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Activity, Bot, Users, PhoneOutgoing, Calendar, TrendingUp, BarChart3, Clock } from 'lucide-react';

interface ActivityStats {
  totalAgents: number;
  totalFlows: number;
  totalLeads: number;
  totalCampaigns: number;
  recentActivities: ActivityLog[];
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}

const UserActivity: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<ActivityStats>({
    totalAgents: 0,
    totalFlows: 0,
    totalLeads: 0,
    totalCampaigns: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadActivityStats();
  }, [currentUser]);

  const loadActivityStats = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);

      // Count agent flows
      const flowsQuery = query(
        collection(db, 'agent_flows'),
        where('userId', '==', currentUser.uid)
      );
      const flowsSnapshot = await getDocs(flowsQuery);
      const totalFlows = flowsSnapshot.size;

      // Count leads
      const leadsQuery = query(
        collection(db, 'leads'),
        where('userId', '==', currentUser.uid)
      );
      const leadsSnapshot = await getDocs(leadsQuery);
      const totalLeads = leadsSnapshot.size;

      // Count campaigns
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('userId', '==', currentUser.uid)
      );
      const campaignsSnapshot = await getDocs(campaignsQuery);
      const totalCampaigns = campaignsSnapshot.size;

      // Get recent activity logs
      const logsQuery = query(
        collection(db, 'activity_logs'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const recentActivities = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];

      setStats({
        totalAgents: 0, // Legacy agents not stored in Firestore
        totalFlows,
        totalLeads,
        totalCampaigns,
        recentActivities
      });
    } catch (error) {
      console.error('Error loading activity stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-black font-bold uppercase">Loading Activity Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-orange-600 flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">SYSTEM ANALYTICS</h1>
            <p className="text-stone-600 font-bold uppercase text-sm">User Activity Dashboard</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Agent Flows */}
        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <Bot className="h-8 w-8 text-orange-600" />
            <span className="text-4xl font-black text-black">{stats.totalFlows}</span>
          </div>
          <h3 className="text-xs font-bold uppercase text-stone-600 tracking-wide">Agent Flows</h3>
          <div className="mt-2 text-xs text-stone-500 font-mono">
            Total flows created
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-600" />
            <span className="text-4xl font-black text-black">{stats.totalLeads}</span>
          </div>
          <h3 className="text-xs font-bold uppercase text-stone-600 tracking-wide">Total Leads</h3>
          <div className="mt-2 text-xs text-stone-500 font-mono">
            Leads in database
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <PhoneOutgoing className="h-8 w-8 text-green-600" />
            <span className="text-4xl font-black text-black">{stats.totalCampaigns}</span>
          </div>
          <h3 className="text-xs font-bold uppercase text-stone-600 tracking-wide">Campaigns</h3>
          <div className="mt-2 text-xs text-stone-500 font-mono">
            Total campaigns run
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <span className="text-4xl font-black text-black">{stats.recentActivities.length}</span>
          </div>
          <h3 className="text-xs font-bold uppercase text-stone-600 tracking-wide">Recent Actions</h3>
          <div className="mt-2 text-xs text-stone-500 font-mono">
            Last 20 activities
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-black p-4 bg-stone-50">
            <p className="text-xs font-bold uppercase text-stone-600 mb-1">User ID</p>
            <p className="text-sm font-mono text-black break-all">{currentUser?.uid}</p>
          </div>
          <div className="border-2 border-black p-4 bg-stone-50">
            <p className="text-xs font-bold uppercase text-stone-600 mb-1">Email</p>
            <p className="text-sm font-mono text-black break-all">{currentUser?.email}</p>
          </div>
          <div className="border-2 border-black p-4 bg-stone-50">
            <p className="text-xs font-bold uppercase text-stone-600 mb-1">Account Created</p>
            <p className="text-sm font-mono text-black">
              {currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="border-2 border-black p-4 bg-stone-50">
            <p className="text-xs font-bold uppercase text-stone-600 mb-1">Last Sign In</p>
            <p className="text-sm font-mono text-black">
              {currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recent Activity Log
        </h2>
        {stats.recentActivities.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-black bg-stone-50">
            <Calendar className="h-12 w-12 mx-auto text-stone-400 mb-3" />
            <p className="text-stone-500 font-bold uppercase text-sm">No activity recorded yet</p>
            <p className="text-xs text-stone-400 mt-1 font-mono">Start using the platform to see your activity here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.recentActivities.map((activity, index) => (
              <div
                key={activity.id}
                className="border-2 border-black p-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm uppercase text-black">{activity.action}</p>
                    <p className="text-xs text-stone-600 font-mono mt-1">{activity.details}</p>
                  </div>
                  <span className="text-xs font-bold text-stone-500 ml-4 whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivity;
