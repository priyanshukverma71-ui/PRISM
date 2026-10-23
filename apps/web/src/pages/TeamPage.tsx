import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Shield,
  MapPin,
  Building,
  UserCheck,
  CheckCircle,
  Plus,
  Mail,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

export function TeamPage() {
  const { user: currentUser, switchRole } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => apiRequest<any[]>('/auth/users'),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-muted font-mono text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-platinum animate-ping inline-block mr-2" />
        Loading AICTE Regulatory Team Directory...
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
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

  const allUsers = users || [];

  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.region && u.region.toLowerCase().includes(search.toLowerCase())) ||
      (u.institutionName && u.institutionName.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-graphite-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-silver-bright tracking-tight">Regulatory Team &amp; Access Control</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-platinum/15 text-platinum border border-platinum/30">
              ROLE-BASED DIRECTORY
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-0.5">
            Authorized regional officers, bureau leads, expert committee reviewers, and system administrators
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            type="text"
            placeholder="Search officer, email, or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-graphite border border-graphite-border text-xs text-silver-bright placeholder-slate-muted focus:outline-none focus:border-platinum w-56"
          />
        </div>
      </div>

      {/* Role Filters */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-graphite/60 rounded-xl border border-graphite-border">
        {['ALL', 'SYSTEM_ADMIN', 'REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMMITTEE_REVIEWER', 'AUDITOR', 'INSTITUTION_USER'].map(
          (role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                roleFilter === role
                  ? 'bg-platinum text-obsidian font-bold shadow-platinum'
                  : 'text-slate-muted hover:text-silver'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const isCurrent = currentUser?.id === u.id;

          return (
            <div
              key={u.id}
              className={`platinum-card p-4 rounded-xl border transition-all space-y-3 ${
                isCurrent
                  ? 'border-platinum/80 bg-gradient-to-b from-gunmetal/60 to-obsidian shadow-platinum'
                  : 'border-graphite-border hover:border-platinum/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gunmetal border border-graphite-border flex items-center justify-center font-bold text-silver-bright font-mono text-xs">
                    {u.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-silver-bright flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-platinum text-obsidian font-mono font-bold">
                          YOU
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-muted flex items-center gap-1">
                      <Mail size={11} className="text-slate-muted" />
                      <span>{u.email}</span>
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getRoleBadge(u.role)}`}>
                  {u.role.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="pt-2 border-t border-graphite-border text-[11px] space-y-1">
                {u.region && (
                  <div className="flex items-center justify-between text-slate-muted">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-platinum" />
                      <span>Jurisdiction:</span>
                    </span>
                    <span className="font-mono text-silver font-semibold">{u.region} Region</span>
                  </div>
                )}

                {u.institutionName && (
                  <div className="flex items-center justify-between text-slate-muted">
                    <span className="flex items-center gap-1">
                      <Building size={11} className="text-platinum" />
                      <span>Institution:</span>
                    </span>
                    <span className="font-medium text-silver truncate max-w-[160px]">{u.institutionName}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-muted">
                  <span>Account Status:</span>
                  <span className="text-status-success font-mono font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                    <span>{u.status}</span>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-graphite-border flex items-center justify-between">
                <button
                  onClick={() => switchRole(u.role)}
                  className="w-full py-1 px-2.5 rounded-lg text-[11px] font-semibold platinum-button-secondary flex items-center justify-center gap-1.5"
                >
                  <UserCheck size={12} />
                  <span>Switch to {u.name.split(' ')[0]}'s Persona</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TeamPage;
