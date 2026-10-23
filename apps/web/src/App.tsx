import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Pages
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ApplicationsPage } from './pages/ApplicationsPage.js';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage.js';
import { NewApplicationPage } from './pages/NewApplicationPage.js';
import { WorkflowMapPage } from './pages/WorkflowMapPage.js';
import { FutureLabPage } from './pages/FutureLabPage.js';
import { EVCPage } from './pages/EVCPage.js';
import { CompliancePage } from './pages/CompliancePage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { DeadlinesPage } from './pages/DeadlinesPage.js';
import { TeamPage } from './pages/TeamPage.js';
import { RiskRadarPage } from './pages/RiskRadarPage.js';
import { AlertsPage } from './pages/AlertsPage.js';
import { AuditPage } from './pages/AuditPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { RuleCompilerPage } from './pages/RuleCompilerPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center text-platinum font-mono text-xs">
        <span className="w-2 h-2 rounded-full bg-platinum animate-ping mr-2" />
        Authenticating PRISM Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/new" element={<NewApplicationPage />} />
              <Route path="applications/:id" element={<ApplicationDetailPage />} />
              <Route path="workflow-map" element={<WorkflowMapPage />} />
              <Route path="futurelab" element={<FutureLabPage />} />
              <Route path="evc" element={<EVCPage />} />
              <Route path="compliance" element={<CompliancePage />} />
              <Route path="deadlines" element={<DeadlinesPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="risk-radar" element={<RiskRadarPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="rules" element={<RuleCompilerPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default App;
