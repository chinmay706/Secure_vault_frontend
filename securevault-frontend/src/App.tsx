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
import { ToastContainer } from './components/ui/Toast';

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
  );
}

export default App;