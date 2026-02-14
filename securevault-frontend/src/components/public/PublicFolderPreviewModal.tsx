import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, File, X, ExternalLink, Globe, FileText, Image, Film, Music, FileArchive, FileCode, FileSpreadsheet, Presentation, Database, FileJson } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatFileSize, formatDate } from '../../utils/formatting';

// Get file icon based on mime type
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

// Text preview component
interface TextPreviewProps {
    blobUrl: string;
    filename: string;
    mimeType: string;
}

const TextPreview: React.FC<TextPreviewProps> = ({ blobUrl, filename, mimeType }) => {
    const [textContent, setTextContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTextContent = async () => {
            try {
                const response = await fetch(blobUrl);
                const text = await response.text();
                setTextContent(text);
            } catch {
                setTextContent('Error loading file content');
            } finally {
                setLoading(false);
            }
        };

        loadTextContent();
    }, [blobUrl]);

    if (loading) {
        return (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 h-80 flex items-center justify-center border border-gray-200 dark:border-gray-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    const isCode = filename.includes('.') && [
        'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'xml', 'json', 'sql', 'sh'
    ].some(ext => filename.toLowerCase().endsWith(`.${ext}`)) || mimeType.includes('javascript') || mimeType.includes('json');

    return (
        <div className="bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate flex-1">{filename}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                    {filename.split('.').pop()?.toUpperCase()}
                </span>
            </div>
            <div className="p-4 h-72 overflow-auto custom-scrollbar">
                <pre className={`text-sm whitespace-pre-wrap leading-relaxed ${isCode ? 'font-mono text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                {textContent}
            </pre>
            </div>
        </div>
    );
};

// PDF preview component
interface PDFPreviewProps {
    blobUrl: string;
    filename: string;
    onDownload: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ blobUrl, filename, onDownload }) => {
    const [iframeError, setIframeError] = useState(false);
    const [loading, setLoading] = useState(true);

    const handleIframeLoad = () => setLoading(false);
    const handleIframeError = () => {
        setIframeError(true);
        setLoading(false);
    };

    if (iframeError) {
        return (
            <div className="h-80 w-full bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-800">
                <div className="text-center p-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                        <FileText className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mb-2">Preview Not Available</p>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                        Your browser doesn't support inline PDF preview.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button variant="secondary" size="sm" onClick={() => window.open(blobUrl, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-1.5" />
                            Open
                        </Button>
                        <Button size="sm" onClick={onDownload}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Download
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-80 w-full bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden relative border border-gray-200 dark:border-gray-800">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading PDF...</p>
                    </div>
                </div>
            )}
                <iframe
                    src={`${blobUrl}#view=FitH&toolbar=1&navpanes=0`}
                    className="w-full h-full border-0"
                    title={`PDF Preview: ${filename}`}
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    allow="fullscreen"
                />
            {!loading && !iframeError && (
                    <button
                        onClick={() => window.open(blobUrl, '_blank')}
                    className="absolute top-2 right-2 px-2.5 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg transition-colors flex items-center gap-1.5 z-20"
                    >
                    <ExternalLink className="h-3 w-3" />
                    Open
                    </button>
            )}
        </div>
    );
};

interface PublicFolderPreviewModalProps {
    file: {
        id: string;
        original_filename: string;
        mime_type: string;
        size_bytes: number;
        tags: string[];
        download_url: string;
        created_at: string;
        updated_at: string;
    } | null;
    isOpen: boolean;
    onClose: () => void;
    onDownload: (file: any) => void;
    folderToken: string;
}

export const PublicFolderPreviewModal: React.FC<PublicFolderPreviewModalProps> = ({
    file,
    isOpen,
    onClose,
    onDownload,
    folderToken
}) => {
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentBlobUrl = useRef<string | null>(null);
    const currentFileId = useRef<string | null>(null);
    const abortController = useRef<AbortController | null>(null);

    const loadFilePreview = useCallback(async () => {
        if (!file || !isOpen) {
            if (currentBlobUrl.current) {
                URL.revokeObjectURL(currentBlobUrl.current);
                currentBlobUrl.current = null;
            }
            if (abortController.current) {
                abortController.current.abort();
                abortController.current = null;
            }
            setPreviewUrl(null);
            setError(null);
            setLoading(false);
            currentFileId.current = null;
            return;
        }

        // Skip if already loaded for this file
        if (currentFileId.current === file.id && previewUrl) {
            return;
        }

        if (abortController.current) {
            abortController.current.abort();
        }

        abortController.current = new AbortController();
        const signal = abortController.current.signal;

        setLoading(true);
        setError(null);
        currentFileId.current = file.id;

        try {
            const isImageFile = file.mime_type.startsWith('image/');
            const isTextFile = file.mime_type.startsWith('text/') ||
                file.mime_type === 'application/json' ||
                file.mime_type === 'application/javascript' ||
                file.mime_type === 'text/csv';
            const isPDFFile = file.mime_type === 'application/pdf';
            const isVideoFile = file.mime_type.startsWith('video/');

            if (isImageFile || isTextFile || isPDFFile || isVideoFile) {
                // Size limits
                if (isTextFile && file.size_bytes > 500000) {
                    throw new Error('Text file too large for preview (max 500KB)');
                }
                if (isVideoFile && file.size_bytes > 100000000) {
                    throw new Error('Video file too large for preview (max 100MB)');
                }
                if (isPDFFile && file.size_bytes > 50000000) {
                    throw new Error('PDF file too large for preview (max 50MB)');
                }

                // Use the download_url directly from the file object
                const response = await fetch(file.download_url, {
                    method: 'GET',
                    signal
                });

                if (signal.aborted) return;

                if (!response.ok) {
                    throw new Error(`Failed to load preview: ${response.status}`);
                }

                const blob = await response.blob();

                if (signal.aborted) return;

                if (currentBlobUrl.current) {
                    URL.revokeObjectURL(currentBlobUrl.current);
                }

                const url = URL.createObjectURL(blob);
                currentBlobUrl.current = url;
                setPreviewUrl(url);

            } else {
                setPreviewUrl(null);
            }

        } catch (err) {
            if (signal.aborted) return;
            const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
            setError(errorMessage);
            setPreviewUrl(null);
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, [file, isOpen, previewUrl]);

    useEffect(() => {
        loadFilePreview();

        return () => {
            if (abortController.current) {
                abortController.current.abort();
                abortController.current = null;
            }
        };
    }, [loadFilePreview]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (currentBlobUrl.current) {
                URL.revokeObjectURL(currentBlobUrl.current);
                currentBlobUrl.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!file || !isOpen) return null;

    const FileIcon = getFileIcon(file.mime_type, file.original_filename);
    const isImage = file.mime_type.startsWith('image/');
    const isText = file.mime_type.startsWith('text/') ||
        ['application/json', 'application/javascript', 'application/xml', 'text/csv'].includes(file.mime_type);
    const isPDF = file.mime_type === 'application/pdf';
    const isVideo = file.mime_type.startsWith('video/');

    const renderPreview = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-80 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading preview...</p>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-80 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="text-center p-6">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                            <File className="h-7 w-7 text-gray-400" />
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium mb-1">Preview failed</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
                    </div>
                </div>
            );
        }

        if (isImage && previewUrl) {
            return (
                <div className="flex items-center justify-center h-80 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <img
                        src={previewUrl}
                        alt={file.original_filename}
                        className="max-w-full max-h-full object-contain"
                        onError={() => setError('Failed to display image')}
                    />
                </div>
            );
        }

        if (isText && previewUrl) {
            return (
                <TextPreview
                    blobUrl={previewUrl}
                    filename={file.original_filename}
                    mimeType={file.mime_type}
                />
            );
        }

        if (isPDF && previewUrl) {
            return (
                <PDFPreview
                    blobUrl={previewUrl}
                    filename={file.original_filename}
                    onDownload={() => onDownload(file)}
                />
            );
        }

        if (isVideo && previewUrl) {
            return (
                <div className="flex items-center justify-center h-80 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <video
                        src={previewUrl}
                        controls
                        className="max-w-full max-h-full"
                        preload="metadata"
                        onError={() => setError('Failed to display video')}
                    >
                        <track kind="captions" />
                    </video>
                </div>
            );
        }

        // No preview available
            return (
            <div className="flex items-center justify-center h-80 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="text-center p-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                        <FileIcon className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">Preview not available</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Download the file to view it</p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                            <FileIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-gray-900 dark:text-white truncate">{file.original_filename}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>{formatFileSize(file.size_bytes)}</span>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <Globe className="h-3.5 w-3.5" />
                                    Shared
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
                        {/* File Info */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide block mb-1">Type</span>
                            <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{file.mime_type}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide block mb-1">Created</span>
                            <p className="text-gray-900 dark:text-white font-medium text-sm">{formatDate(file.created_at)}</p>
                        </div>
                            </div>

                            {file.tags && file.tags.length > 0 && (
                        <div className="mb-5">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide block mb-2">Tags</span>
                            <div className="flex flex-wrap gap-1.5">
                                    {file.tags.map((tag) => (
                                        <span
                                            key={tag}
                                        className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                            </div>
                                </div>
                            )}

                        {/* Preview */}
                            {renderPreview()}
                        </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                            <Button variant="secondary" onClick={onClose}>
                                Close
                            </Button>
                            <Button onClick={() => onDownload(file)}>
                        <Download className="h-4 w-4 mr-1.5" />
                                Download
                            </Button>
                </div>
            </div>
        </div>
    );
};

export default PublicFolderPreviewModal;
