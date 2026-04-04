import { useState, useEffect } from 'react';
import {
  getCategoryRevenue,
  getPaymentBreakdown,
  getHourlyRevenue,
  getSummary,
  getTopProducts,
  getInsights,
} from '../services/analyticsService';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, Layers, Lightbulb } from 'lucide-react';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PIE_COLORS  = ['#7c7ff2', '#58a6ff', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa'];
const BAR_COLOR   = '#7c7ff2';
const HOUR_COLOR  = '#22c55e';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt12h(hour) {
  if (hour === null || hour === undefined) return '—';
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  return `${h} ${suffix}`;
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="an-summary-card" style={{ '--card-accent': color }}>
      <div className="an-summary-card__icon"><Icon size={18} /></div>
      <div className="an-summary-card__value">{value}</div>
      <div className="an-summary-card__label">{label}</div>
    </div>
  );
}

function ChartCard({ title, children, id }) {
  return (
    <div className="card" id={id}>
      <div className="card-title">{title}</div>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [summary,       setSummary]       = useState(null);
  const [topProducts,   setTopProducts]   = useState([]);
  const [categoryRev,   setCategoryRev]   = useState([]);
  const [payBreakdown,  setPayBreakdown]  = useState([]);
  const [hourlyRev,     setHourlyRev]     = useState([]);
  const [insights,      setInsights]      = useState(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getSummary(),
      getTopProducts(),
      getCategoryRevenue(),
      getPaymentBreakdown(),
      getHourlyRevenue(),
      getInsights(),
    ]).then(([sum, top, cat, pay, hourly, ins]) => {
      if (sum.status       === 'fulfilled') setSummary(sum.value.data.data);
      if (top.status       === 'fulfilled') setTopProducts(top.value.data.data);
      if (cat.status       === 'fulfilled') setCategoryRev(cat.value.data.data);
      if (pay.status       === 'fulfilled') setPayBreakdown(pay.value.data.data);
      if (hourly.status    === 'fulfilled') setHourlyRev(hourly.value.data.data);
      if (ins.status       === 'fulfilled') setInsights(ins.value.data.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const maxTopQty = topProducts[0]?.totalQuantity || 1;

  return (
    <div id="analytics-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Analytics Dashboard</h1>
        <p className="page-subtitle">Business performance at a glance</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="an-summary-row" id="analytics-summary-cards">
        <SummaryCard
          icon={TrendingUp}
          label="Total Revenue"
          value={`₹${(summary?.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          color="#7c7ff2"
        />
        <SummaryCard
          icon={ShoppingBag}
          label="Total Orders"
          value={summary?.totalOrders ?? 0}
          color="#58a6ff"
        />
        <SummaryCard
          icon={Layers}
          label="Avg Order Value"
          value={`₹${(summary?.avgOrderValue ?? 0).toFixed(2)}`}
          color="#22c55e"
        />
        <SummaryCard
          icon={Users}
          label="Total Sessions"
          value={summary?.totalSessions ?? 0}
          color="#f59e0b"
        />
      </div>

      {/* ── Pie + Bar row ── */}
      <div className="an-grid-2">

        {/* Category Revenue — Pie Chart */}
        <ChartCard title="📊 Revenue by Category" id="analytics-pie-chart">
          {categoryRev.length === 0 ? (
            <p className="an-empty">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryRev}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ category, percent }) =>
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {categoryRev.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`₹${v}`, 'Revenue']}
                  contentStyle={{ background: '#1f2328', border: '1px solid #2d2f34', borderRadius: 8, fontSize: 13 }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12, color: '#a1a1aa' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Payment Breakdown — Bar Chart */}
        <ChartCard title="💳 Payment Methods" id="analytics-payment-bar">
          {payBreakdown.length === 0 ? (
            <p className="an-empty">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={payBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2f34" />
                <XAxis dataKey="method" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Orders']}
                  contentStyle={{ background: '#1f2328', border: '1px solid #2d2f34', borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Hourly Revenue + Top Products row ── */}
      <div className="an-grid-2">

        {/* Hourly Revenue — Histogram */}
        <ChartCard title="⏰ Hourly Revenue" id="analytics-hourly-bar">
          {hourlyRev.length === 0 ? (
            <p className="an-empty">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyRev} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2f34" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={fmt12h}
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  interval={1}
                />
                <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <Tooltip
                  labelFormatter={fmt12h}
                  formatter={(v) => [`₹${v}`, 'Revenue']}
                  contentStyle={{ background: '#1f2328', border: '1px solid #2d2f34', borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill={HOUR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Products */}
        <ChartCard title="🏆 Top Products" id="analytics-top-products">
          {topProducts.length === 0 ? (
            <p className="an-empty">No data yet.</p>
          ) : (
            <div className="an-top-products">
              {topProducts.map((p, i) => (
                <div className="an-top-item" key={p.productName}>
                  <span
                    className="an-top-item__rank"
                    style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#a1a1aa' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}
                  >
                    #{i + 1}
                  </span>
                  <div className="an-top-item__info">
                    <div className="an-top-item__name">{p.productName}</div>
                    <div className="an-top-item__bar-track">
                      <div
                        className="an-top-item__bar-fill"
                        style={{ width: `${(p.totalQuantity / maxTopQty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="an-top-item__stats">
                    <span className="an-top-item__qty">{p.totalQuantity} sold</span>
                    <span className="an-top-item__rev">₹{p.totalRevenue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Insights Box ── */}
      {insights && (
        <div className="card" id="analytics-insights">
          <div className="card-title"><Lightbulb size={16} /> Business Insights</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="an-insight-tile">
              <div className="an-insight-tile__label">⏰ Best Hour</div>
              <div className="an-insight-tile__value">
                {insights.bestHour !== null ? fmt12h(insights.bestHour) : 'Not enough data'}
              </div>
              <div className="an-insight-tile__sub">Highest revenue during this hour</div>
            </div>
            <div className="an-insight-tile">
              <div className="an-insight-tile__label">🔥 Top Item</div>
              <div className="an-insight-tile__value">
                {insights.bestProduct ?? 'Not enough data'}
              </div>
              <div className="an-insight-tile__sub">Most ordered product overall</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
