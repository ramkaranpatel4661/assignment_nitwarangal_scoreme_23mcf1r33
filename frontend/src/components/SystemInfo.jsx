const INFO_ITEMS = [
  { label: 'Backend', value: 'FastAPI (Python)', icon: '⚡' },
  { label: 'Database', value: 'SQLite (WAL mode)', icon: '🗄️' },
  { label: 'Workflow Engine', value: 'Enabled (5 stages)', icon: '🔧' },
  { label: 'Retry Logic', value: 'Enabled (3 max)', icon: '🔄' },
  { label: 'Rule Engine', value: 'Configurable (JSON)', icon: '📏' },
  { label: 'Idempotency', value: 'Enabled', icon: '🔒' },
  { label: 'Audit Logging', value: 'Enabled', icon: '📝' },
  { label: 'Structured Logs', value: 'Enabled', icon: '📋' },
];

export default function SystemInfo() {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🏗️</span> System Information
      </h3>
      <div className="space-y-2">
        {INFO_ITEMS.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-800/60 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-surface-400">{item.label}</span>
            </div>
            <span className="text-sm font-medium text-surface-200">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
