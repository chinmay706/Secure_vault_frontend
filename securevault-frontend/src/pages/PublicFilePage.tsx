import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileItem } from '../types';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import {
  Download,
  HardDrive,
  FileText,
  Image,
  Film,
  Music,
  FileArchive,
  FileCode,
  File,
  Shield,
  Copy,
  Check,
  Globe,
  Lock,
  FileSpreadsheet,
  Presentation,
  Database,
  FileJson,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { formatFileSize } from '../utils/formatting';

// Get file icon based on mime type
const getFileIcon = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx', 'key'].includes(ext)) return Presentation;
  if (mimeType.includes('word') || mimeType.includes('document') || ['doc', 'docx', 'odt'].includes(ext)) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return FileArchive;
  if (mimeType.includes('json') || ext === 'json') return FileJson;
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return FileCode;
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'html', 'css', 'xml', 'yaml', 'yml'].includes(ext)) return FileCode;
  if (mimeType.includes('sql') || ['sql', 'db', 'sqlite'].includes(ext)) return Database;
  if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf', 'log'].includes(ext)) return FileText;

  return File;
};

// Get file type label
const getFileTypeLabel = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx'].includes(ext)) return 'Spreadsheet';
  if (ext === 'csv') return 'CSV';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'Presentation';
  if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return 'Document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'Archive';
  if (mimeType.includes('json') || ext === 'json') return 'JSON';
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'Code';
  if (['py'].includes(ext)) return 'Python';
  if (['md'].includes(ext)) return 'Markdown';
  if (['txt'].includes(ext)) return 'Text';
  if (mimeType.startsWith('text/')) return 'Text';

  const extUpper = ext.toUpperCase();
  return extUpper || 'File';
};

export const PublicFilePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileUrl = `${import.meta.env.VITE_REST_BASE_URL}/p/${token}`;

  useEffect(() => {
    const fetchPublicFile = async () => {
      if (!token) {
        setError('No file token provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_REST_BASE_URL}/p/${token}`, {
          method: 'HEAD'
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          const contentLength = response.headers.get('content-length');
          const contentDisposition = response.headers.get('content-disposition');

          let filename = 'unknown-file';
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch) {
              filename = filenameMatch[1].replace(/['"]/g, '');
            }
          }

          const publicFile: FileItem = {
            id: token,
            original_filename: filename,
            mime_type: contentType,
            size_bytes: contentLength ? parseInt(contentLength) : 0,
            folder_id: null,
            is_public: true,
            download_count: 0,
            created_at: new Date().toISOString(),
            share_link: {
              token: token,
              is_active: true,
              download_count: 0
            }
          };

          setFile(publicFile);
        } else if (response.status === 404) {
          setError('File not found or link has expired');
        } else if (response.status === 403) {
          setError('This file is not publicly accessible');
        } else {
          setError('Failed to load file');
        }
      } catch (err) {
        console.error('Error fetching public file:', err);
        setError('Failed to load file. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicFile();
  }, [token]);

  // Fetch file content for preview (creates blob URL)
  useEffect(() => {
    if (!file || !token) return;

    const isPreviewableType = 
      file.mime_type.startsWith('image/') ||
      file.mime_type === 'application/pdf' ||
      file.mime_type.startsWith('video/') ||
      file.mime_type.startsWith('audio/');

    if (!isPreviewableType) return;

    // Skip fetching for very large files (>50MB for PDF, >100MB for video)
    if (file.mime_type === 'application/pdf' && file.size_bytes > 50000000) return;
    if (file.mime_type.startsWith('video/') && file.size_bytes > 100000000) return;

    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Error fetching preview:', err);
        // Don't set error - just won't show preview
      } finally {
        setPreviewLoading(false);
        setPdfLoading(false);
      }
    };

    fetchPreview();

    // Cleanup blob URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, token, fileUrl]);

  const handleDownload = () => {
    if (!file || !token) return;
    const downloadUrl = `${import.meta.env.VITE_REST_BASE_URL}/p/${token}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.original_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/public/files/share/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800"></div>
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center p-4 transition-colors">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <File className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">File Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error || 'The requested file could not be found.'}</p>
          <a
            href="/"
            className="inline-flex items-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  const FileIcon = getFileIcon(file.mime_type, file.original_filename);
  const fileTypeLabel = getFileTypeLabel(file.mime_type, file.original_filename);
  const isImage = file.mime_type.startsWith('image/');
  const isPDF = file.mime_type === 'application/pdf';
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPreviewable = isImage || isPDF || isVideo || isAudio;
  const canShowPreview = isPreviewable && previewUrl && !previewLoading;

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">SecureVault</span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* File Card */}
        <div className="bg-gray-50 dark:bg-surface rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* File Header */}
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                <FileIcon className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white break-words mb-2">
                  {file.original_filename}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                    {fileTypeLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-4 w-4" />
                    {formatFileSize(file.size_bytes)}
                  </span>
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Globe className="h-4 w-4" />
                    Public
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* File Preview Section */}
          {isPreviewable && (
            <div className="px-6 sm:px-8 pb-6">
              {/* Loading State */}
              {previewLoading && (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading preview...</p>
                </div>
              )}

              {/* Image Preview */}
              {isImage && canShowPreview && !imageError && (
                <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <img
                    src={previewUrl}
                    alt={file.original_filename}
                    className="w-full max-h-[500px] object-contain"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}

              {/* Image Error */}
              {isImage && imageError && (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">Unable to load image preview</p>
                </div>
              )}

              {/* PDF Preview */}
              {isPDF && canShowPreview && (
                <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 relative">
                  {!pdfError ? (
                    <>
                      <iframe
                        src={`${previewUrl}#view=FitH&toolbar=1&navpanes=0`}
                        className="w-full h-[500px] border-0"
                        title={`PDF Preview: ${file.original_filename}`}
                        onError={() => setPdfError(true)}
                      />
                      <button
                        onClick={() => window.open(previewUrl, '_blank')}
                        className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-xs rounded-full transition-colors flex items-center gap-1.5 z-20"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3 w-3" />
                        New Tab
                      </button>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to preview PDF in browser</p>
                      <button
                        onClick={() => window.open(previewUrl, '_blank')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in New Tab
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PDF Too Large */}
              {isPDF && !previewLoading && !previewUrl && file.size_bytes > 50000000 && (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">PDF too large for preview ({formatFileSize(file.size_bytes)})</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">Download the file to view it</p>
                </div>
              )}

              {/* Video Preview */}
              {isVideo && canShowPreview && (
                <div className="rounded-xl overflow-hidden bg-black border border-gray-200 dark:border-gray-700">
                  <video
                    src={previewUrl}
                    controls
                    className="w-full max-h-[500px]"
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {/* Video Too Large */}
              {isVideo && !previewLoading && !previewUrl && file.size_bytes > 100000000 && (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Video too large for preview ({formatFileSize(file.size_bytes)})</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">Download the file to view it</p>
                </div>
              )}

              {/* Audio Preview */}
              {isAudio && canShowPreview && (
                <div className="rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Music className="h-8 w-8 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{file.original_filename}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size_bytes)}</p>
                    </div>
                  </div>
                  <audio
                    src={previewUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
            >
              <Download className="h-5 w-5" />
              Download
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-2">
          <Lock className="h-4 w-4 text-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Secure file sharing</span>
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Shared via <a href="/" className="text-primary hover:underline">SecureVault</a>
        </p>
      </footer>
    </div>
  );
};
