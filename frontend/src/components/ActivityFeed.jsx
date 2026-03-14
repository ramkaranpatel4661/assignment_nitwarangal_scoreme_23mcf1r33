export default function ActivityFeed({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚡</span> Recent Workflow Activity
        </h3>
        <p className="text-surface-500 text-sm py-6 text-center">No activity yet. Submit a workflow request to get started.</p>
      </div>
    );
  }

  const getStageIcon = (stage) => {
    const icons = {
      validation: '✅', document_verification: '📄', rule_evaluation: '📏',
      decision: '⚖️', audit_logging: '📝',
    };
    return icons[stage] || '📌';
  };

  const getBadgeClass = (decision) => {
    if (!decision) return '';
    if (decision === 'APPROVE') return 'badge-approve';
    if (decision === 'REJECT') return 'badge-reject';
    return 'badge-review';
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚡</span> Recent Workflow Activity
        <span className="ml-auto text-xs font-normal text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">{logs.length} events</span>
      </h3>
      <div className="space-y-2">
        {logs.map((log, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 px-4 rounded-xl transition-all hover:bg-surface-800/50"
            style={{ background: 'rgba(30,41,59,0.35)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                {getStageIcon(log.stage)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{log.request_id}</p>
                <p className="text-xs text-surface-500 truncate">
                  Stage: <span className="text-surface-400">{log.stage}</span>
                  {log.message && <> — {(log.message || '').slice(0, 40)}</>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              {log.decision && (
                <span className={getBadgeClass(log.decision)}>{log.decision}</span>
              )}
              <span className="text-xs text-surface-500 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
