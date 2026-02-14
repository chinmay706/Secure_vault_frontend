import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: React.ReactNode;
    loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    icon,
    loading = false
}) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconColor: 'text-red-500 dark:text-red-400',
                    iconBg: 'bg-red-50 dark:bg-red-900/20',
                    confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                };
            case 'warning':
                return {
                    iconColor: 'text-yellow-600 dark:text-yellow-400',
                    iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
                    confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                };
            case 'info':
                return {
                    iconColor: 'text-primary',
                    iconBg: 'bg-primary/10',
                    confirmButton: 'bg-primary hover:bg-primary/90 focus:ring-primary'
                };
        }
    };

    const styles = getVariantStyles();
    const defaultIcon = variant === 'danger' ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />;

    const handleConfirm = () => {
        if (!loading) {
            onConfirm();
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title=""
            size="sm"
        >
            <div className="space-y-6">
                {/* Icon and Title */}
                <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 p-3 rounded-xl ${styles.iconBg} ${styles.iconColor}`}>
                        {icon || defaultIcon}
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="text-lg font-medium text-foreground">
                            {title}
                        </h3>
                    </div>
                </div>

                {/* Message */}
                <div className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {message}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        className={`text-white ${styles.confirmButton} disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};