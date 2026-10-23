import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useCopilot } from '../../context/CopilotContext.js';

export function CopilotLauncher() {
  const { isOpen, toggleCopilot } = useCopilot();

  return (
    <button
      onClick={toggleCopilot}
      className={`fixed bottom-6 right-6 z-[9999] copilot-circular-pop flex items-center justify-center cursor-pointer group select-none transition-all duration-300 ${
        isOpen
          ? '!border-platinum/50 shadow-[0_0_24px_rgba(255,255,255,0.25)]'
          : '!border-[#F5BA42]/45 hover:!border-[#F5BA42] shadow-[0_0_20px_rgba(245,186,66,0.25)]'
      }`}
      aria-label={isOpen ? 'Close PRISM Copilot' : 'Open PRISM Copilot AI Assistant'}
      title={isOpen ? 'Close Copilot' : 'Open PRISM Copilot'}
    >
      {/* Icon Transition: Sparkles when closed, X when open */}
      <div className="relative flex items-center justify-center">
        {isOpen ? (
          <X size={20} className="text-platinum transition-transform duration-200 rotate-0 hover:rotate-90" />
        ) : (
          <div className="relative">
            <Sparkles
              size={22}
              className="text-[#F5BA42] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12"
            />
          </div>
        )}
      </div>

      {/* Pulsing Live Regulatory Status Indicator (shown when closed) */}
      {!isOpen && (
        <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-status-success border-2 border-[#0A0D12]" />
        </span>
      )}

      {/* Sleek Tooltip appearing to the left on hover */}
      <div className="absolute right-16 px-3 py-1.5 rounded-xl bg-[#0D1015]/95 border border-white/10 text-xs font-semibold text-silver-bright shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-2 group-hover:translate-x-0 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F5BA42]" />
        <span>PRISM Copilot</span>
        <span className="text-[10px] font-mono text-slate-muted pl-0.5">AI</span>
      </div>
    </button>
  );
}

export default CopilotLauncher;
