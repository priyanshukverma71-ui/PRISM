import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  ShieldCheck,
  Clock,
  Radar,
  FlaskConical,
  History,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck,
  Eye,
  Bell,
  ChevronRight as BreadcrumbSeparator,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../lib/api.js';
import { formatRole } from '../../lib/plainLanguage.js';

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

  // Priority 4: Compact, obvious sidebar navigation with the exact 8 familiar labels
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
        { label: 'Compliance requirements', path: '/compliance', icon: ShieldCheck },
        { label: 'Deadlines', path: '/deadlines', icon: Clock },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { label: 'Risk monitoring', path: '/risk-radar', icon: Radar },
        { label: 'What-if simulator', path: '/futurelab', icon: FlaskConical },
      ],
    },
    {
      group: 'Administration',
      items: [
        { label: 'Activity history', path: '/audit', icon: History },
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

  // Derive breadcrumbs from path
  const getBreadcrumbs = () => {
    const p = location.pathname;
    if (p.startsWith('/applications/new')) {
      return [
        { label: 'Applications', path: '/applications' },
        { label: 'New application', path: '/applications/new' },
      ];
    }
    if (p.startsWith('/applications/')) {
      const id = p.split('/')[2];
      return [
        { label: 'Applications', path: '/applications' },
        { label: `Case dossier #${id.slice(-8)}`, path: p },
      ];
    }
    if (p === '/compliance') return [{ label: 'Compliance requirements', path: '/compliance' }];
    if (p === '/deadlines') return [{ label: 'Deadlines', path: '/deadlines' }];
    if (p === '/risk-radar') return [{ label: 'Risk monitoring', path: '/risk-radar' }];
    if (p === '/futurelab') return [{ label: 'What-if simulator', path: '/futurelab' }];
    if (p === '/audit') return [{ label: 'Activity history', path: '/audit' }];
    if (p === '/settings') return [{ label: 'Settings', path: '/settings' }];
    if (p === '/alerts') return [{ label: 'System alerts', path: '/alerts' }];
    if (p === '/team') return [{ label: 'Team & access', path: '/team' }];
    if (p === '/evc') return [{ label: 'Inspection committee', path: '/evc' }];
    if (p === '/documents') return [{ label: 'Prescribed documents', path: '/documents' }];
    return [{ label: 'Overview', path: '/dashboard' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-obsidian text-silver overflow-hidden">
      {/* Sidebar Navigation */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } transition-all duration-200 flex flex-col border-r border-graphite-border bg-graphite z-30 select-none`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-graphite-border">
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gunmetal border border-graphite-border flex items-center justify-center">
                <span className="font-mono font-bold text-silver-bright text-base">Δ</span>
              </div>
              <div>
                <span className="font-bold text-sm tracking-wider text-silver-bright">PRISM</span>
                <span className="block text-[10px] text-slate-muted">Regulatory Intelligence</span>
              </div>
            </Link>
          )}

          {collapsed && (
            <div className="mx-auto w-8 h-8 rounded-lg bg-gunmetal border border-graphite-border flex items-center justify-center">
              <span className="font-mono font-bold text-silver-bright text-base">Δ</span>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded hover:bg-gunmetal text-slate-muted hover:text-silver transition-colors"
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group, groupIdx) => (
            <div key={group.group} className="space-y-1">
              {!collapsed ? (
                <div className="px-3 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-muted">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-gunmetal text-silver-bright border border-graphite-border font-semibold'
                        : 'text-slate-muted hover:text-silver hover:bg-graphite-hover border border-transparent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} className={isActive ? 'text-platinum' : 'text-slate-muted'} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono bg-gunmetal text-platinum rounded border border-graphite-border">
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
                <span className="text-[10px] text-slate-muted">Role</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getRoleBadgeStyle(user?.role)}`}>
                  {formatRole(user?.role) || 'User'}
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
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full flex justify-center py-2 text-slate-muted hover:text-status-critical"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Command Bar with Breadcrumbs & Controls */}
        <header className="h-16 border-b border-graphite-border bg-graphite/70 backdrop-blur-md px-6 flex items-center justify-between z-20">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <BreadcrumbSeparator size={13} className="text-slate-muted" />}
                  {isLast ? (
                    <span className="font-semibold text-silver-bright">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="text-slate-muted hover:text-silver transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Live IST Time */}
            <div className="hidden lg:flex items-center gap-1.5 bg-obsidian px-3 py-1 rounded-lg border border-graphite-border text-xs font-mono text-platinum">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              <span>{currentTime}</span>
            </div>

            {/* Reduced Motion Toggle */}
            <button
              onClick={toggleReducedMotion}
              className={`p-1.5 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                reducedMotion
                  ? 'bg-gunmetal border-platinum text-platinum'
                  : 'bg-obsidian border-graphite-border text-slate-muted hover:text-silver'
              }`}
              title="Toggle animations and 3D effects"
            >
              <Eye size={13} />
              <span className="hidden sm:inline">{reducedMotion ? 'Motion: Off' : 'Motion: On'}</span>
            </button>

            {/* Fast Demo Role Switcher */}
            <div className="flex items-center gap-2 bg-obsidian px-2.5 py-1 rounded-lg border border-graphite-border">
              <UserCheck size={14} className="text-platinum" />
              <select
                id="role-select"
                aria-label="Switch evaluation role"
                value={user?.role || 'SYSTEM_ADMIN'}
                onChange={handleRoleChange}
                className="bg-transparent text-xs font-medium text-silver-bright focus:outline-none cursor-pointer"
              >
                <option value="SYSTEM_ADMIN" className="bg-graphite text-silver">System administrator</option>
                <option value="REGIONAL_OFFICER" className="bg-graphite text-silver">Regional officer (WRO)</option>
                <option value="BUREAU_OFFICER" className="bg-graphite text-silver">Bureau officer (Headquarters)</option>
                <option value="COMMITTEE_REVIEWER" className="bg-graphite text-silver">Committee reviewer</option>
                <option value="INSTITUTION_USER" className="bg-graphite text-silver">Institution user (VJTI)</option>
                <option value="AUDITOR" className="bg-graphite text-silver">Auditor (CAG)</option>
              </select>
            </div>

            {/* Notification Indicator */}
            <Link
              to="/alerts"
              aria-label="View notifications"
              className="relative p-2 rounded-lg bg-obsidian border border-graphite-border hover:border-platinum/40 text-slate-muted hover:text-silver transition-colors"
            >
              <Bell size={16} />
              {unresolvedAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-critical text-[10px] font-bold rounded-full flex items-center justify-center text-white">
                  {unresolvedAlertsCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-obsidian p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
