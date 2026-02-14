import React, { useState, useRef } from 'react';
import {
    File,
    Folder,
    Download,
    Share2,
    Trash2,
    ExternalLink,
    MoreVertical,
    Move,
    FileText,
    Image,
    Film,
    Music,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    Presentation,
    Database,
    FileJson
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { FileItem, FolderItem } from '../../types';
import { formatFileSize } from '../../utils/formatting';

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

    if (mimeType.startsWith('image/')) return 'text-pink-500 bg-pink-50 dark:bg-pink-900/20';
    if (mimeType.startsWith('video/')) return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
    if (mimeType.startsWith('audio/')) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
    if (mimeType === 'application/pdf') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
    if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    if (mimeType.includes('json') || ext === 'json') return 'text-teal-500 bg-teal-50 dark:bg-teal-900/20';
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || ['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
    if (mimeType.includes('sql') || ['sql', 'db'].includes(ext)) return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
    if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(ext)) return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';

    return 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800';
};

interface FileCardProps {
    item: FileItem | FolderItem;
    type: 'file' | 'folder';
    onClick?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    onPreview?: () => void;
    onMove?: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
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

    // Get icon and color for files
    const fileItem = !isFolder ? (item as FileItem) : null;
    const FileIcon = !isFolder && fileItem ? getFileIcon(fileItem.mime_type || '', fileItem.original_filename) : null;
    const iconColorClass = !isFolder && fileItem ? getIconColorClass(fileItem.mime_type || '', fileItem.original_filename) : '';

    // Handle double-click to preview
    const handleDoubleClick = () => {
        if (!isFolder && onPreview) {
            onPreview();
        }
    };

    return (
        <div
            className="group relative bg-surface hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center h-48"
            onClick={onClick}
            onDoubleClick={handleDoubleClick}
            title={!isFolder && onPreview ? "Double-click to preview" : undefined}
        >
            <div className={`mb-3 p-3 rounded-full group-hover:scale-110 transition-transform duration-200 ${isFolder ? 'bg-blue-50 dark:bg-blue-900/20' : iconColorClass}`}>
                {isFolder ? (
                    <Folder className="h-10 w-10 text-blue-500 fill-blue-500/20" />
                ) : FileIcon ? (
                    <FileIcon className="h-10 w-10" />
                ) : (
                    <File className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                )}
            </div>

            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate w-full px-2">
                {isFolder ? (item as FolderItem).name : (item as FileItem).original_filename}
            </h3>

            {!isFolder && (
                <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize((item as FileItem).size_bytes)}
                </p>
            )}

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1 flex space-x-1" onClick={(e) => e.stopPropagation()}>
                {!isFolder && onDownload && (
                    <button onClick={onDownload} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300" title="Download">
                        <Download className="h-4 w-4" />
                    </button>
                )}
                {!isFolder && onPreview && (
                    <button onClick={onPreview} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300" title="Preview">
                        <ExternalLink className="h-4 w-4" />
                    </button>
                )}
                {onDelete && (
                    <button onClick={onDelete} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-red-600 dark:text-red-400" title="Delete">
                        <Trash2 className="h-4 w-4" />
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
                                        left: rect.right - 160
                                    });
                                }
                                setOpenDropdown(!openDropdown);
                            }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300"
                            title="More actions"
                        >
                            <MoreVertical className="h-4 w-4" />
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
                                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
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
                                                className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
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
