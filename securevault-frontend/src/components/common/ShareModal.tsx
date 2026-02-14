import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Lock, Link as LinkIcon, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { FileItem, FolderItem } from '../../types';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: FileItem | FolderItem | null;
    itemType: 'file' | 'folder';
}

interface ShareLinkInfo {
    token: string;
    isPublic: boolean;
    shareUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    item,
    itemType
}) => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [shareInfo, setShareInfo] = useState<ShareLinkInfo | null>(null);
    const [copied, setCopied] = useState(false);

    // Get the base URL for share links
    const baseUrl = window.location.origin;
    const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

    const loadShareInfo = useCallback(async () => {
        if (!item || !token) return;

        setLoading(true);
        try {
            if (itemType === 'file') {
                // Get file details to check if it's public and get share token
                const response = await fetch(`${restBaseUrl}/files/${item.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    const fileData = result.file || result;

                    if (fileData.is_public) {
                        if (fileData.share_link?.token) {
                            setShareInfo({
                                token: fileData.share_link.token,
                                isPublic: true,
                                shareUrl: `${baseUrl}/public/files/share/${fileData.share_link.token}`
                            });
                        } else {
                            setShareInfo({
                                token: '',
                                isPublic: true,
                                shareUrl: ''
                            });
                        }
                    } else {
                        setShareInfo({
                            token: '',
                            isPublic: false,
                            shareUrl: ''
                        });
                    }
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'Failed to load file details');
                }
            } else {
                // For folders
                const response = await fetch(`${restBaseUrl}/folders/${item.id}/share/status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const shareStatus = await response.json();

                    if (shareStatus.has_share_link && shareStatus.token) {
                        setShareInfo({
                            token: shareStatus.token,
                            isPublic: true,
                            shareUrl: `${baseUrl}/p/f/${shareStatus.token}`
                        });
                    } else {
                        setShareInfo({
                            token: '',
                            isPublic: false,
                            shareUrl: ''
                        });
                    }
                } else {
                    setShareInfo({
                        token: '',
                        isPublic: false,
                        shareUrl: ''
                    });
                }
            }
        } catch (error) {
            addToast('error', 'Failed to load share information');
        } finally {
            setLoading(false);
        }
    }, [item, token, itemType, restBaseUrl, baseUrl, addToast]);

    useEffect(() => {
        if (isOpen && item) {
            loadShareInfo();
        } else {
            setShareInfo(null);
        }
    }, [isOpen, item, loadShareInfo]);

    const togglePublicStatus = async () => {
        if (!item || !token) return;

        setLoading(true);
        try {
            if (itemType === 'file') {
                const newIsPublic = !shareInfo?.isPublic;
                const response = await fetch(`${restBaseUrl}/files/${item.id}/public`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        is_public: newIsPublic
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    const updatedFile = result.file;

                    if (updatedFile.is_public) {
                        if (updatedFile.share_link?.token) {
                            setShareInfo({
                                token: updatedFile.share_link.token,
                                isPublic: true,
                                shareUrl: `${baseUrl}/public/files/share/${updatedFile.share_link.token}`
                            });
                        } else {
                            setShareInfo({
                                token: '',
                                isPublic: true,
                                shareUrl: ''
                            });
                        }
                        addToast('success', 'File is now public');
                    } else {
                        setShareInfo({
                            token: '',
                            isPublic: false,
                            shareUrl: ''
                        });
                        addToast('success', 'File is now private');
                    }
                } else {
                    throw new Error('Failed to toggle file visibility');
                }
            } else {
                // Toggle folder public status
                if (shareInfo?.isPublic) {
                    const response = await fetch(`${restBaseUrl}/folders/${item.id}/share`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        setShareInfo({ token: '', isPublic: false, shareUrl: '' });
                        addToast('success', 'Folder share link removed');
                    } else {
                        throw new Error('Failed to remove folder share link');
                    }
                } else {
                    const response = await fetch(`${restBaseUrl}/folders/${item.id}/share`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const shareLink = await response.json();
                        setShareInfo({
                            token: shareLink.token,
                            isPublic: true,
                            shareUrl: `${baseUrl}/p/f/${shareLink.token}`
                        });
                        addToast('success', 'Folder is now publicly shareable');
                    } else {
                        throw new Error('Failed to create folder share link');
                    }
                }
            }
        } catch (error) {
            addToast('error', `Failed to update ${itemType} sharing`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!shareInfo?.shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareInfo.shareUrl);
            setCopied(true);
            addToast('success', 'Link copied');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('error', 'Failed to copy link');
        }
    };

    if (!item) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Share "${'original_filename' in item ? item.original_filename : item.name}"`} size="md">
            <div className="space-y-6">
                {/* Add People Section (Visual Only for now) */}
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Add people, groups, or emails"
                            className="w-full pl-4 pr-12 py-3 bg-surface border border-outline rounded-xl text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            disabled
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <UserPlus className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        People with access will appear here
                    </p>
                </div>

                {/* General Access Section */}
                <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-medium text-foreground px-1">
                        General access
                    </h3>

                    <div className="flex items-start space-x-3 p-1">
                        <div className={`mt-1 p-2 rounded-full ${shareInfo?.isPublic ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                            {shareInfo?.isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                        </div>

                        <div className="flex-1 space-y-1">
                            <div className="relative group">
                                <button
                                    onClick={togglePublicStatus}
                                    disabled={loading}
                                    className="flex items-center space-x-2 text-sm font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-md -ml-2 transition-colors"
                                >
                                    <span>{shareInfo?.isPublic ? 'Anyone with the link' : 'Restricted'}</span>
                                    <span className="text-xs text-gray-400">▼</span>
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {shareInfo?.isPublic
                                    ? 'Anyone on the internet with the link can view'
                                    : 'Only people with access can open with the link'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-6 mt-2 border-t border-outline">
                    <Button
                        variant="secondary"
                        onClick={copyToClipboard}
                        disabled={!shareInfo?.isPublic || !shareInfo?.shareUrl}
                        className="!rounded-full !px-6"
                    >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {copied ? 'Copied link' : 'Copy link'}
                    </Button>

                    <Button
                        onClick={onClose}
                        className="!rounded-full !px-6 bg-primary hover:bg-primary/90 text-white"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </Modal>
    );
};