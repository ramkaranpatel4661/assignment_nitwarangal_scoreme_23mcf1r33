import { useState, useEffect } from 'react';
import { healthCheck, getWorkflowStats, getAuditLogs } from '../api';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, s, logs] = await Promise.all([
          healthCheck().catch(() => null),
          getWorkflowStats().catch(() => null),
          getAuditLogs(null, 5, 0).catch(() => ({ logs: [] })),
        ]);
        setHealth(h);
        setStats(s);
        setRecent(logs.logs || []);
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
    { label: 'System Status', value: health?.status === 'healthy' ? 'Healthy' : 'Offline', icon: '💚', color: 'emerald' },
    { label: 'Database', value: health?.database || '—', icon: '🗄️', color: 'sky' },
    { label: 'API Version', value: health?.version || '—', icon: '🔧', color: 'violet' },
  ];

  const statCards = [
    { label: 'Total Requests', value: stats?.total_requests ?? 0, icon: '📊', color: 'primary' },
    { label: 'Approved', value: stats?.approved ?? 0, icon: '✅', color: 'emerald' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: '❌', color: 'red' },
    { label: 'Manual Review', value: stats?.manual_review ?? 0, icon: '⚠️', color: 'amber' },
    { label: 'Retry', value: stats?.retry ?? 0, icon: '🔄', color: 'orange' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: '⏳', color: 'sky' },
  ];

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease]">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-surface-400 mt-1">System overview and workflow statistics</p>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {systemCards.map((s, i) => (
            <div key={i} className="card-hover group cursor-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" style={{boxShadow: '0 0 8px rgba(52,211,153,0.5)'}} />
              </div>
              <p className="text-surface-400 text-xs font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold mt-1 capitalize">{String(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Stats */}
      <div>
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">Workflow Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s, i) => (
            <div key={i} className="card-hover cursor-default text-center">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-3xl font-bold mt-2">{s.value}</p>
              <p className="text-surface-400 text-xs font-medium mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚡</span> Recent Activity
        </h2>
        {recent.length === 0 ? (
          <p className="text-surface-500 text-sm py-4 text-center">No activity yet. Submit a workflow request to get started.</p>
        ) : (
          <div className="space-y-3">
            {recent.map((log, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-surface-800 transition-all" style={{background: 'rgba(30,41,59,0.4)'}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{background: 'rgba(99,102,241,0.2)'}}>
                    {log.stage === 'decision' ? '⚖️' : log.stage === 'validation' ? '✅' : log.stage === 'rule_evaluation' ? '📏' : '📝'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.request_id}</p>
                    <p className="text-xs text-surface-500">{log.stage} — {(log.message || '').slice(0, 50)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {log.decision && (
                    <span className={
                      log.decision === 'APPROVE' ? 'badge-approve' :
                      log.decision === 'REJECT' ? 'badge-reject' : 'badge-review'
                    }>{log.decision}</span>
                  )}
                  <span className="text-xs text-surface-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
