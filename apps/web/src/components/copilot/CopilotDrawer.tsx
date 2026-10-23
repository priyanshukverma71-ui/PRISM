import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Copy,
  Check,
  BookOpen,
  FileText,
  CheckSquare,
  Square,
  RotateCcw,
  ArrowRight,
  Shield,
  ExternalLink,
  ChevronDown,
  Layers,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react';
import { useCopilot } from '../../context/CopilotContext.js';
import { useToast } from '../../context/ToastContext.js';
import { apiRequest } from '../../lib/api.js';

interface SourceReference {
  title: string;
  clause: string;
  excerpt: string;
  category: string;
  authority: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  actionUrl: string;
  actionLabel: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  completed?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: SourceReference[];
  checklist?: ChecklistItem[];
  timestamp: string;
}

export function CopilotDrawer() {
  const {
    isOpen,
    closeCopilot,
    selectedApplicationId,
    setSelectedApplicationId,
    initialPrompt,
    clearInitialPrompt,
  } = useCopilot();

  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `### Welcome to PRISM Copilot
I am your **AI Compliance Assistant**, grounded in the **AICTE Approval Process Handbook (APH 2025-26)** and real-time PRISM institutional records.

**You can ask me:**
* *"Why is this application at risk?"*
* *"Generate a checklist of next steps"*
* *"What documents are missing or expired?"*
* *"Who is responsible for the next action?"*
* *"Can we grant a provisional undertaking for the land lease?"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'sources'>('chat');
  const [expandedRefIndex, setExpandedRefIndex] = useState<string | null>(null);
  const [completedChecklistIds, setCompletedChecklistIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch applications list for the context selector dropdown
  const { data: applications = [] } = useQuery({
    queryKey: ['copilot-applications'],
    queryFn: () => apiRequest<any[]>('/applications?limit=25'),
    staleTime: 60000,
  });

  // Fetch approved source documents repository
  const { data: sourceDocuments = [] } = useQuery({
    queryKey: ['copilot-sources'],
    queryFn: () => apiRequest<SourceReference[]>('/copilot/sources'),
    staleTime: 300000,
  });

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Handle initialPrompt triggered from outside pages
  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSendMessage(initialPrompt);
      clearInitialPrompt();
    }
  }, [isOpen, initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isGenerating) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest<{
        reply: string;
        references?: SourceReference[];
        checklist?: ChecklistItem[];
      }>('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          applicationId: selectedApplicationId || undefined,
          conversationHistory: historyPayload,
        }),
      });

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'No regulatory data found.',
        references: res.references || [],
        checklist: res.checklist || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Notice:** We could not process your query right now. Please verify your connection or try rephrasing your question.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setCompletedChecklistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyChecklistToClipboard = (items: ChecklistItem[]) => {
    const text = items
      .map((item) => {
        const isDone = completedChecklistIds.has(item.id);
        return `- [${isDone ? 'x' : ' '}] ${item.task} (Owner: ${item.owner} | Due: ${item.deadline})`;
      })
      .join('\n');

    navigator.clipboard.writeText(text);
    showToast({
      type: 'success',
      title: 'Checklist copied',
      message: 'Compliance action items copied to clipboard in markdown format.',
    });
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `### PRISM Copilot Session Reset
I am ready for your questions. Select an application above or ask any compliance query in plain English.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setCompletedChecklistIds(new Set());
    setExpandedRefIndex(null);
  };

  if (!isOpen) return null;

  const currentApp = applications.find((a: any) => a.id === selectedApplicationId);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] z-50 flex flex-col bg-[#0D1015]/95 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-right duration-300">
      {/* ============================================================== */}
      {/* 1. DRAWER TOP LIQUID GLASS TOOLBAR                              */}
      {/* ============================================================== */}
      <div className="liquid-glass-toolbar p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F5BA42]/30 to-[#F5BA42]/10 border border-[#F5BA42]/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,186,66,0.25)]">
              <Sparkles size={16} className="text-[#F5BA42]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-silver-bright tracking-tight">PRISM Copilot</h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-status-success/20 text-status-success border border-status-success/40 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-ping" />
                  AI Compliance
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-muted mt-0.5">
                Approved APH 2025-26 & Regulatory Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-1.5 rounded-xl liquid-glass-pill text-slate-muted hover:text-silver cursor-pointer transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={closeCopilot}
              title="Close Copilot"
              className="p-1.5 rounded-xl liquid-glass-pill text-slate-muted hover:text-white cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Context Selector Dropdown & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
          {/* Application Context Picker */}
          <div className="flex items-center gap-2 liquid-glass-pill px-2.5 py-1 rounded-xl text-xs max-w-full">
            <Layers size={13} className="text-[#F5BA42] shrink-0" />
            <select
              value={selectedApplicationId || ''}
              onChange={(e) => setSelectedApplicationId(e.target.value || undefined)}
              aria-label="Select application context"
              className="bg-transparent text-[11px] font-mono text-silver-bright focus:outline-none cursor-pointer truncate w-full"
            >
              <option value="" className="bg-[#12161E] text-slate-muted">
                Portfolio Mode (All Applications)
              </option>
              {applications.map((app: any) => (
                <option key={app.id} value={app.id} className="bg-[#12161E] text-silver">
                  {app.applicationNumber} — {app.institution?.name?.split(' ')[0] || 'Institution'}
                </option>
              ))}
            </select>
          </div>

          {/* Chat vs Sources Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-muted hover:text-silver'
              }`}
            >
              Conversation
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'sources'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-muted hover:text-silver'
              }`}
            >
              <BookOpen size={11} />
              <span>Source Norms</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DRAWER BODY: CHAT STREAM OR APPROVED SOURCES                */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'sources' ? (
          /* Approved Sources Catalog Tab */
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-gunmetal/40 border border-graphite-border text-xs text-slate-muted">
              <span className="font-semibold text-platinum block mb-1">Approved Regulatory Knowledge Repository</span>
              PRISM Copilot synthesizes regulatory advice directly from these certified legal baselines and official AICTE gazette notifications.
            </div>

            {sourceDocuments.map((src, idx) => (
              <div
                key={`src-${idx}`}
                className="p-3.5 rounded-xl bg-[#11141B] border border-white/10 space-y-2 hover:border-[#F5BA42]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#F5BA42] font-semibold">
                      {src.category}
                    </span>
                    <h4 className="text-xs font-bold text-silver-bright mt-0.5">{src.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-platinum bg-black/50 px-2 py-0.5 rounded border border-white/10">
                    {src.clause}
                  </span>
                </div>
                <p className="text-[11px] text-slate-muted italic bg-black/30 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                  "{src.excerpt}"
                </p>
                <div className="text-[9px] font-mono text-slate-muted flex items-center justify-between pt-1">
                  <span>Authority: {src.authority}</span>
                  <span className="text-status-success font-medium flex items-center gap-1">
                    <Check size={11} /> Verified Active Norm
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Conversation Stream */
          <>
            {/* Quick Context Banner if application selected */}
            {currentApp && (
              <div className="p-2.5 rounded-xl bg-[#151922] border border-[#F5BA42]/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F5BA42]" />
                  <span className="text-silver-bright font-bold">{currentApp.applicationNumber}</span>
                  <span className="text-slate-muted">•</span>
                  <span className="text-silver truncate max-w-[180px]">{currentApp.institution?.name}</span>
                </div>
                <Link
                  to={`/applications/${currentApp.id}`}
                  className="text-[11px] text-[#F5BA42] hover:underline inline-flex items-center gap-1"
                >
                  <span>Dossier</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-2 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Bubble Body */}
                <div
                  className={`p-3.5 rounded-2xl text-xs max-w-[92%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-platinum to-silver text-obsidian font-medium rounded-tr-sm shadow-md'
                      : 'bg-[#12161E] border border-white/10 text-silver rounded-tl-sm shadow-lg'
                  }`}
                >
                  {/* Clean Markdown rendering */}
                  <div className="space-y-2 prose-invert text-xs">
                    {(msg.content || '').split('\n\n').map((paragraph, pIdx) => {
                      if (!paragraph) return null;
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={pIdx} className="text-sm font-bold text-silver-bright pt-1 pb-0.5 border-b border-white/10">
                            {paragraph.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (paragraph.startsWith('* ') || paragraph.startsWith('- ')) {
                        return (
                          <ul key={pIdx} className="space-y-1 list-disc pl-4 text-silver/90">
                            {paragraph.split('\n').map((line, lIdx) => (
                              <li key={lIdx}>{(line || '').replace(/^[\*\-]\s+/, '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={pIdx} className="text-silver/90 leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>

                  {/* Approved Source References Badges */}
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5BA42] font-semibold flex items-center gap-1">
                        <BookOpen size={11} />
                        Approved Statutory References:
                      </span>
                      <div className="space-y-1">
                        {msg.references.map((ref, rIdx) => {
                          const refKey = `${msg.id}-ref-${rIdx}`;
                          const isExpanded = expandedRefIndex === refKey;

                          return (
                            <div key={refKey} className="rounded-lg bg-black/40 border border-white/5 overflow-hidden">
                              <button
                                onClick={() => setExpandedRefIndex(isExpanded ? null : refKey)}
                                className="w-full text-left p-2 flex items-center justify-between text-[11px] font-mono text-platinum hover:text-white cursor-pointer"
                              >
                                <span className="font-semibold text-[#F5BA42]">[{ref.clause}]</span>
                                <span className="truncate max-w-[200px] text-slate-muted pl-2 text-[10px]">{ref.title}</span>
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                              {isExpanded && (
                                <div className="p-2.5 pt-0 text-[11px] text-slate-muted border-t border-white/5 space-y-1 bg-black/30">
                                  <p className="italic text-silver/90 leading-relaxed">"{ref.excerpt}"</p>
                                  <span className="block text-[9px] font-mono text-slate-muted">Authority: {ref.authority}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Generated Interactive Checklist Widget */}
                  {msg.checklist && msg.checklist.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-platinum font-bold flex items-center gap-1.5">
                          <CheckSquare size={13} className="text-[#F5BA42]" />
                          Actionable Compliance Checklist
                        </span>
                        <button
                          onClick={() => copyChecklistToClipboard(msg.checklist!)}
                          className="liquid-glass-pill px-2 py-0.5 rounded text-[10px] font-mono text-slate-muted hover:text-white inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={10} />
                          <span>Copy checklist</span>
                        </button>
                      </div>

                      {/* Checklist Items */}
                      <div className="space-y-2">
                        {msg.checklist.map((item) => {
                          const isCompleted = completedChecklistIds.has(item.id);

                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isCompleted
                                  ? 'bg-status-success/10 border-status-success/30 opacity-70'
                                  : 'bg-black/40 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <button
                                  onClick={() => toggleChecklistItem(item.id)}
                                  className="mt-0.5 text-[#F5BA42] cursor-pointer hover:scale-110 transition-transform shrink-0"
                                >
                                  {isCompleted ? (
                                    <CheckSquare size={15} className="text-status-success" />
                                  ) : (
                                    <Square size={15} />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-xs font-semibold ${
                                      isCompleted ? 'line-through text-slate-muted' : 'text-silver-bright'
                                    }`}
                                  >
                                    {item.task}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-muted">
                                    <span className="flex items-center gap-1 text-platinum">
                                      <User size={10} />
                                      {item.owner}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-[#F5BA42]">
                                      <Clock size={10} />
                                      {item.deadline}
                                    </span>
                                  </div>
                                </div>

                                <Link
                                  to={item.actionUrl}
                                  onClick={closeCopilot}
                                  className="platinum-button-primary px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1"
                                >
                                  <span>{item.actionLabel}</span>
                                  <ArrowRight size={10} />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-1 text-[9px] font-mono text-slate-muted text-right">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Generating Shimmer Indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#F5BA42] p-3 rounded-xl bg-[#12161E] border border-white/10 animate-pulse">
                <Sparkles size={14} className="animate-spin" />
                <span>PRISM Copilot is verifying approved regulatory sources...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. SUGGESTED PROMPT CHIPS & BOTTOM INPUT BAR                    */}
      {/* ============================================================== */}
      <div className="p-3.5 border-t border-white/10 bg-[#0A0D12] space-y-2.5">
        {/* Suggested Prompts Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            'Why is this application at risk?',
            'Generate a checklist of next steps',
            'What documents are missing or expired?',
            'Who owns the next action?',
            'Can we grant a provisional undertaking?',
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isGenerating}
              className="liquid-glass-pill px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-muted hover:text-silver whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about risk, missing documents, deadlines, or rules..."
            disabled={isGenerating}
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-silver placeholder-slate-muted focus:outline-none focus:border-[#F5BA42]/70 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isGenerating}
            className="platinum-button-primary p-2.5 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Send message to Copilot"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default CopilotDrawer;
