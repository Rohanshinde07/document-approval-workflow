import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar } from './components/Sidebar.js';
import { LoginPage } from './pages/LoginPage.js';
import { QueuePage } from './pages/QueuePage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { ProjectDetailPage } from './pages/ProjectDetailPage.js';
import { DocumentDetailPage } from './pages/DocumentDetailPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { InviteAcceptPage } from './pages/InviteAcceptPage.js';
import { AllDocumentsPage } from './pages/AllDocumentsPage.js';

import { PersonaBanner } from './components/PersonaBanner.js';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="enterprise-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <PersonaBanner />
        <main className="main-content" style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin =
    user.role === 'ADMIN' ||
    user.email === 'admin@demo.com' ||
    user.email.startsWith('admin@');

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="enterprise-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <PersonaBanner />
        <main className="main-content" style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <QueuePage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedLayout>
                <ProjectsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedLayout>
                <ProjectDetailPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedLayout>
                <AllDocumentsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <ProtectedLayout>
                <DocumentDetailPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          {/* Public invite accept page — no auth wrapper */}
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
