import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ArrowRight, Building, BookOpen, Sliders } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { safeFormatError } from '../lib/plainLanguage.js';

export function NewApplicationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<'EXTENSION_OF_APPROVAL' | 'NEW_INSTITUTION' | 'INTAKE_INCREASE' | 'NEW_COURSE'>('EXTENSION_OF_APPROVAL');
  const [workflowTemplateCode, setWorkflowTemplateCode] = useState('FULL_CYCLE');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [selectedInstId, setSelectedInstId] = useState<string>(user?.institutionId || '');
  const [courseName, setCourseName] = useState('Artificial Intelligence & Machine Learning');
  const [intake, setIntake] = useState('60');
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: institutions } = useQuery({
    queryKey: ['institutions-list'],
    queryFn: () => apiRequest<any[]>('/reports/analytics').then(() => apiRequest<any[]>('/applications?limit=50').then(res => {
      const map = new Map();
      res.forEach((a: any) => {
        if (!map.has(a.institution?.id)) {
          map.set(a.institution?.id, a.institution);
        }
      });
      return Array.from(map.values());
    })),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest('/applications', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data: any) => {
      navigate(`/applications/${data.id}`);
    },
    onError: (err: any) => {
      setErrorMessage(safeFormatError(err, "We couldn't submit your application. Please verify the details and try again."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const instId = user?.institutionId || selectedInstId;
    if (!instId) {
      setErrorMessage('Please select an institution to proceed.');
      return;
    }

    createMutation.mutate({
      institutionId: instId,
      category,
      workflowTemplateCode,
      priority,
      academicYear: '2025-2026',
      autoSubmit,
      metadata: {
        course: courseName,
        proposedIntake: parseInt(intake, 10),
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/applications"
          aria-label="Back to applications"
          className="p-2 rounded-lg bg-graphite border border-graphite-border hover:bg-gunmetal text-slate-muted hover:text-silver transition-colors"
        >
          <ChevronLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">New application</h1>
          <p className="text-xs text-slate-muted">Submit an authorized case dossier for regulatory approval</p>
        </div>
      </div>

      <div className="platinum-card p-6 rounded-2xl border border-graphite-border">
        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Institution Selection */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-platinum flex items-center gap-1.5 border-b border-graphite-border pb-2">
              <Building size={14} />
              <span>Institution details</span>
            </h2>

            <div>
              <label className="block text-xs font-medium text-silver mb-1.5">
                Higher education institution *
              </label>
              {user?.role === 'INSTITUTION_USER' && user?.institutionName ? (
                <div className="p-2.5 rounded-lg bg-obsidian border border-graphite-border text-xs text-silver font-medium">
                  {user.institutionName} ({user.institutionCode || 'Assigned account'})
                </div>
              ) : (
                <select
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Select institution --</option>
                  {institutions?.map((inst: any) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code}) — {inst.region} region
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Section 2: Application Type & Course */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-platinum flex items-center gap-1.5 border-b border-graphite-border pb-2">
              <BookOpen size={14} />
              <span>Program and category</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-silver mb-1.5">Application category</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none cursor-pointer"
                >
                  <option value="EXTENSION_OF_APPROVAL">Extension of approval</option>
                  <option value="NEW_INSTITUTION">New institution</option>
                  <option value="INTAKE_INCREASE">Intake increase</option>
                  <option value="NEW_COURSE">New course</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-silver mb-1.5">Review workflow</label>
                <select
                  value={workflowTemplateCode}
                  onChange={(e) => setWorkflowTemplateCode(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none cursor-pointer"
                >
                  <option value="FULL_CYCLE">Standard review cycle</option>
                  <option value="ONLY_SCRUTINY">Accelerated review cycle</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-silver mb-1.5">Proposed course or department</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-silver mb-1.5">Proposed student intake</label>
                <input
                  type="number"
                  value={intake}
                  onChange={(e) => setIntake(e.target.value)}
                  min="1"
                  max="500"
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Processing Priority */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-platinum flex items-center gap-1.5 border-b border-graphite-border pb-2">
              <Sliders size={14} />
              <span>Routing options</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-silver mb-1.5">Priority level</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none cursor-pointer"
                >
                  <option value="NORMAL">Normal review</option>
                  <option value="HIGH">High priority</option>
                  <option value="URGENT">Urgent review</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="autoSubmit"
                  checked={autoSubmit}
                  onChange={(e) => setAutoSubmit(e.target.checked)}
                  className="rounded bg-obsidian border-graphite-border text-platinum cursor-pointer"
                />
                <label htmlFor="autoSubmit" className="text-xs text-silver cursor-pointer select-none">
                  Submit directly to regional review queue
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-graphite-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="platinum-button-secondary px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="platinum-button-primary px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{createMutation.isPending ? 'Submitting...' : 'Submit application'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewApplicationPage;
