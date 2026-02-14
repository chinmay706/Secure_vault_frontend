import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { authApi } from '../../lib/api';
import { logStart } from '../../utils/log';

export const AdminAuthForm: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (user) {
        return <Navigate to="/app" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);

        const timer = logStart('[AUTH]', 'admin-signup', { email: formData.email });

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
            await authApi.adminSignup(formData.email, formData.password);

            timer.ok({ success: true });
            setSuccess(true);

            // Auto-redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Admin registration failed. Please try again.';
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

    if (success) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                        <UserCog className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-green-400 mb-2">
                            Admin Account Created Successfully!
                        </h2>
                        <p className="text-green-300 mb-4">
                            Your admin account has been registered. You will be redirected to the login page shortly.
                        </p>
                        <div className="flex space-x-4 justify-center">
                            <Button
                                onClick={() => navigate('/login')}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Go to Login
                            </Button>
                            <Link
                                to="/admin/signup"
                                className="text-green-400 hover:text-green-300 underline flex items-center"
                            >
                                Create Another Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="p-3 bg-orange-600 rounded-lg">
                            <UserCog className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-white">
                        Create Admin Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Register a new administrator account for SecureVault
                    </p>
                    <div className="mt-4 p-3 bg-orange-900 border border-orange-700 rounded-lg">
                        <p className="text-orange-300 text-sm">
                            ⚠️ Admin accounts have full system access including user management and file administration.
                        </p>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Admin Email Address"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            error={errors.email}
                            placeholder="Enter admin email"
                            autoComplete="email"
                        />

                        <Input
                            label="Admin Password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            error={errors.password}
                            placeholder="Enter secure password"
                            autoComplete="new-password"
                        />
                    </div>

                    {errors.submit && (
                        <div className="text-red-400 text-sm text-center bg-red-900 border border-red-700 rounded p-3">
                            {errors.submit}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        loading={isLoading}
                    >
                        Create Admin Account
                    </Button>

                    <div className="text-center">
                        <Link
                            to="/signup"
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            Create regular user account instead
                        </Link>
                        <span className="text-gray-400 mx-2">|</span>
                        <Link
                            to="/login"
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            Already have an account? Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};