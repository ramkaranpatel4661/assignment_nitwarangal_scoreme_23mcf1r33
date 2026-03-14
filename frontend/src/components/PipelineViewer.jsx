const STAGES = [
  { key: 'validation', label: 'Validation', icon: '✅' },
  { key: 'document_verification', label: 'Doc Verification', icon: '📄' },
  { key: 'rule_evaluation', label: 'Rule Evaluation', icon: '📏' },
  { key: 'decision', label: 'Decision', icon: '⚖️' },
  { key: 'audit_logging', label: 'Audit Logging', icon: '📝' },
];

export default function PipelineViewer({ completedStages = [] }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
        <span>🔗</span> Workflow Pipeline
      </h3>
      <div className="flex items-center justify-between gap-1">
        {STAGES.map((stage, i) => {
          const isCompleted = completedStages.includes(stage.key);
          const isCurrent = !isCompleted && i === completedStages.length;
          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600/20 ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-primary-600/20 ring-2 ring-primary-500 animate-pulse shadow-lg shadow-primary-500/20'
                      : 'bg-surface-800 ring-1 ring-surface-700'
                  }`}
                >
                  {isCompleted ? '✔' : stage.icon}
                </div>
                <span className={`text-xs mt-2 font-medium leading-tight ${
                  isCompleted ? 'text-emerald-400' : isCurrent ? 'text-primary-300' : 'text-surface-500'
                }`}>
                  {stage.label}
                </span>
                <span className={`text-[10px] mt-0.5 ${
                  isCompleted ? 'text-emerald-600' : isCurrent ? 'text-primary-500' : 'text-surface-600'
                }`}>
                  {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`w-6 h-0.5 shrink-0 rounded-full ${
                  isCompleted ? 'bg-emerald-500' : 'bg-surface-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
