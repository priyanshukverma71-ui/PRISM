import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  PieChart as PieIcon,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export function ReportsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['reports-analytics'],
    queryFn: () => apiRequest<any>('/reports/analytics'),
  });

  const handleExportCsv = async () => {
    try {
      const csvText = await apiRequest<string>('/reports/export');
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prism-executive-report-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const COLORS = ['#DEE1E5', '#C7CBD0', '#9EA4AC', '#47D7A0', '#F4B860', '#FF626B'];

  if (isLoading) {
    return <div className="p-12 text-center text-slate-muted font-mono text-xs">Computing regulatory analytics...</div>;
  }

  const stageData = (analytics?.stagePendency || []).map((s: any) => ({
    name: (s.stage || '').replace(/_/g, ' '),
    count: s.count,
  }));

  const regionData = (analytics?.regionWorkload || []).map((r: any) => ({
    name: r.region,
    value: r.count,
  }));

  const complianceData = (analytics?.complianceStatus || []).map((c: any) => ({
    name: c.status,
    value: c.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Executive Analytics & Reports</h2>
          <p className="text-xs text-slate-muted">Comprehensive regulatory workload analytics, stage bottlenecks, and compliance metrics</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="platinum-button-primary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 self-start cursor-pointer shadow-platinum"
        >
          <Download size={14} />
          <span>Export Official Regulatory CSV</span>
        </button>
      </div>

      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Active Cases Monitored</span>
          <p className="text-2xl font-bold text-silver-bright font-mono mt-1">{analytics?.totalApplications || 0}</p>
        </div>
        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Multi-Channel Alert Delivery</span>
          <p className="text-2xl font-bold text-status-success font-mono mt-1">{analytics?.alertDeliveryRate || 100}%</p>
        </div>
        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Expired Document Records</span>
          <p className="text-2xl font-bold text-status-critical font-mono mt-1">
            {analytics?.documentExpirySummary?.expired || 0}
          </p>
        </div>
        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Expiring in &lt; 30 Days</span>
          <p className="text-2xl font-bold text-status-warning font-mono mt-1">
            {analytics?.documentExpirySummary?.expiringIn30Days || 0}
          </p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Pendency Bar Chart */}
        <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Stage Pendency Distribution
            </h3>
            <span className="text-[10px] font-mono text-slate-muted">Cases per Stage</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <XAxis dataKey="name" stroke="#525863" fontSize={10} tickLine={false} />
                <YAxis stroke="#525863" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111316', borderColor: '#2A2E35', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#C7CBD0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Workload Distribution Donut */}
        <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Regional Workload Balance
            </h3>
            <span className="text-[10px] font-mono text-slate-muted">Regional Share</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {regionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111316', borderColor: '#2A2E35', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend formatter={(value) => <span className="text-xs text-silver">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ReportsPage;
