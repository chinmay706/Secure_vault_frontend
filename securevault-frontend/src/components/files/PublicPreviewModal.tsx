import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, 
  File, 
  X, 
  ExternalLink, 
  Globe,
  FileText,
  Image,
  Film,
  Music,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Presentation,
  FileType,
  Database,
  FileJson
} from 'lucide-react';
import { FileItem } from '../../types';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { formatFileSize, formatDate } from '../../utils/formatting';

// Get file icon based on mime type
const getFileIcon = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Images
  if (mimeType.startsWith('image/')) return Image;
  
  // Videos
  if (mimeType.startsWith('video/')) return Film;
  
  // Audio
  if (mimeType.startsWith('audio/')) return Music;
  
  // PDF
  if (mimeType === 'application/pdf') return FileText;
  
  // Spreadsheets
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  
  // Presentations
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx', 'key'].includes(ext)) return Presentation;
  
  // Word documents
  if (mimeType.includes('word') || mimeType.includes('document') || ['doc', 'docx', 'odt'].includes(ext)) return FileText;
  
  // Archives
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return FileArchive;
  
  // JSON
  if (mimeType.includes('json') || ext === 'json') return FileJson;
  
  // Code files
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return FileCode;
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'html', 'css', 'xml', 'yaml', 'yml'].includes(ext)) return FileCode;
  
  // Database files
  if (mimeType.includes('sql') || ['sql', 'db', 'sqlite'].includes(ext)) return Database;
  
  // Text files
  if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf', 'log'].includes(ext)) return FileText;
  
  // Font files
  if (mimeType.includes('font') || ['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return FileType;
  
  return File;
};

const getFileIconColor = (mimeType: string, filename: string = '') => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Images - Pink
  if (mimeType.startsWith('image/')) return 'text-pink-500 bg-pink-100 dark:bg-pink-900/30';
  
  // Videos - Purple
  if (mimeType.startsWith('video/')) return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';

  // Audio - Orange
  if (mimeType.startsWith('audio/')) return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
  
  // PDF - Red
  if (mimeType === 'application/pdf') return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  
  // Spreadsheets - Green
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-100 dark:bg-green-900/30';
  
  // Presentations - Amber
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
  
  // Word documents - Blue
  if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
  
  // Archives - Yellow
  if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
  
  // JSON - Teal
  if (mimeType.includes('json') || ext === 'json') return 'text-teal-500 bg-teal-100 dark:bg-teal-900/30';
  
  // Code files - Emerald
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'html', 'css', 'xml'].includes(ext)) return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
  
  // Database - Indigo
  if (mimeType.includes('sql') || ['sql', 'db'].includes(ext)) return 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30';
  
  // Text files - Slate
  if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf', 'log'].includes(ext)) return 'text-slate-500 bg-slate-100 dark:bg-slate-900/30';
  
  // Default - Blue
  return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
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
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading content...</p>
        </div>
      </div>
    );
  }

  const isCode = filename.includes('.') && [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'xml', 'json', 'sql', 'sh'
  ].some(ext => filename.toLowerCase().endsWith(`.${ext}`)) || mimeType.includes('javascript') || mimeType.includes('json');

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <FileCode className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{filename}</span>
        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
          {filename.split('.').pop()?.toUpperCase()}
        </span>
      </div>
      <div className="p-4 h-80 overflow-auto">
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
  const [retryWithObject, setRetryWithObject] = useState(false);

  const handleIframeLoad = () => setLoading(false);

  const handleIframeError = () => {
    if (!retryWithObject) {
      setRetryWithObject(true);
      setLoading(true);
    } else {
      setIframeError(true);
      setLoading(false);
    }
  };

  const handleObjectError = () => {
    setIframeError(true);
    setLoading(false);
  };

  if (iframeError) {
    return (
      <div className="h-96 w-full bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-800">
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <File className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-gray-900 dark:text-white text-lg font-medium mb-2">PDF Preview Not Available</p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Your browser doesn't support inline PDF preview.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => window.open(blobUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden relative border border-gray-200 dark:border-gray-800">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading PDF...</p>
          </div>
        </div>
      )}

      {!retryWithObject ? (
        <iframe
          src={`${blobUrl}#view=FitH&toolbar=1&navpanes=0`}
          className="w-full h-full border-0"
          title={`PDF Preview: ${filename}`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="fullscreen"
        />
      ) : (
        <object
          data={blobUrl}
          type="application/pdf"
          className="w-full h-full"
          title={`PDF Preview: ${filename}`}
          onLoad={handleIframeLoad}
          onError={handleObjectError}
        >
          <embed src={blobUrl} type="application/pdf" className="w-full h-full" />
        </object>
      )}

      {!loading && !iframeError && (
          <button
            onClick={() => window.open(blobUrl, '_blank')}
          className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-xs rounded-full transition-colors flex items-center gap-1.5 z-20"
            title="Open in new tab"
          >
          <ExternalLink className="h-3 w-3" />
          New Tab
          </button>
      )}
    </div>
  );
};

interface PublicPreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

export const PublicPreviewModal: React.FC<PublicPreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload
}) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentBlobUrl = useRef<string | null>(null);
  const currentFileId = useRef<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const loadingRef = useRef<boolean>(false);
  const previewUrlRef = useRef<string | null>(null);

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
      previewUrlRef.current = null;
      setError(null);
      setLoading(false);
      loadingRef.current = false;
      currentFileId.current = null;
      return;
    }

    if (currentFileId.current === file.id && (loadingRef.current || previewUrlRef.current)) {
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    setLoading(true);
    loadingRef.current = true;
    setError(null);
    currentFileId.current = file.id;

    try {
      const isImageFile = file.mime_type.startsWith('image/');
      const isTextFile = file.mime_type.startsWith('text/') ||
        file.mime_type === 'application/json' ||
        file.mime_type === 'application/javascript' ||
        file.mime_type === 'text/csv';
      const isPDFFile = file.mime_type === 'application/pdf';
      const isVideoFile = file.mime_type.startsWith('video/') || file.mime_type === 'video/mp4';

      if (isImageFile || isTextFile || isPDFFile || isVideoFile) {
        if (!file.share_link?.token) {
          throw new Error('No share token available for public file');
        }

        if (isTextFile && file.size_bytes > 500000) {
          throw new Error('Text file too large for preview (max 500KB)');
        }

        if (isVideoFile && file.size_bytes > 100000000) {
          throw new Error('Video file too large for preview (max 100MB)');
        }

        if (isPDFFile && file.size_bytes > 50000000) {
          throw new Error('PDF file too large for preview (max 50MB)');
        }

        const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

        const timeoutDuration = isVideoFile ? 60000 : 30000;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            if (!signal.aborted) {
              reject(new Error('Request timeout - large files may take longer to load'));
            }
          }, timeoutDuration);
        });

        // Use download_url if available (presigned URL), otherwise use public token endpoint
        const downloadUrl = (file as any).download_url || `${restBaseUrl}/p/${file.share_link.token}`;
        
        const fetchPromise = fetch(downloadUrl, {
          method: 'GET',
          signal
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (signal.aborted) return;

        if (!response.ok) {
          throw new Error(`Failed to load preview: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        if (signal.aborted) return;

        if (currentBlobUrl.current) {
          URL.revokeObjectURL(currentBlobUrl.current);
        }

        const url = URL.createObjectURL(blob);
        currentBlobUrl.current = url;
        previewUrlRef.current = url;
        setPreviewUrl(url);

      } else {
        setPreviewUrl(null);
        previewUrlRef.current = null;
      }

    } catch (err) {
      if (signal.aborted) return;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setPreviewUrl(null);
      previewUrlRef.current = null;
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [file, isOpen]);

  useEffect(() => {
    loadFilePreview();

    return () => {
      if (abortController.current) {
        abortController.current.abort();
        abortController.current = null;
      }
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }
    };
  }, [loadFilePreview]);

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

  const canDownload = !!file.share_link?.token;
  const isImage = file.mime_type.startsWith('image/');
  const isText = file.mime_type.startsWith('text/') ||
    ['application/json', 'application/javascript', 'application/xml', 'text/csv'].includes(file.mime_type);
  const isPDF = file.mime_type === 'application/pdf';
  const isVideo = file.mime_type.startsWith('video/') ||
    ['video/mp4', 'video/webm', 'video/ogg'].includes(file.mime_type);

  const FileIcon = getFileIcon(file.mime_type, file.original_filename);
  const iconColorClass = getFileIconColor(file.mime_type, file.original_filename);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <File className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load preview</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">{error}</p>
          </div>
        </div>
      );
    }

    if (isImage && previewUrl) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
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
        <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <video
            src={previewUrl}
            controls
            controlsList="download"
            className="max-w-full max-h-full rounded-lg"
            preload="metadata"
            onError={() => setError('Failed to display video')}
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileIcon className="h-10 w-10 text-gray-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-2">Preview not available</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Supported: Images, Text, PDFs, Videos
          </p>
          <p className="text-gray-400 text-xs mt-2">Click download to view the file</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-variant/50">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-12 h-12 rounded-xl ${iconColorClass} flex items-center justify-center shrink-0`}>
              <FileIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {file.original_filename}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatFileSize(file.size_bytes)}</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Globe className="h-3.5 w-3.5" />
                  Public
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white dark:bg-surface hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
          {/* File Metadata */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-surface-variant rounded-xl border border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wide mb-1">Type</span>
              <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{file.mime_type}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-surface-variant rounded-xl border border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wide mb-1">Created</span>
              <p className="text-gray-900 dark:text-white font-medium text-sm">{formatDate(file.created_at)}</p>
            </div>
                {file.download_count !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-surface-variant rounded-xl border border-gray-100 dark:border-gray-800 col-span-2 sm:col-span-1">
                <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase tracking-wide mb-1">Downloads</span>
                <p className="text-gray-900 dark:text-white font-medium text-sm">{file.download_count}</p>
              </div>
                )}
              </div>

          {/* Preview Area */}
          <div className="min-h-96">
            {renderPreview()}
              </div>
            </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-variant/50">
          <Button variant="secondary" onClick={onClose} className="!rounded-xl !px-6">
                Close
              </Button>
              <Button
                onClick={() => onDownload(file)}
                disabled={!canDownload}
            className="!rounded-xl !px-6"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
        </div>
      </div>
    </div>
  );
};
