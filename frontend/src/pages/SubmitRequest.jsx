import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processWorkflow } from '../api';

export default function SubmitRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    request_id: '',
    applicant_name: '',
    income: '',
    credit_score: '',
    documents_verified: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...form,
        income: parseFloat(form.income),
        credit_score: parseInt(form.credit_score, 10),
      };
      const result = await processWorkflow(payload);
      // Store result and navigate
      sessionStorage.setItem('lastResult', JSON.stringify(result));
      navigate('/result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => {
    setForm(prev => ({ ...prev, request_id: `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-[fadeIn_0.4s_ease]">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-surface-300 bg-clip-text text-transparent">
          Submit Request
        </h1>
        <p className="text-surface-400 mt-1">Submit a new workflow processing request</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Request ID */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Request ID</label>
          <div className="flex gap-2">
            <input
              name="request_id"
              value={form.request_id}
              onChange={handleChange}
              placeholder="Unique request identifier"
              required
              className="input-field flex-1"
              id="input-request-id"
            />
            <button type="button" onClick={generateId} className="btn-secondary text-sm px-4" id="btn-generate-id">
              Generate
            </button>
          </div>
        </div>

        {/* Applicant Name */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1.5">Applicant Name</label>
          <input
            name="applicant_name"
            value={form.applicant_name}
            onChange={handleChange}
            placeholder="Full name"
            required
            className="input-field"
            id="input-applicant-name"
          />
        </div>

        {/* Income + Credit Score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Annual Income ($)</label>
            <input
              name="income"
              type="number"
              min="1"
              step="0.01"
              value={form.income}
              onChange={handleChange}
              placeholder="e.g. 75000"
              required
              className="input-field"
              id="input-income"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Credit Score</label>
            <input
              name="credit_score"
              type="number"
              min="0"
              max="900"
              value={form.credit_score}
              onChange={handleChange}
              placeholder="0 – 900"
              required
              className="input-field"
              id="input-credit-score"
            />
          </div>
        </div>

        {/* Documents Verified */}
        <div>
          <label className="block text-sm font-medium text-surface-300 mb-2">Documents Verified</label>
          <div className="flex gap-3" id="input-documents-verified">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, documents_verified: true }))}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                form.documents_verified
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700 border border-surface-700'
              }`}
            >
              <span className="text-lg">{form.documents_verified ? '✅' : '☑️'}</span>
              Yes — Verified
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, documents_verified: false }))}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                !form.documents_verified
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 ring-2 ring-red-400'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700 border border-surface-700'
              }`}
            >
              <span className="text-lg">{!form.documents_verified ? '❌' : '⬜'}</span>
              No — Not Verified
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm" id="submit-error">
            ❌ {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          id="btn-submit"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>🚀 Submit Request</>
          )}
        </button>
      </form>
    </div>
  );
}
