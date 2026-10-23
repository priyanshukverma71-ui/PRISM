import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { PrismCore } from '../components/3d/PrismCore.js';
import { Shield, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export function LoginPage() {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@prism.aicte.gov.in');
  const [password, setPassword] = useState('Prism@2025');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication rejected. Verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await switchRole(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-silver flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-platinum/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        {/* Left: 3D PRISM Core & Value Prop */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
          <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border border-graphite-border shadow-platinum">
            <PrismCore activityState="NORMAL" className="w-full h-full" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal/60 border border-graphite-border text-xs font-mono text-platinum mb-3">
              <Shield size={13} className="text-status-success" />
              <span>AICTE Regulatory Intelligence Platform</span>
            </div>
            <h1 className="text-3xl font-extrabold text-silver-bright tracking-tight">
              PRISM <span className="text-platinum text-xl font-normal block mt-1">Approval & Compliance Intelligence</span>
            </h1>
            <p className="text-sm text-slate-muted mt-2 italic font-serif">
              "See the Risk. Predict the Delay. Act Before the Deadline."
            </p>
          </div>
        </div>

        {/* Right: Authentication Card & Role Selector */}
        <div className="platinum-card rounded-2xl p-8 border border-graphite-border backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-silver-bright">Enterprise Access Sign In</h2>
            <p className="text-xs text-slate-muted">Enter credentials or select a verified regulatory role below</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-status-critical/15 border border-status-critical/40 text-status-critical text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Official Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg pl-9 pr-3 py-2 text-xs text-silver focus:outline-none focus:border-platinum transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Security Token / Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-slate-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg pl-9 pr-3 py-2 text-xs text-silver focus:outline-none focus:border-platinum transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full platinum-button-primary py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Verifying Credentials...' : 'Authenticate Session'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Quick Demo Role Picker */}
          <div className="mt-8 pt-6 border-t border-graphite-border">
            <p className="text-[11px] font-mono text-slate-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserCheck size={13} className="text-platinum" />
              <span>1-Click Test Personas (Synthetic Demo)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'System Admin', role: 'SYSTEM_ADMIN' },
                { label: 'Regional Officer', role: 'REGIONAL_OFFICER' },
                { label: 'Bureau Officer', role: 'BUREAU_OFFICER' },
                { label: 'Committee Reviewer', role: 'COMMITTEE_REVIEWER' },
                { label: 'Institution (VJTI)', role: 'INSTITUTION_USER' },
                { label: 'Auditor (CAG)', role: 'AUDITOR' },
              ].map((p) => (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => handleQuickLogin(p.role)}
                  className="platinum-button-secondary py-1.5 px-2 rounded text-[11px] font-mono truncate text-left hover:border-platinum/50"
                >
                  ⚡ {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
