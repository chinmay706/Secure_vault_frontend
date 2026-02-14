import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { logStart } from '../../utils/log';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const { user, login, signup, setToken } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const timer = logStart('[AUTH]', `form-${mode}`, { email: formData.email });

    // Basic validation
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      timer.err({ reason: 'validation-failed', errors: Object.keys(newErrors) });
      return;
    }

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.email, formData.password);
      }

      timer.ok({ success: true });
      // Navigation is handled by AuthContext after successful auth
      navigate('/app');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setErrors({ submit: errorMessage });
      timer.err(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800 backdrop-blur-sm">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? (
              <>
                New to SecureVault?{' '}
                <Link to="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              placeholder="name@example.com"
              autoComplete="email"
              className="bg-background"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="bg-background"
            />
          </div>

          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center border border-red-100 dark:border-red-900/30">
              {errors.submit}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20"
            loading={isLoading}
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-gray-500">or</span>
            </div>
          </div>

          {/* Google Sign-in */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const res = await fetch(
                    `${import.meta.env.VITE_REST_BASE_URL}/auth/google`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id_token: credentialResponse.credential }),
                    }
                  );
                  const data = await res.json();
                  if (res.ok) {
                    setToken(data.token, data.user);
                    navigate('/app');
                  } else {
                    setErrors({ submit: data.error?.message || 'Google login failed' });
                  }
                } catch (err) {
                  console.error('Google login failed:', err);
                  setErrors({ submit: 'Google login failed. Please try again.' });
                }
              }}
              onError={() => {
                console.error('Google Login Failed');
                setErrors({ submit: 'Google login failed. Please try again.' });
              }}
            />
          </div>
        </form>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} SecureVault. All rights reserved.
      </div>
    </div>
  );
};
