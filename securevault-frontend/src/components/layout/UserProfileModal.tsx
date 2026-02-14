import React, { useState } from 'react';
import { Lock, Cloud, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { userApi } from '../../lib/api';
import { formatFileSize } from '../../utils/formatting';
import { StatsResponse } from '../../types';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: StatsResponse | null;
    statsLoading: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
    isOpen,
    onClose,
    stats,
    // statsLoading is unused in UI but kept for interface consistency
}) => {
    const { user, logout } = useAuth();
    const { addToast } = useToast();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [activeTab, setActiveTab] = useState<'overview' | 'security'>('overview');

    if (!user) return null;

    const handleClose = () => {
        // Reset all form states
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
        setChangingPassword(false);
        setShowDeleteConfirm(false);
        setDeletingAccount(false);
        setShowCurrentPassword(false);
        setShowPassword(false);
        setShowConfirmPassword(false);
        setActiveTab('overview');
        onClose();
    };

    const handlePasswordChange = async () => {
        setErrors({});
        const newErrors: { [key: string]: string } = {};
        if (!currentPassword) newErrors.currentPassword = 'Current password is required';
        if (!newPassword) newErrors.password = 'New password is required';
        if (newPassword.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setChangingPassword(true);
        try {
            await userApi.changePassword(user.id, currentPassword, newPassword);
            addToast('success', 'Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
            addToast('error', errorMessage);
            setErrors({ submit: errorMessage });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeletingAccount(true);
        try {
            await userApi.deleteAccount(user.id);
            localStorage.removeItem('sv.auth.token');
            localStorage.removeItem('sv.auth.user');
            sessionStorage.clear();
            addToast('success', 'Account deleted successfully');
            window.location.reload();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
            addToast('error', errorMessage);
            setDeletingAccount(false);
            setShowDeleteConfirm(false);
        }
    };

    const quotaUtilization = stats
        ? (stats.quota_used_bytes && stats.quota_bytes)
            ? (stats.quota_used_bytes / stats.quota_bytes) * 100
            : 0
        : 0;

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleClose} size="md" className="!p-0 overflow-hidden">
                <div className="flex flex-col h-full bg-surface">
                    {/* Header Profile Section */}
                    <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-surface">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-medium shadow-lg mb-4">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-surface rounded-full p-1 shadow-md border border-outline">
                                <Shield className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                        <h2 className="text-xl font-medium text-foreground">{user.email}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">SecureVault Account</p>
                            {user.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                    Admin
                                </span>
                            )}
                        </div>

                        <div className="flex mt-6 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'overview'
                                    ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`px-6 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'security'
                                    ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Security
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'overview' ? (
                            <div className="space-y-4">
                                {/* Storage Card */}
                                <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <Cloud className="h-5 w-5 text-primary" />
                                            <span className="font-medium text-foreground">Storage</span>
                                        </div>
                                        <span className="text-sm text-primary font-medium">
                                            {quotaUtilization.toFixed(0)}% used
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-3">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(quotaUtilization, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>{stats ? formatFileSize(stats.total_size_bytes) : '0 B'} used</span>
                                        <span>{stats?.quota_bytes ? formatFileSize(stats.quota_bytes) : 'Unlimited'} total</span>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-outline flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Total Files</span>
                                        <span className="font-medium text-foreground">{stats?.total_files || 0}</span>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-outline">
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-outline">
                                        <div className="flex items-center space-x-3">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                            <span className="text-foreground">Password & Security</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <LogOut className="h-5 w-5 text-gray-400" />
                                            <span className="text-foreground">Sign out</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Change Password */}
                                <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline">
                                    <h3 className="text-lg font-medium text-foreground mb-4">Change Password</h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="Current Password"
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            error={errors.currentPassword}
                                            className="bg-gray-50 dark:bg-gray-900"
                                        />
                                        <Input
                                            label="New Password"
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            error={errors.password}
                                            className="bg-gray-50 dark:bg-gray-900"
                                        />
                                        <Input
                                            label="Confirm New Password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            error={errors.confirmPassword}
                                            className="bg-gray-50 dark:bg-gray-900"
                                        />
                                        <Button
                                            onClick={handlePasswordChange}
                                            disabled={!newPassword || !confirmPassword || changingPassword}
                                            loading={changingPassword}
                                            className="w-full"
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-5 border border-red-100 dark:border-red-900/30">
                                    <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">Delete Account</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Permanently delete your account and all data. This action cannot be undone.
                                    </p>
                                    <Button
                                        variant="danger"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={deletingAccount}
                                        className="w-full"
                                    >
                                        Delete Account
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteAccount}
                title="Delete Account"
                message={`Are you sure you want to delete your account?\n\nThis will permanently delete:\n• Your account (${user.email})\n• All your files and folders\n• All sharing links`}
                confirmText="Delete My Account"
                cancelText="Cancel"
                variant="danger"
                loading={deletingAccount}
            />
        </>
    );
};