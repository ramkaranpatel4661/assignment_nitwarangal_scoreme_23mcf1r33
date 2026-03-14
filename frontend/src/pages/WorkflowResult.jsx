import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function WorkflowResult() {
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('lastResult');
    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, []);

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease]">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Workflow Result
        </h1>
        <div className="card text-center py-12 space-y-4">
          <p className="text-6xl">📋</p>
          <p className="text-surface-400">No result to display. Submit a workflow request first.</p>
          <button onClick={() => navigate('/submit')} className="btn-primary">
            Submit Request
          </button>
        </div>
      </div>
    );
  }

  const decisionConfig = {
    APPROVE: { bg: 'from-emerald-600/20 to-emerald-500/5', border: 'border-emerald-500/30', icon: '✅', text: 'text-emerald-400', label: 'Approved' },
    REJECT: { bg: 'from-red-600/20 to-red-500/5', border: 'border-red-500/30', icon: '❌', text: 'text-red-400', label: 'Rejected' },
    MANUAL_REVIEW: { bg: 'from-amber-600/20 to-amber-500/5', border: 'border-amber-500/30', icon: '⚠️', text: 'text-amber-400', label: 'Manual Review' },
  };

  const cfg = decisionConfig[result.decision] || decisionConfig.MANUAL_REVIEW;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease]">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
        Workflow Result
      </h1>

      {/* Decision Hero */}
      <div className={`card bg-gradient-to-br ${cfg.bg} border ${cfg.border}`}>
        <div className="text-center py-6 space-y-3">
          <p className="text-5xl">{cfg.icon}</p>
          <h2 className={`text-3xl font-bold ${cfg.text}`}>{cfg.label}</h2>
          <p className="text-surface-400 text-sm">{result.message}</p>
        </div>
      </div>

      {/* Details */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><span>📄</span> Request Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Request ID', value: result.request_id },
            { label: 'Status', value: result.status },
            { label: 'Decision', value: result.decision || '—' },
            { label: 'Retry Count', value: result.retry_count },
            { label: 'Created', value: result.created_at ? new Date(result.created_at).toLocaleString() : '—' },
          ].map((item, i) => (
            <div key={i} className={`py-2 ${i === 4 ? 'col-span-2' : ''}`}>
              <p className="text-xs text-surface-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-medium mt-0.5">{String(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/submit')} className="btn-primary flex-1" id="btn-new-request">
          New Request
        </button>
        <button onClick={() => navigate(`/timeline?id=${result.request_id}`)} className="btn-secondary flex-1" id="btn-view-timeline">
          View Timeline
        </button>
      </div>
    </div>
  );
}
