const DECISION_COLORS = {
  APPROVE: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: 'text-emerald-400', arrow: '→', icon: '✅' },
  REJECT: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: 'text-red-400', arrow: '→', icon: '❌' },
  MANUAL_REVIEW: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: 'text-amber-400', arrow: '→', icon: '⚠️' },
};

export default function RulesPanel({ rules }) {
  if (!rules || !rules.rules || rules.rules.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📐</span> Active Rules
        </h3>
        <p className="text-surface-500 text-sm text-center py-4">No rules loaded.</p>
      </div>
    );
  }

  const OPERATORS = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '==': '=', '!=': '≠' };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📐</span> Active Rules
        <span className="ml-auto text-xs font-normal text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">{rules.rules.length} rules</span>
      </h3>
      <div className="space-y-2.5">
        {rules.rules.map((rule, i) => {
          const style = DECISION_COLORS[rule.decision] || DECISION_COLORS.MANUAL_REVIEW;
          const op = OPERATORS[rule.operator] || rule.operator;
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.01]"
              style={{ background: style.bg, border: `1px solid ${style.border}` }}
            >
              <code className="text-sm font-mono text-surface-200 flex-1">
                {rule.field} {op} {String(rule.value)}
              </code>
              <span className="text-surface-500">→</span>
              <span className={`text-sm font-semibold ${style.text}`}>
                {style.icon} {rule.decision}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
