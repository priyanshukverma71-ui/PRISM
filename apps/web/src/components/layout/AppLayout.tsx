import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  ShieldCheck,
  Clock,
  Radar,
  FlaskConical,
  Users,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck,
  Eye,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../lib/api.js';

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: string;
  count?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function AppLayout() {
  const { user, logout, switchRole, reducedMotion, toggleReducedMotion } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchAlertsCount() {
      try {
        const alerts = await apiRequest<any[]>('/alerts?status=UNRESOLVED');
        setUnresolvedAlertsCount(alerts.length);
      } catch (e) {
        // silently fallback
      }
    }
    fetchAlertsCount();
    const poll = setInterval(fetchAlertsCount, 30000);
    return () => clearInterval(poll);
  }, [location.pathname]);

  // Reduced navigation overload: exactly 4 clear groups
  const navGroups: NavGroup[] = [
    {
      group: 'Workspace',
      items: [
        { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Applications', path: '/applications', icon: FolderGit2 },
      ],
    },
    {
      group: 'Compliance',
      items: [
        { label: 'Obligations', path: '/compliance', icon: ShieldCheck },
        { label: 'Deadlines', path: '/deadlines', icon: Clock },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { label: 'Risk Radar', path: '/risk-radar', icon: Radar },
        { label: 'FUTURELAB', path: '/futurelab', icon: FlaskConical, badge: '4D' },
      ],
    },
    {
      group: 'Administration',
      items: [
        { label: 'Team', path: '/team', icon: Users },
        { label: 'Settings', path: '/settings', icon: Sliders },
      ],
    },
  ];

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await switchRole(e.target.value);
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SYSTEM_ADMIN':
        return 'bg-purple-950/60 text-purple-300 border-purple-800';
      case 'REGIONAL_OFFICER':
        return 'bg-blue-950/60 text-blue-300 border-blue-800';
      case 'BUREAU_OFFICER':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800';
      case 'COMMITTEE_REVIEWER':
        return 'bg-amber-950/60 text-amber-300 border-amber-800';
      case 'AUDITOR':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div className="flex h-screen bg-obsidian text-silver overflow-hidden">
      {/* Sidebar Navigation */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } transition-all duration-300 flex flex-col border-r border-graphite-border bg-graphite z-30 select-none`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-graphite-border">
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gunmetal border border-platinum/40 flex items-center justify-center shadow-platinum">
                <span className="font-mono font-black text-silver-bright text-base">Δ</span>
              </div>
              <div>
                <span className="font-bold text-base tracking-wider text-silver-bright">PRISM</span>
                <span className="block text-[9px] font-mono tracking-widest text-platinum uppercase">Spatial Kernel</span>
              </div>
            </Link>
          )}

          {collapsed && (
            <div className="mx-auto w-8 h-8 rounded-lg bg-gunmetal border border-platinum/40 flex items-center justify-center">
              <span className="font-mono font-black text-silver-bright text-base">Δ</span>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded hover:bg-gunmetal text-slate-muted hover:text-silver transition-colors"
            title={collapsed ? 'Expand Menu' : 'Collapse Menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group, groupIdx) => (
            <div key={group.group} className="space-y-1">
              {!collapsed ? (
                <div className="px-3 pt-1 pb-1 text-[9px] font-mono uppercase tracking-wider text-slate-muted font-bold">
                  {group.group}
                </div>
              ) : (
                groupIdx > 0 && <div className="border-t border-graphite-border/70 my-2 mx-1" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gunmetal text-silver-bright border border-platinum/40 shadow-platinum'
                        : 'text-slate-muted hover:text-silver hover:bg-graphite-hover'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} className={isActive ? 'text-platinum' : 'text-slate-muted'} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-platinum/20 text-platinum rounded">
                        {item.badge}
                      </span>
                    )}
                    {!collapsed && item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-status-critical/20 text-status-critical border border-status-critical/40 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="p-3 border-t border-graphite-border bg-obsidian/40">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-muted">Identity</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getRoleBadgeStyle(user?.role)}`}>
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-silver-bright truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-muted truncate">{user?.institutionName || user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 text-xs font-medium text-slate-muted hover:text-status-critical hover:bg-gunmetal rounded transition-colors"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full flex justify-center py-2 text-slate-muted hover:text-status-critical"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Command Bar */}
        <header className="h-16 border-b border-graphite-border bg-graphite/60 backdrop-blur-md px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold tracking-wide text-silver-bright uppercase font-mono">
              PRISM <span className="text-slate-muted font-normal">| Approval &amp; Compliance Intelligence</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Live IST Time */}
            <div className="hidden lg:flex items-center gap-1.5 bg-obsidian px-3 py-1 rounded border border-graphite-border text-xs font-mono text-platinum">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              <span>{currentTime}</span>
            </div>

            {/* Reduced Motion Toggle */}
            <button
              onClick={toggleReducedMotion}
              className={`p-1.5 rounded border text-xs flex items-center gap-1.5 font-mono ${
                reducedMotion
                  ? 'bg-gunmetal border-platinum text-platinum'
                  : 'bg-obsidian border-graphite-border text-slate-muted hover:text-silver'
              }`}
              title="Toggle Reduced Motion for 3D and Animations"
            >
              <Eye size={13} />
              <span className="hidden sm:inline">{reducedMotion ? '3D Motion: OFF' : '3D Motion: ON'}</span>
            </button>

            {/* Fast Demo Role Switcher */}
            <div className="flex items-center gap-2 bg-obsidian px-2.5 py-1 rounded border border-graphite-border">
              <UserCheck size={14} className="text-platinum" />
              <select
                id="role-select"
                value={user?.role || 'SYSTEM_ADMIN'}
                onChange={handleRoleChange}
                className="bg-transparent text-xs font-medium text-silver-bright focus:outline-none cursor-pointer"
              >
                <option value="SYSTEM_ADMIN" className="bg-graphite text-silver">System Admin</option>
                <option value="REGIONAL_OFFICER" className="bg-graphite text-silver">Regional Officer (WRO)</option>
                <option value="BUREAU_OFFICER" className="bg-graphite text-silver">Bureau Officer (HQ)</option>
                <option value="COMMITTEE_REVIEWER" className="bg-graphite text-silver">Committee Reviewer</option>
                <option value="INSTITUTION_USER" className="bg-graphite text-silver">Institution User (VJTI)</option>
                <option value="AUDITOR" className="bg-graphite text-silver">Auditor (CAG)</option>
              </select>
            </div>

            {/* Notification Indicator */}
            <Link
              to="/alerts"
              className="relative p-2 rounded-lg bg-obsidian border border-graphite-border hover:border-platinum/40 text-slate-muted hover:text-silver transition-colors"
            >
              <Bell size={16} />
              {unresolvedAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-critical text-[10px] font-mono font-bold rounded-full flex items-center justify-center text-white">
                  {unresolvedAlertsCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-obsidian p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
