import { useState, useEffect } from 'react';
import { healthCheck, getAuditLogs } from '../api';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState({ total: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, logs] = await Promise.all([
          healthCheck().catch(() => null),
          getAuditLogs(null, 10, 0).catch(() => ({ total: 0, logs: [] })),
        ]);
        setHealth(h);

        // Derive stats from audit logs
        const decisions = {};
        logs.logs.forEach(l => {
          if (l.decision) decisions[l.decision] = (decisions[l.decision] || 0) + 1;
        });
        setStats({ total: logs.total, decisions, recent: logs.logs.slice(0, 5) });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: 'System Status', value: health?.status === 'healthy' ? 'Healthy' : 'Offline', color: health?.status === 'healthy' ? 'emerald' : 'red', icon: '💚' },
    { label: 'Database', value: health?.database || '—', color: 'sky', icon: '🗄️' },
    { label: 'API Version', value: health?.version || '—', color: 'violet', icon: '🔧' },
    { label: 'Total Audit Events', value: stats.total, color: 'amber', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease]">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-surface-400 mt-1">System overview and recent activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="card-hover group cursor-default">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`w-2.5 h-2.5 rounded-full bg-${s.color}-400 shadow-lg shadow-${s.color}-400/50 animate-pulse`} />
            </div>
            <p className="text-surface-400 text-xs font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold mt-1 capitalize">{String(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚡</span> Recent Activity
        </h2>
        {stats.recent.length === 0 ? (
          <p className="text-surface-500 text-sm py-4 text-center">No activity yet. Submit a workflow request to get started.</p>
        ) : (
          <div className="space-y-3">
            {stats.recent.map((log, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-800/40 hover:bg-surface-800/70 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center text-sm">
                    {log.stage === 'decision' ? '⚖️' : log.stage === 'validation' ? '✅' : '📝'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.request_id}</p>
                    <p className="text-xs text-surface-500">{log.stage} — {log.message?.slice(0, 50)}</p>
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
