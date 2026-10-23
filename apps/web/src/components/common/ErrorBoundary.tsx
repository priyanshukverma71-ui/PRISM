import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PRISM ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 bg-obsidian">
          <div className="max-w-md w-full bg-graphite border border-graphite-border rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-status-warning/15 border border-status-warning/30 text-status-warning flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-silver-bright">
                {this.props.fallbackTitle || 'Unable to display this view'}
              </h3>
              <p className="text-xs text-slate-muted leading-relaxed">
                {this.props.fallbackMessage ||
                  "We couldn't load this section of the workspace. Your data is secure. Try refreshing or return to Overview."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="liquid-glass-pill px-4 py-2 rounded-xl text-xs font-semibold text-silver hover:text-white inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Reload workspace</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="liquid-glass-pill-active px-4 py-2 rounded-xl text-xs font-semibold text-obsidian inline-flex items-center gap-2 cursor-pointer"
              >
                <Home size={14} />
                <span>Return to Overview</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
