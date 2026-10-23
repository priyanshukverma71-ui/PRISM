import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Plus, CheckCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

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

  const { data: institutions } = useQuery({
    queryKey: ['institutions-list'],
    queryFn: () => apiRequest<any[]>('/reports/analytics').then(() => apiRequest<any[]>('/applications?limit=50').then(res => {
      // Extract unique institutions
      const map = new Map();
      res.forEach((a: any) => {
        if (!map.has(a.institution.id)) {
          map.set(a.institution.id, a.institution);
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const instId = user?.institutionId || selectedInstId;
    if (!instId) {
      alert('Please select an institution');
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
      <div className="flex items-center gap-3">
        <Link
          to="/applications"
          className="p-2 rounded-lg bg-graphite border border-graphite-border hover:bg-gunmetal text-slate-muted hover:text-silver"
        >
          <ChevronLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">File Statutory Application</h2>
          <p className="text-xs text-slate-muted">AICTE Approval Process Handbook (APH 2025-26) Protocol</p>
        </div>
      </div>

      <div className="platinum-card p-6 rounded-2xl border border-graphite-border">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Institution Selector */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Institution</label>
            {user?.role === 'INSTITUTION_USER' && user?.institutionName ? (
              <div className="p-2.5 rounded-lg bg-obsidian border border-graphite-border text-xs text-silver font-medium">
                {user.institutionName} ({user.institutionCode || 'Assigned Scope'})
              </div>
            ) : (
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
                required
              >
                <option value="">-- Choose Higher Education Institution --</option>
                {institutions?.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code}) - {inst.region}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Application Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
              >
                <option value="EXTENSION_OF_APPROVAL">Extension of Approval (EoA)</option>
                <option value="NEW_INSTITUTION">New Technical Institution</option>
                <option value="INTAKE_INCREASE">Increase in Student Intake</option>
                <option value="NEW_COURSE">Introduction of New Program/Course</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Workflow Rule Template</label>
              <select
                value={workflowTemplateCode}
                onChange={(e) => setWorkflowTemplateCode(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
              >
                <option value="FULL_CYCLE">Standard Cycle (Scrutiny + EVC + SAC)</option>
                <option value="ONLY_SCRUTINY">Accelerated (Scrutiny Exemption)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Proposed Course / Department</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Approved / Proposed Intake</label>
              <input
                type="number"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Priority Tag</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
              >
                <option value="NORMAL">Normal Processing</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent (Special Hearing Case)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="autoSubmit"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
                className="rounded bg-obsidian border-graphite-border text-platinum"
              />
              <label htmlFor="autoSubmit" className="text-xs text-silver cursor-pointer select-none">
                Submit directly into Scrutiny Queue
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-graphite-border flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/applications')}
              className="platinum-button-secondary px-4 py-2 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="platinum-button-primary px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{createMutation.isPending ? 'Transmitting to Kernel...' : 'Transmit Application'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default NewApplicationPage;
