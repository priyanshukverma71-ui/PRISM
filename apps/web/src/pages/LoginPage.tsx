import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import { safeFormatError } from '../lib/plainLanguage.js';

export function LoginPage() {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@prism.aicte.gov.in');
  const [password, setPassword] = useState('Prism@2025');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDemoPersonas, setShowDemoPersonas] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(safeFormatError(err, 'Invalid email address or password. Please try again.'));
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
      setError(safeFormatError(err, 'We could not switch accounts. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-silver flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-md">
        {/* Brand Mark */}
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-gunmetal border border-graphite-border flex items-center justify-center">
            <span className="font-mono font-bold text-silver-bright text-lg">Δ</span>
          </div>
        </div>

        {/* Focused Login Card */}
        <div className="platinum-card rounded-2xl p-8 border border-graphite-border shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-silver-bright tracking-tight">
              Welcome back to PRISM
            </h1>
            <p className="text-xs text-slate-muted mt-1.5 leading-relaxed">
              Sign in to your regulatory intelligence workspace and approval monitoring dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-muted pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aicte.gov.in"
                  className="w-full bg-obsidian border border-graphite-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-silver placeholder-slate-muted focus:outline-none focus:border-platinum transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-platinum">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-muted pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-obsidian border border-graphite-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-silver placeholder-slate-muted focus:outline-none focus:border-platinum transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-muted hover:text-silver focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 platinum-button-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Secondary / Demo Access */}
          <div className="mt-6 pt-5 border-t border-graphite-border text-center">
            <button
              type="button"
              onClick={() => setShowDemoPersonas(!showDemoPersonas)}
              className="text-xs text-slate-muted hover:text-platinum transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Demo evaluation accounts</span>
              <ChevronDown size={13} className={`transform transition-transform ${showDemoPersonas ? 'rotate-180' : ''}`} />
            </button>

            {showDemoPersonas && (
              <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 text-left animate-in fade-in duration-200">
                {[
                  { label: 'System administrator', role: 'SYSTEM_ADMIN' },
                  { label: 'Regional officer', role: 'REGIONAL_OFFICER' },
                  { label: 'Bureau officer', role: 'BUREAU_OFFICER' },
                  { label: 'Committee reviewer', role: 'COMMITTEE_REVIEWER' },
                  { label: 'Institution user (VJTI)', role: 'INSTITUTION_USER' },
                  { label: 'Auditor (CAG)', role: 'AUDITOR' },
                ].map((p) => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleQuickLogin(p.role)}
                    className="platinum-button-secondary py-1.5 px-2 rounded-lg text-[11px] truncate text-left cursor-pointer"
                  >
                    ⚡ {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Brand Subtitle Footer */}
        <p className="text-center text-[11px] text-slate-muted mt-6">
          PRISM • Proactive Regulatory Intelligence &amp; Status Monitoring
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
