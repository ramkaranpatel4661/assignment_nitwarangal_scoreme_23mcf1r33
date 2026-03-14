import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#0ea5e9', '#8b5cf6'];

export default function DecisionChart({ stats }) {
  if (!stats || stats.total_requests === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Decision Distribution
        </h3>
        <div className="flex items-center justify-center h-48 text-surface-500 text-sm">
          No data yet. Submit a workflow request to see the chart.
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Manual Review', value: stats.manual_review, color: '#f59e0b' },
    { name: 'Retry', value: stats.retry, color: '#6366f1' },
    { name: 'Pending', value: stats.pending, color: '#0ea5e9' },
    { name: 'Processing', value: stats.processing, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const pct = ((d.value / stats.total_requests) * 100).toFixed(1);
      return (
        <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 shadow-xl">
          <p className="font-medium text-sm">{d.name}</p>
          <p className="text-surface-400 text-xs">{d.value} requests ({pct}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Decision Distribution
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              formatter={(value) => <span className="text-surface-300 text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
