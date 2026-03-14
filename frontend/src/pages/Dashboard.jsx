import { useState, useEffect } from 'react';
import { healthCheck, getWorkflowStats, getAuditLogs, getActiveRules } from '../api';
import DecisionChart from '../components/DecisionChart';
import PipelineViewer from '../components/PipelineViewer';
import RulesPanel from '../components/RulesPanel';
import SystemInfo from '../components/SystemInfo';
import ActivityFeed from '../components/ActivityFeed';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, s, logs, r] = await Promise.all([
          healthCheck().catch(() => null),
          getWorkflowStats().catch(() => null),
          getAuditLogs(null, 8, 0).catch(() => ({ logs: [] })),
          getActiveRules().catch(() => null),
        ]);
        setHealth(h);
        setStats(s);
        setRecent(logs.logs || []);
        setRules(r);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const systemCards = [
    { label: 'System Status', value: health?.status === 'healthy' ? 'Healthy' : 'Offline', icon: '💚', pulse: true },
    { label: 'Database', value: health?.database || '—', icon: '🗄️' },
    { label: 'API Version', value: health?.version || '—', icon: '🔧' },
  ];

  const statCards = [
    { label: 'Total Requests', value: stats?.total_requests ?? 0, icon: '📊', gradient: 'from-primary-600 to-violet-600' },
    { label: 'Approved', value: stats?.approved ?? 0, icon: '✅', gradient: 'from-emerald-600 to-green-600' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: '❌', gradient: 'from-red-600 to-rose-600' },
    { label: 'Manual Review', value: stats?.manual_review ?? 0, icon: '⚠️', gradient: 'from-amber-600 to-yellow-600' },
    { label: 'Retry', value: stats?.retry ?? 0, icon: '🔄', gradient: 'from-orange-600 to-amber-600' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: '⏳', gradient: 'from-sky-600 to-cyan-600' },
  ];

  // Determine completed stages from most recent audit logs
  const completedStages = [...new Set(recent.map(l => l.stage).filter(Boolean))];

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-surface-400 mt-1">System overview, workflow analytics, and configuration</p>
      </div>

      {/* Section 1: System Health */}
      <div>
        <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {systemCards.map((s, i) => (
            <div key={i} className="card-hover group cursor-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                {s.pulse && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                )}
              </div>
              <p className="text-surface-400 text-xs font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold mt-1 capitalize">{String(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Workflow Statistics */}
      <div>
        <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Workflow Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s, i) => (
            <div key={i} className="card-hover cursor-default text-center group">
              <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-base mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                {s.icon}
              </div>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="text-surface-400 text-xs font-medium mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Decision Chart + Pipeline */}
      <div>
        <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DecisionChart stats={stats} />
          <PipelineViewer completedStages={completedStages} />
        </div>
      </div>

      {/* Section 4: Recent Activity */}
      <div>
        <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Recent Activity</h2>
        <ActivityFeed logs={recent} />
      </div>

      {/* Section 5: Rules + System Info */}
      <div>
        <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Configuration & System</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RulesPanel rules={rules} />
          <SystemInfo />
        </div>
      </div>
    </div>
  );
}
