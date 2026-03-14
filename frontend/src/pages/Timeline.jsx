import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRequestDetail } from '../api';

const stateColors = {
  PENDING: { bg: 'bg-sky-500', ring: 'ring-sky-500/30', text: 'text-sky-400', line: 'bg-sky-500/30' },
  PROCESSING: { bg: 'bg-violet-500', ring: 'ring-violet-500/30', text: 'text-violet-400', line: 'bg-violet-500/30' },
  APPROVED: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', text: 'text-emerald-400', line: 'bg-emerald-500/30' },
  REJECTED: { bg: 'bg-red-500', ring: 'ring-red-500/30', text: 'text-red-400', line: 'bg-red-500/30' },
  MANUAL_REVIEW: { bg: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-400', line: 'bg-amber-500/30' },
  RETRY: { bg: 'bg-orange-500', ring: 'ring-orange-500/30', text: 'text-orange-400', line: 'bg-orange-500/30' },
};

export default function Timeline() {
  const [searchParams] = useSearchParams();
  const [requestId, setRequestId] = useState(searchParams.get('id') || '');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRequestDetail(id);
      if (!data) {
        setError('Request not found');
        setDetail(null);
      } else {
        setDetail(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) fetchDetail(requestId);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDetail(requestId);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease]">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Status Timeline
        </h1>
        <p className="text-surface-400 mt-1">Visualize the complete state lifecycle of a request</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          placeholder="Enter Request ID..."
          className="input-field flex-1"
          id="timeline-search"
        />
        <button type="submit" className="btn-primary" id="btn-timeline-search">Track</button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card bg-red-500/5 border-red-500/20 text-center py-8">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {detail && !loading && (
        <>
          {/* Request Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><span>👤</span> Request Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { l: 'Applicant', v: detail.applicant_name },
                { l: 'Income', v: `$${detail.income.toLocaleString()}` },
                { l: 'Credit Score', v: detail.credit_score },
                { l: 'Docs Verified', v: detail.documents_verified ? '✅ Yes' : '❌ No' },
                { l: 'Current Status', v: detail.status },
                { l: 'Retries', v: detail.retry_count },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">{item.l}</p>
                  <p className="text-sm font-medium mt-0.5">{String(item.v)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><span>⏱️</span> State Timeline</h3>
            <div className="relative pl-8">
              {detail.state_history.map((entry, i) => {
                const color = stateColors[entry.to_state] || stateColors.PENDING;
                const isLast = i === detail.state_history.length - 1;
                return (
                  <div key={i} className="relative pb-8 last:pb-0">
                    {/* Vertical line */}
                    {!isLast && (
                      <div className={`absolute left-[-20px] top-6 w-0.5 h-full ${color.line}`} />
                    )}
                    {/* Dot */}
                    <div className={`absolute left-[-24px] top-1.5 w-3 h-3 rounded-full ${color.bg} ring-4 ${color.ring}`} />
                    {/* Content */}
                    <div className="bg-surface-800/40 rounded-xl p-4 hover:bg-surface-800/60 transition-all ml-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {entry.from_state && (
                            <>
                              <span className={`badge ${stateColors[entry.from_state]?.text || 'text-surface-400'} text-xs bg-surface-800`}>
                                {entry.from_state}
                              </span>
                              <span className="text-surface-600">→</span>
                            </>
                          )}
                          <span className={`font-semibold ${color.text}`}>{entry.to_state}</span>
                        </div>
                        <span className="text-xs text-surface-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!detail && !loading && !error && (
        <div className="card text-center py-12 space-y-3">
          <p className="text-5xl">⏱️</p>
          <p className="text-surface-400">Enter a Request ID to view its state timeline</p>
        </div>
      )}
    </div>
  );
}
