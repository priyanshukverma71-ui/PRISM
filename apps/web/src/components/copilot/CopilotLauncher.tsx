import React from 'react';
import { Sparkles } from 'lucide-react';
import { useCopilot } from '../../context/CopilotContext.js';

export function CopilotLauncher() {
  const { isOpen, toggleCopilot } = useCopilot();

  if (isOpen) return null;

  return (
    <button
      onClick={toggleCopilot}
      className="fixed bottom-6 right-6 z-40 liquid-glass-capsule p-2 px-3.5 rounded-2xl flex items-center gap-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:border-[#F5BA42]/50 hover:shadow-[0_0_20px_rgba(245,186,66,0.3)] transition-all cursor-pointer group select-none animate-in fade-in slide-in-from-bottom-4 duration-300"
      aria-label="Open PRISM Copilot AI Assistant"
    >
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#F5BA42]/30 to-[#F5BA42]/10 border border-[#F5BA42]/40 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Sparkles size={13} className="text-[#F5BA42]" />
      </div>

      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-silver-bright tracking-tight group-hover:text-white">
            PRISM Copilot
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
        </div>
        <span className="text-[9px] font-mono text-slate-muted block -mt-0.5">
          AI Compliance
        </span>
      </div>
    </button>
  );
}

export default CopilotLauncher;
