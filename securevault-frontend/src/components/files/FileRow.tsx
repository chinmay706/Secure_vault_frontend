import React, { useState, useRef, useEffect } from 'react';
import {
    File,
    Folder,
    Download,
    Share2,
    Trash2,
    Eye,
    Globe,
    Lock,
    FileText,
    Image,
    Film,
    Music,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    Presentation,
    Database,
    FileJson,
    MoreVertical,
    Move
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { FileItem, FolderItem } from '../../types';
import { formatFileSize } from '../../utils/formatting';

interface FileRowProps {
    item: FileItem | FolderItem;
    type: 'file' | 'folder';
    onClick?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    onPreview?: () => void;
    onMove?: () => void;
}

// Get file icon component based on mime type
const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return Presentation;
    if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return FileArchive;
    if (mimeType.includes('json') || ext === 'json') return FileJson;
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return FileCode;
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'html', 'css', 'xml'].includes(ext)) return FileCode;
    if (mimeType.includes('sql') || ['sql', 'db'].includes(ext)) return Database;
    if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(ext)) return FileText;

    return File;
};

// Get icon color classes based on mime type
const getIconColorClass = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (mimeType.startsWith('image/')) return 'text-pink-500';
    if (mimeType.startsWith('video/')) return 'text-purple-500';
    if (mimeType.startsWith('audio/')) return 'text-orange-500';
    if (mimeType === 'application/pdf') return 'text-red-500';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'text-amber-500';
    if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return 'text-blue-500';
    if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'text-yellow-600';
    if (mimeType.includes('json') || ext === 'json') return 'text-teal-500';
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || ['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'text-emerald-500';
    if (mimeType.includes('sql') || ['sql', 'db'].includes(ext)) return 'text-indigo-500';
    if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(ext)) return 'text-slate-500';

    return 'text-gray-400 dark:text-gray-500';
};

export const FileRow: React.FC<FileRowProps> = ({
    item,
    type,
    onClick,
    onDownload,
    onDelete,
    onShare,
    onPreview,
    onMove
}) => {
    const [openDropdown, setOpenDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isFolder = type === 'folder';
    const name = isFolder ? (item as FolderItem).name : (item as FileItem).original_filename;
    const date = isFolder ? (item as FolderItem).created_at : (item as FileItem).created_at;
    const size = isFolder ? '-' : formatFileSize((item as FileItem).size_bytes);
    const fileType = isFolder ? 'Folder' : (item as FileItem).mime_type || 'File';

    // Get icon for files
    const FileIcon = !isFolder ? getFileIcon((item as FileItem).mime_type || '', name) : Folder;
    const iconColorClass = !isFolder ? getIconColorClass((item as FileItem).mime_type || '', name) : 'text-blue-500 fill-blue-100 dark:fill-blue-500/20';

    // Check if item is publicly shared
    const isShared = () => {
        if (isFolder) {
            return (item as FolderItem).share_link?.is_active;
        }
        return (item as FileItem).is_public || (item as FileItem).share_link?.is_active;
    };

    // Get tags for files
    const tags = !isFolder ? (item as FileItem).tags || [] : [];

    // Handle double-click to preview
    const handleDoubleClick = () => {
        if (!isFolder && onPreview) {
            onPreview();
        }
    };

    return (
        <div
            className="group flex items-center px-2 sm:px-4 py-2.5 sm:py-3 hover:bg-blue-50 dark:hover:bg-gray-800/70 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-all duration-150 active:bg-blue-100 dark:active:bg-gray-700"
            onClick={onClick}
            onDoubleClick={handleDoubleClick}
        >
            {/* Name Column */}
            <div className="flex-1 flex items-center min-w-0 pr-2 sm:pr-4">
                <div className="mr-2 sm:mr-3 shrink-0">
                    <FileIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColorClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</span>
                        {/* Shared indicator */}
                        {isShared() ? (
                            <Globe className="h-3.5 w-3.5 text-green-500 shrink-0" title="Publicly shared" />
                        ) : !isFolder ? (
                            <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block" title="Private" />
                        ) : null}
                    </div>
                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                            {tags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded truncate max-w-[80px]">
                                    {tag}
                                </span>
                            ))}
                            {tags.length > 2 && (
                                <span className="text-[10px] text-gray-400">+{tags.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Date Column */}
            <div className="w-24 md:w-32 hidden md:block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {date ? new Date(date).toLocaleDateString() : '-'}
            </div>

            {/* Type Column */}
            <div className="w-24 lg:w-28 hidden lg:block text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {fileType}
            </div>

            {/* Size Column */}
            <div className="w-16 sm:w-20 hidden sm:block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {size}
            </div>

            {/* Actions Column - Responsive */}
            <div className="w-auto sm:w-28 md:w-36 flex justify-end items-center gap-0.5 sm:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!isFolder && onPreview && (
                    <button
                        onClick={onPreview}
                        className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Preview"
                    >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                )}
                {!isFolder && onDownload && (
                    <button
                        onClick={onDownload}
                        className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors hidden sm:block"
                        title="Download"
                    >
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                )}
                {/* Delete button - Red */}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-1.5 sm:p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                )}
                {/* More actions dropdown for Share and Move */}
                {(onShare || onMove) && (
                    <div className="relative">
                        <button
                            ref={buttonRef}
                            onClick={() => {
                                if (!openDropdown && buttonRef.current) {
                                    const rect = buttonRef.current.getBoundingClientRect();
                                    setDropdownPosition({
                                        top: rect.bottom + 4,
                                        left: rect.right - 160 // 160 = w-40 = 10rem
                                    });
                                }
                                setOpenDropdown(!openDropdown);
                            }}
                            className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            title="More actions"
                        >
                            <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>

                        {openDropdown && createPortal(
                            <>
                                <div
                                    className="fixed inset-0 z-[100]"
                                    onClick={() => setOpenDropdown(false)}
                                />
                                <div
                                    className="fixed w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[101] overflow-hidden animate-slide-down"
                                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                                >
                                    <div className="py-1">
                                        {onShare && (
                                            <button
                                                onClick={() => {
                                                    onShare();
                                                    setOpenDropdown(false);
                                                }}
                                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors active:bg-gray-200 dark:active:bg-gray-600"
                                            >
                                                <Share2 className="h-4 w-4 mr-3 text-blue-500" />
                                                Share
                                            </button>
                                        )}
                                        {onMove && (
                                            <button
                                                onClick={() => {
                                                    onMove();
                                                    setOpenDropdown(false);
                                                }}
                                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors active:bg-gray-200 dark:active:bg-gray-600"
                                            >
                                                <Move className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400" />
                                                Move
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>,
                            document.body
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
