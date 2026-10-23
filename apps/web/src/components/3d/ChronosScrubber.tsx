import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Zap,
} from 'lucide-react';

interface ChronosScrubberProps {
  temporalOffset: number; // -15 to +45
  onChangeOffset: (offset: number) => void;
  activeIntervention: 'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING';
  onChangeIntervention: (intv: 'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING') => void;
}

export function ChronosScrubber({
  temporalOffset,
  onChangeOffset,
  activeIntervention,
  onChangeIntervention,
}: ChronosScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        onChangeOffset(temporalOffset >= 30 ? -10 : temporalOffset + 1);
      }, 800);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, temporalOffset, onChangeOffset]);

  const getSimulatedDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getModeLabel = () => {
    if (temporalOffset < 0) return { label: 'PAST AUDIT REPLAY', color: 'text-platinum' };
    if (temporalOffset === 0) return { label: 'PRESENT REAL-TIME', color: 'text-status-success' };
    return { label: 'PREDICTIVE TIME WARP', color: 'text-status-warning' };
  };

  const mode = getModeLabel();

  return (
    <div className="platinum-card p-4 rounded-2xl border border-graphite-border bg-obsidian/95 backdrop-blur-xl space-y-3">
      {/* Top Header: Temporal Clock & Intervention Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-gunmetal border border-graphite-border">
            <span
              className={`w-2 h-2 rounded-full ${
                temporalOffset > 0 ? 'bg-status-warning animate-ping' : temporalOffset < 0 ? 'bg-platinum' : 'bg-status-success'
              }`}
            />
            <span className={mode.color}>{mode.label}</span>
          </div>

          <div className="font-mono text-xs text-silver-bright font-bold">
            {temporalOffset > 0 ? `+${temporalOffset} Days` : temporalOffset < 0 ? `${temporalOffset} Days` : 'Day 0 (Today)'}
            <span className="text-slate-muted font-normal ml-2">({getSimulatedDate(temporalOffset)})</span>
          </div>
        </div>

        {/* Temporal Play / Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeOffset(0)}
            className="p-1.5 rounded hover:bg-gunmetal text-slate-muted hover:text-silver text-xs font-mono flex items-center gap-1"
            title="Reset to Present Day"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="platinum-button-primary px-3 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-platinum"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause Scrubber' : 'Auto-Scrub Timeline'}</span>
          </button>
        </div>
      </div>

      {/* The 4D Temporal Timeline Slider */}
      <div className="relative pt-2 pb-1">
        <input
          type="range"
          min={-15}
          max={35}
          step={1}
          value={temporalOffset}
          onChange={(e) => onChangeOffset(parseInt(e.target.value, 10))}
          className="w-full accent-platinum cursor-pointer h-2 bg-gunmetal rounded-lg appearance-none"
        />

        {/* Milestone Tick Marks */}
        <div className="flex justify-between text-[10px] font-mono text-slate-muted pt-1 select-none">
          <span className="hover:text-silver cursor-pointer" onClick={() => onChangeOffset(-14)}>
            -14d (Audit Origin)
          </span>
          <span className="hover:text-silver cursor-pointer font-bold text-platinum" onClick={() => onChangeOffset(0)}>
            ▲ Today (Live)
          </span>
          <span className="hover:text-status-warning cursor-pointer" onClick={() => onChangeOffset(8)}>
            +8d (Lease Critical)
          </span>
          <span className="hover:text-status-critical cursor-pointer" onClick={() => onChangeOffset(14)}>
            +14d (EVC Rupture)
          </span>
          <span className="hover:text-silver cursor-pointer" onClick={() => onChangeOffset(30)}>
            +30d (Cycle End)
          </span>
        </div>
      </div>

      {/* Bottom: Real-Time Quantum Intervention Trigger */}
      <div className="pt-2 border-t border-graphite-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-platinum">
          <Zap size={14} className="text-status-warning" />
          <span className="font-bold">4D Administrative Intervention:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'NONE', label: 'None (Natural Delay Cascade)' },
            { id: 'PROVISIONAL_UNDERTAKING', label: '⚡ Provisional Lease Escrow' },
            { id: 'FAST_TRACK_EVC', label: '⚡ Central EVC Roster Pool' },
            { id: 'SPECIAL_SCRUTINY_DRIVE', label: '⚡ Weekend Scrutiny Drive' },
          ].map((intv) => (
            <button
              key={intv.id}
              onClick={() => onChangeIntervention(intv.id as any)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
                activeIntervention === intv.id
                  ? 'bg-platinum text-obsidian border-white font-bold'
                  : 'bg-obsidian text-slate-muted border-graphite-border hover:text-silver'
              }`}
            >
              {intv.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export default ChronosScrubber;
