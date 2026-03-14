const API_BASE = '/api';

export async function processWorkflow(data) {
  const res = await fetch(`${API_BASE}/workflow/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAuditLogs(requestId = null, limit = 100, offset = 0) {
  const params = new URLSearchParams();
  if (requestId) params.append('request_id', requestId);
  params.append('limit', limit);
  params.append('offset', offset);
  const res = await fetch(`${API_BASE}/workflow/audit?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getRequestDetail(requestId) {
  const res = await fetch(`${API_BASE}/workflow/request/${requestId}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
