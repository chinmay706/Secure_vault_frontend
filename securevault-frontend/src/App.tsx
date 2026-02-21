import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { apolloClient } from './lib/apollo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useToast } from './hooks/useToast';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AdminSignupPage } from './pages/AdminSignupPage';
import { MainPage } from './pages/MainPage';
import { AdminPage } from './pages/AdminPage';
import { AdminFilesPage } from './pages/AdminFilesPage';
import { PublicFolderPage } from './pages/PublicFolderPage';
import { PublicFilePage } from './pages/PublicFilePage';
import { SharedFilesPage } from './pages/SharedFilesPage';
import { TrashPage } from './pages/TrashPage';
import { TagExplorerPage } from './pages/TagExplorerPage';
import { AiOverviewPage } from './pages/AiOverviewPage';
import { FileConverterPage } from './pages/FileConverterPage';
import { ToastContainer } from './components/ui/Toast';

// Error Boundary to catch runtime crashes and show the error instead of black screen
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#1a1a2e', color: '#eee', minHeight: '100vh' }}>
          <h1 style={{ color: '#e74c3c', marginBottom: '16px' }}>Something went wrong</h1>
          <pre style={{ background: '#16213e', padding: '20px', borderRadius: '8px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#ff6b6b' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ background: '#16213e', padding: '20px', borderRadius: '8px', overflow: 'auto', marginTop: '12px', fontSize: '12px', color: '#a0a0a0', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/app'; }}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
          >
            Go to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toasts, removeToast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin/signup" element={<AdminSignupPage />} />
          <Route path="/public/files/share/:token" element={<PublicFilePage />} />
          <Route path="/public/folders/share/:token" element={<PublicFolderPage />} />
          <Route path="/p/f/:token" element={<PublicFolderPage />} />

          {/* Protected routes */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<MainPage />} />
            <Route path="folder/:folderId" element={<MainPage />} />
            <Route path="shared" element={<SharedFilesPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="tags" element={<TagExplorerPage />} />
            <Route path="ai-overview" element={<AiOverviewPage />} />
            <Route path="converter" element={<FileConverterPage />} />
          </Route>

          {/* Admin routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="/admin" element={<AppShell />}>
                <Route index element={<AdminPage />} />
                <Route path="files" element={<AdminFilesPage />} />
              </Route>
            </>
          )}

          {/* Redirects */}
          <Route path="/" element={
            user ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </BrowserRouter>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ApolloProvider client={apolloClient}>
          <AuthProvider>
            <ToastProvider>
              <ThemeProvider>
                <AppRoutes />
              </ThemeProvider>
            </ToastProvider>
          </AuthProvider>
        </ApolloProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;