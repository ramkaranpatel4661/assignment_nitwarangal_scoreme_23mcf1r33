import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SubmitRequest from './pages/SubmitRequest';
import WorkflowResult from './pages/WorkflowResult';
import AuditLogs from './pages/AuditLogs';
import Timeline from './pages/Timeline';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/submit', label: 'Submit', icon: '📝' },
  { to: '/result', label: 'Result', icon: '📋' },
  { to: '/audit', label: 'Audit', icon: '🔍' },
  { to: '/timeline', label: 'Timeline', icon: '⏱️' },
];

export default function App() {
  return (
    <Router>
      <div className="min-h-screen gradient-mesh">
        {/* Top Nav */}
        <nav className="sticky top-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-surface-700/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-8">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-primary-500/30">
                  W
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary-300 to-violet-300 bg-clip-text text-transparent hidden sm:block">
                  Workflow Platform
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {navItems.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-primary-600/20 text-primary-300 shadow-inner'
                          : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                      }`
                    }
                  >
                    <span>{icon}</span>
                    <span className="hidden md:inline">{label}</span>
                  </NavLink>
                ))}
              </div>
              <div className="ml-auto shrink-0">
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 transition-all"
                >
                  <span>📖</span>
                  <span className="hidden sm:inline">API Docs</span>
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/submit" element={<SubmitRequest />} />
            <Route path="/result" element={<WorkflowResult />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/timeline" element={<Timeline />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
