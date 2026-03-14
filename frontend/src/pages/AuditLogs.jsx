import { useState, useEffect } from 'react';
import { getAuditLogs } from '../api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(filter || null, pageSize, page * pageSize);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Audit Logs
        </h1>
        <p className="text-surface-400 mt-1">Complete audit trail of all workflow actions</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by Request ID..."
          className="input-field flex-1"
          id="audit-filter"
        />
        <button type="submit" className="btn-primary" id="btn-audit-search">Search</button>
        {filter && (
          <button type="button" onClick={() => { setFilter(''); setPage(0); setTimeout(fetchLogs, 0); }} className="btn-secondary" id="btn-audit-clear">
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700/50">
                {['ID', 'Request ID', 'Stage', 'Decision', 'Message', 'Timestamp'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-surface-500">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-surface-500">No audit logs found.</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 text-surface-500 font-mono text-xs">{log.id}</td>
                    <td className="px-4 py-3 font-medium">{log.request_id}</td>
                    <td className="px-4 py-3">
                      <span className="badge-pending">{log.stage || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.decision ? (
                        <span className={
                          log.decision === 'APPROVE' ? 'badge-approve' :
                          log.decision === 'REJECT' ? 'badge-reject' : 'badge-review'
                        }>{log.decision}</span>
                      ) : <span className="text-surface-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-surface-400 max-w-xs truncate">{log.message || '—'}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">{total} total entries</p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-30">
              ← Prev
            </button>
            <span className="text-sm text-surface-400 flex items-center px-2">
              {page + 1} / {totalPages}
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-30">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
