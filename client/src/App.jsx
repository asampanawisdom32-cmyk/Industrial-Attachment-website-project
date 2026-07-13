import { useState, useEffect } from 'react';
import { fetchAnalytics } from './api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#1A6B8A', '#0F5570', '#4DBDB5', '#2D9B8E', '#6ECDC6', '#155A7A', '#2080A0', '#3DADA5'];
const STATUS_COLORS = { active: '#4DBDB5', pending: '#F59E0B', completed: '#10B981', dropped: '#EF4444' };

function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${color}18`, color }}>
        <span dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value ?? '—'}</div>
        <div className="stat-card-label">{label}</div>
        {sub != null && <div className="stat-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

function StatusPieChart({ data }) {
  const pieData = [
    { name: 'Active', value: data?.activeStudents ?? 0 },
    { name: 'Pending', value: data?.pendingPlacements ?? 0 },
    { name: 'Completed', value: data?.completedStudents ?? 0 },
    { name: 'Dropped', value: data?.droppedStudents ?? 0 },
  ].filter(d => d.value > 0);

  if (!pieData.length) {
    return <div className="chart-empty">No student data available</div>;
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Student Status Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            animationBegin={100}
            animationDuration={800}
          >
            {pieData.map((entry, i) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase()] || COLORS[i]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            formatter={(value) => <span style={{ color: '#475569', fontSize: 13 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DepartmentChart({ data }) {
  if (!data?.length) {
    return <div className="chart-empty">No department data available</div>;
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Students by Department</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="department" tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlacementChart({ data }) {
  if (!data?.length) {
    return <div className="chart-empty">No placement data available</div>;
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top Placement Companies</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
          <YAxis type="category" dataKey="company" tick={{ fill: '#64748b', fontSize: 12 }} width={140} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#1A6B8A" animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RecentReportsTable({ data }) {
  if (!data?.length) {
    return <div className="chart-empty">No recent reports</div>;
  }

  const statusBadge = (status) => {
    const colors = {
      draft: { bg: '#f1f5f9', color: '#64748b' },
      submitted: { bg: '#dbeafe', color: '#2563eb' },
      reviewed: { bg: '#d1fae5', color: '#059669' },
    };
    const s = colors[status] || { bg: '#f1f5f9', color: '#64748b' };
    return <span className="status-badge" style={{ background: s.bg, color: s.color }}>{status}</span>;
  };

  return (
    <div className="chart-container reports-table-container">
      <h3 className="chart-title">Recent Reports</h3>
      <div className="reports-table-wrapper">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Student</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={r.id || i}>
                <td className="report-title-cell">{r.title || 'Untitled'}</td>
                <td>{r.studentName}</td>
                <td>{statusBadge(r.status)}</td>
                <td className="report-date-cell">
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <svg viewBox="0 0 50 50" width="40" height="40">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <circle cx="25" cy="25" r="20" fill="none" stroke="#1A6B8A" strokeWidth="4"
            strokeDasharray="90, 150" strokeLinecap="round" className="spinner-circle" />
        </svg>
      </div>
      <p className="loading-text">Loading analytics...</p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAnalytics().then((result) => {
      if (cancelled) return;
      if (result) {
        setData(result);
        setLoading(false);
      } else {
        setError('Failed to load analytics data. Make sure the server is running with valid Firebase credentials.');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <div className="header-logo"><img src="/images/logo.png" alt="BTU" /></div>
            <div>
              <h1 className="header-title">Crowz</h1>
              <p className="header-subtitle">Analytics Dashboard</p>
            </div>
          </div>
        </header>
        <main className="app-main">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Connection Error</h2>
            <p className="error-message">{error}</p>
            <p className="error-hint">Ensure a <code>serviceAccountKey.json</code> file exists in the project root with valid Firebase credentials, then restart the server.</p>
            <button className="retry-btn" onClick={() => { setLoading(true); setError(null); fetchAnalytics().then(r => r ? (setData(r), setLoading(false)) : (setError('Still failed.'), setLoading(false))); }}>
              Retry Connection
            </button>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    { label: 'Total Students', value: data.totalStudents, icon: '&#128101;', color: '#1A6B8A' },
    { label: 'Active', value: data.activeStudents, icon: '&#9989;', color: '#4DBDB5' },
    { label: 'Average Progress', value: data.averageProgress != null ? `${data.averageProgress}%` : '—', icon: '&#128200;', color: '#0F5570' },
    { label: 'Average Attendance', value: data.averageAttendance != null ? `${data.averageAttendance}%` : '—', icon: '&#128197;', color: '#2D9B8E' },
    { label: 'Total Reports', value: data.totalReports, icon: '&#128221;', color: '#155A7A' },
    { label: 'School Supervisors', value: data.schoolSupervisors, icon: '&#127891;', color: '#2080A0' },
    { label: 'Workplace Supervisors', value: data.workplaceSupervisors, icon: '&#127970;', color: '#3DADA5' },
    { label: 'Pending Placements', value: data.pendingPlacements, icon: '&#9203;', color: '#F59E0B' },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">C</div>
          <div>
            <h1 className="header-title">Crowz</h1>
            <p className="header-subtitle">Analytics Dashboard</p>
          </div>
        </div>
        <div className="header-right">
          <span className="header-badge">Premium</span>
          <a href="/dashboard" className="header-link">Main Portal &rarr;</a>
        </div>
      </header>

      <main className="app-main">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h2 className="hero-title">Industrial Attachment Program</h2>
            <p className="hero-description">Real-time analytics and performance insights for Bolgatanga Technical University</p>
          </div>
          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="hero-stat-value">{data.totalStudents ?? 0}</span>
              <span className="hero-stat-label">Total Students</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">{data.activeStudents ?? 0}</span>
              <span className="hero-stat-label">Active</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">{data.averageProgress ?? 0}%</span>
              <span className="hero-stat-label">Avg Progress</span>
            </div>
            <div className="hero-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">{data.totalReports ?? 0}</span>
              <span className="hero-stat-label">Reports</span>
            </div>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="stat-cards-grid">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          <StatusPieChart data={data} />
          <DepartmentChart data={data.departmentDistribution} />
        </div>

        <div className="charts-grid">
          <PlacementChart data={data.topPlacements} />
          <RecentReportsTable data={data.recentReports} />
        </div>

        <footer className="app-footer">
          <p>Bolgatanga Technical University &middot; Industrial Attachment Program</p>
          <p className="footer-version">Crowz Dashboard v1.0</p>
        </footer>
      </main>
    </div>
  );
}
