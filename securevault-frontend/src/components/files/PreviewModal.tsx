import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  File,
  X,
  ExternalLink,
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
  Pencil,
  Check,
  Plus,
  Sparkles,
  Tag,
  Brain,
  RotateCw
} from 'lucide-react';
import { useMutation } from '@apollo/client';
import { FileItem } from '../../types';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize, formatDate } from '../../utils/formatting';
import { UPDATE_FILE_TAGS } from '../../graphql/mutations';

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

  if (mimeType.startsWith('image/')) return 'text-pink-500 bg-pink-100 dark:bg-pink-900/30';
  if (mimeType.startsWith('video/')) return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
  if (mimeType.startsWith('audio/')) return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
  if (mimeType === 'application/pdf') return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-100 dark:bg-green-900/30';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
  if (mimeType.includes('word') || ['doc', 'docx'].includes(ext)) return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
  if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
  if (mimeType.includes('json') || ext === 'json') return 'text-teal-500 bg-teal-100 dark:bg-teal-900/30';
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || ['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
  if (mimeType.includes('sql') || ['sql', 'db'].includes(ext)) return 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30';
  if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(ext)) return 'text-slate-500 bg-slate-100 dark:bg-slate-900/30';

  return 'text-primary bg-primary/10';
};

// Text preview component with syntax highlighting detection
interface TextPreviewProps {
  blobUrl: string;
  filename: string;
  mimeType: string;
}

// PDF preview component with iframe and fallback options
interface PDFPreviewProps {
  blobUrl: string;
  filename: string;
  onDownload: () => void;
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
      <div className="bg-surface-variant dark:bg-[#0d1117] rounded-2xl p-4 h-96 flex items-center justify-center">
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  // Detect if it's code based on file extension or mime type
  const isCode = filename.includes('.') && [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'xml', 'json', 'sql', 'sh'
  ].some(ext => filename.toLowerCase().endsWith(`.${ext}`)) || mimeType.includes('javascript') || mimeType.includes('json');

  return (
    <div className="bg-surface-variant dark:bg-[#0d1117] rounded-2xl p-4 h-96 overflow-auto">
      <div className="mb-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">{filename.split('.').pop()?.toUpperCase()}</span>
        <span>{mimeType}</span>
      </div>
      <pre className={`text-sm whitespace-pre-wrap leading-relaxed ${isCode ? 'font-mono text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
        {textContent}
      </pre>
    </div>
  );
};

const PDFPreview: React.FC<PDFPreviewProps> = ({ blobUrl, filename, onDownload }) => {
  const [iframeError, setIframeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryWithObject, setRetryWithObject] = useState(false);

  const handleIframeLoad = () => {
    setLoading(false);
  };

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
      <div className="h-96 w-full bg-surface-variant dark:bg-[#0d1117] rounded-2xl flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <File className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-foreground text-lg font-medium mb-2">PDF Preview Not Available</p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Your browser doesn't support inline PDF preview.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => window.open(blobUrl, '_blank')}
            >
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
    <div className="h-96 w-full bg-surface-variant dark:bg-[#0d1117] rounded-2xl overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-variant dark:bg-[#0d1117] z-10">
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
          style={{ minHeight: '100%' }}
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
          <embed
            src={blobUrl}
            type="application/pdf"
            className="w-full h-full"
          />
        </object>
      )}

      {!loading && !iframeError && (
        <div className="absolute top-3 right-3 flex gap-2 z-20">
          <button
            onClick={() => window.open(blobUrl, '_blank')}
            className="px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-xs rounded-full transition-colors flex items-center gap-1.5"
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
            New Tab
          </button>
        </div>
      )}
    </div>
  );
};

interface PreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  isPublic?: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload,
  isPublic = false
}) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  // Tag editing state
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editableTags, setEditableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagSaving, setTagSaving] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [updateFileTags] = useMutation(UPDATE_FILE_TAGS);

  // AI tag generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'polling' | 'done' | 'error'>('idle');
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const aiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI description state
  const [aiDescription, setAiDescription] = useState<string>('');
  const [aiDescriptionStatus, setAiDescriptionStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // Sync tags when file changes
  useEffect(() => {
    if (file) {
      setEditableTags(file.tags || []);
      setIsEditingTags(false);
      setNewTagInput('');
      setAiStatus('idle');
      setAiSuggestedTags([]);
      setAiGenerating(false);
      setAiDescription('');
      setAiDescriptionStatus('idle');
    }
    // Cleanup polling on file change
    return () => {
      if (aiPollRef.current) {
        clearInterval(aiPollRef.current);
        aiPollRef.current = null;
      }
    };
  }, [file?.id]);

  const handleStartEditTags = () => {
    setEditableTags(file?.tags || []);
    setIsEditingTags(true);
    setTimeout(() => tagInputRef.current?.focus(), 100);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditableTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (trimmed && !editableTags.includes(trimmed)) {
      setEditableTags(prev => [...prev, trimmed]);
    }
    setNewTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === 'Backspace' && !newTagInput && editableTags.length > 0) {
      setEditableTags(prev => prev.slice(0, -1));
    }
    if (e.key === 'Escape') {
      setIsEditingTags(false);
      setEditableTags(file?.tags || []);
    }
  };

  const handleSaveTags = async () => {
    if (!file) return;
    setTagSaving(true);
    try {
      await updateFileTags({
        variables: { file_id: file.id, tags: editableTags },
        errorPolicy: 'all',
      });
      // Update the file object's tags in-place for parent components
      if (file) {
        file.tags = editableTags;
      }
      setIsEditingTags(false);
    } catch (err) {
      console.warn('[PreviewModal] Failed to save tags:', err);
      // Revert on error
      setEditableTags(file?.tags || []);
    } finally {
      setTagSaving(false);
    }
  };

  // Generate AI tags with polling
  const handleGenerateAiTags = async () => {
    if (!file || !token) return;
    setAiGenerating(true);
    setAiStatus('polling');
    setAiSuggestedTags([]);

    const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

    // Trigger via REST POST (more reliable than GraphQL mutation)
    try {
      await fetch(`${restBaseUrl}/files/${file.id}/ai-tags`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {
      // Even if trigger fails, try polling — backend auto-triggers on GET too
    }

    let attempts = 0;
    const maxAttempts = 20;

    const stopPoll = () => {
      if (aiPollRef.current) {
        clearInterval(aiPollRef.current);
        aiPollRef.current = null;
      }
    };

    const poll = async () => {
      attempts++;
      try {
        const response = await fetch(`${restBaseUrl}/files/${file.id}/ai-tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 202 = still processing — keep polling
        if (response.status === 202) {
          if (attempts >= maxAttempts) {
            stopPoll();
            setAiStatus('error');
            setAiGenerating(false);
          }
          return;
        }

        if (!response.ok) {
          stopPoll();
          setAiStatus('error');
          setAiGenerating(false);
          return;
        }

        let data: Record<string, unknown>;
        try {
          data = await response.json();
        } catch {
          if (attempts >= maxAttempts) {
            stopPoll();
            setAiStatus('error');
            setAiGenerating(false);
          }
          return;
        }

        const status: string = (data.status as string) || 'completed';

        if (status === 'completed') {
          stopPoll();
          const tags: string[] = (Array.isArray(data.suggested_tags) ? data.suggested_tags : []) as string[];
          setAiSuggestedTags(tags);
          setAiStatus(tags.length > 0 ? 'done' : 'error');
          setAiGenerating(false);
          // Also capture AI description if returned
          const desc: string = ((data.ai_description || data.description || '') as string);
          if (desc) {
            setAiDescription(desc);
            setAiDescriptionStatus('done');
          }
          return;
        }

        if (status === 'failed') {
          stopPoll();
          setAiStatus('error');
          setAiGenerating(false);
          return;
        }

        // Still processing/pending — keep polling
        if (attempts >= maxAttempts) {
          stopPoll();
          setAiStatus('error');
          setAiGenerating(false);
        }
      } catch {
        // Network error — keep polling unless max attempts
        if (attempts >= maxAttempts) {
          stopPoll();
          setAiStatus('error');
          setAiGenerating(false);
        }
      }
    };

    // Immediate first check, then poll every 2.5s
    poll();
    aiPollRef.current = setInterval(poll, 2500);
  };

  // Accept an AI-suggested tag (add to current tags and save)
  const handleAcceptAiTag = async (tag: string) => {
    if (!file) return;
    const currentTags = file.tags || [];
    if (currentTags.includes(tag)) {
      setAiSuggestedTags(prev => prev.filter(t => t !== tag));
      return;
    }
    const newTags = [...currentTags, tag];
    try {
      await updateFileTags({
        variables: { file_id: file.id, tags: newTags },
        errorPolicy: 'all',
      });
      file.tags = newTags;
      setEditableTags(newTags);
    } catch (err) {
      console.warn('[PreviewModal] Failed to save tag:', err);
    }
    // Always remove from suggestions even if save failed
    setAiSuggestedTags(prev => prev.filter(t => t !== tag));
  };

  const handleAcceptAllAiTags = async () => {
    if (!file || aiSuggestedTags.length === 0) return;
    const currentTags = file.tags || [];
    const newTags = [...new Set([...currentTags, ...aiSuggestedTags])];
    try {
      await updateFileTags({
        variables: { file_id: file.id, tags: newTags },
        errorPolicy: 'all',
      });
      file.tags = newTags;
      setEditableTags(newTags);
    } catch (err) {
      console.warn('[PreviewModal] Failed to save all tags:', err);
    }
    // Always clear suggestions
    setAiSuggestedTags([]);
    setAiStatus('idle');
  };

  // Generate AI description standalone
  const handleGenerateAiDescription = async () => {
    if (!file || !token) return;
    setAiDescriptionStatus('loading');
    const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

    try {
      // Try the dedicated ai-describe endpoint first (sync, cached, returns 200)
      const response = await fetch(`${restBaseUrl}/files/${file.id}/ai-describe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const desc = (data.description || data.ai_description || '') as string;
        if (desc) {
          setAiDescription(desc);
          setAiDescriptionStatus('done');
          return;
        }
      }

      // Fallback: try the ai-tags endpoint (description might be bundled)
      const fallbackRes = await fetch(`${restBaseUrl}/files/${file.id}/ai-tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (fallbackRes.ok || fallbackRes.status === 202) {
        try {
          const data = await fallbackRes.json();
          const desc = (data.ai_description || data.description || '') as string;
          if (desc) {
            setAiDescription(desc);
            setAiDescriptionStatus('done');
            return;
          }
        } catch { /* ignore parse errors */ }
      }

      setAiDescriptionStatus('error');
    } catch {
      setAiDescriptionStatus('error');
    }
  };

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
        if (!token && !isPublic) {
          throw new Error('Authentication required for file preview');
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

        // Use public endpoint if file has a share link token, otherwise use authenticated endpoint
        const hasPublicToken = file.share_link?.token && file.share_link?.is_active;
        const downloadUrl = hasPublicToken
          ? `${restBaseUrl}/p/${file.share_link!.token}`
          : `${restBaseUrl}/files/${file.id}/download`;

        const fetchPromise = fetch(downloadUrl, {
          method: 'GET',
          headers: (isPublic || hasPublicToken) ? {} : {
            'Authorization': `Bearer ${token}`
          },
          signal
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load preview: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        if (signal.aborted) {
          return;
        }

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
      if (signal.aborted) {
        return;
      }

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
  }, [file, isOpen, token, isPublic]);

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

  const canDownload = isPublic ? !!file.share_link?.token : true;
  const isImage = file.mime_type.startsWith('image/');
  const isText = file.mime_type.startsWith('text/') ||
    [
      'application/json',
      'application/javascript',
      'application/xml',
      'application/x-yaml',
      'text/csv',
      'text/yaml',
      'text/yml'
    ].includes(file.mime_type);
  const isPDF = file.mime_type === 'application/pdf';
  const isVideo = file.mime_type.startsWith('video/') ||
    ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'].includes(file.mime_type);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <File className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load preview</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">{error}</p>
          </div>
        </div>
      );
    }

    if (isImage && previewUrl) {
      return (
        <div className="flex items-center justify-center h-96 bg-surface-variant dark:bg-[#0d1117] rounded-2xl overflow-hidden">
          <img
            src={previewUrl}
            alt={file.original_filename}
            className="max-w-full max-h-full object-contain"
            onError={() => {
              setError('Failed to display image');
            }}
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
        <div className="flex items-center justify-center h-96 bg-surface-variant dark:bg-[#0d1117] rounded-2xl overflow-hidden">
          <video
            src={previewUrl}
            controls
            controlsList="download"
            className="max-w-full max-h-full rounded-lg"
            preload="metadata"
            style={{ maxHeight: '100%', maxWidth: '100%' }}
            onError={() => {
              setError('Failed to display video');
            }}
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if ((isPDF || isText || isVideo) && !previewUrl) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <File className="h-8 w-8 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-foreground font-medium mb-2">Preview failed to load</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {isPDF && "PDF preview may not be supported in this browser."}
              {isText && "Text file could not be loaded."}
              {isVideo && "Video format may not be supported."}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Click download to view the file</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <File className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-foreground font-medium mb-2">Preview not available</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Supported: Images, Text, PDFs, Videos (MP4, WebM)
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Click download to view the file</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-[#1E1F20] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            {(() => {
              const FileIcon = getFileIcon(file.mime_type, file.original_filename);
              const iconColorClass = getIconColorClass(file.mime_type, file.original_filename);
              return (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColorClass}`}>
                  <FileIcon className="h-5 w-5" />
                </div>
              );
            })()}
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-foreground truncate">{file.original_filename}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size_bytes)} • {file.mime_type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* File Metadata */}
          <div className="mb-6 p-4 bg-surface dark:bg-surface-variant rounded-2xl">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <p className="text-foreground font-medium">{formatDate(file.created_at)}</p>
              </div>
              {file.download_count !== undefined && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Downloads</span>
                  <p className="text-foreground font-medium">{file.download_count}</p>
                </div>
              )}
            </div>
            {/* Editable Tags Section */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</span>
                </div>
                {!isPublic && !isEditingTags && (
                  <button
                    onClick={handleStartEditTags}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
                {isEditingTags && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIsEditingTags(false);
                        setEditableTags(file.tags || []);
                      }}
                      className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTags}
                      disabled={tagSaving}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {tagSaving ? (
                        <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Save
                    </button>
                  </div>
                )}
              </div>

              {isEditingTags ? (
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[40px]">
                  {editableTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full group/tag"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => { if (newTagInput.trim()) handleAddTag(); }}
                      placeholder={editableTags.length === 0 ? 'Add tags...' : '+'}
                      className="bg-transparent border-none outline-none text-xs text-foreground placeholder-gray-400 w-20 min-w-[60px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(file.tags && file.tags.length > 0) ? (
                    file.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                      No tags yet
                    </span>
                  )}
                </div>
              )}

              {/* AI Tag Generation */}
              {!isPublic && !isEditingTags && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {aiStatus === 'idle' && (
                    <button
                      onClick={handleGenerateAiTags}
                      disabled={aiGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 rounded-lg border border-violet-200/50 dark:border-violet-800/30 transition-all"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate AI Tags
                    </button>
                  )}

                  {aiStatus === 'polling' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/10 rounded-lg">
                      <div className="h-3.5 w-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                      <span className="text-xs text-violet-600 dark:text-violet-400">Analyzing file with AI...</span>
                    </div>
                  )}

                  {aiStatus === 'error' && (
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-xs text-gray-500 italic">AI tagging unavailable</span>
                      <button
                        onClick={handleGenerateAiTags}
                        className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {aiStatus === 'done' && aiSuggestedTags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-violet-500" />
                          <span className="text-xs font-medium text-violet-700 dark:text-violet-400">AI Suggestions</span>
                        </div>
                        <button
                          onClick={handleAcceptAllAiTags}
                          className="text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          Accept all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestedTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleAcceptAiTag(tag)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 dark:from-violet-900/20 dark:to-purple-900/20 dark:text-violet-400 rounded-full border border-violet-200/50 dark:border-violet-800/30 hover:from-violet-100 hover:to-purple-100 transition-all"
                            title="Click to accept"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {tag}
                            <Check className="h-2.5 w-2.5 text-green-500 ml-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Description Section */}
            {!isPublic && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Summary</span>
                  </div>
                  {aiDescriptionStatus === 'idle' && (
                    <button
                      onClick={handleGenerateAiDescription}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate
                    </button>
                  )}
                  {aiDescriptionStatus === 'error' && (
                    <button
                      onClick={handleGenerateAiDescription}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                    >
                      <RotateCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>

                {aiDescriptionStatus === 'loading' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/10 rounded-lg">
                    <div className="h-3 w-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-xs text-violet-600 dark:text-violet-400">Generating summary...</span>
                  </div>
                )}

                {aiDescriptionStatus === 'done' && aiDescription ? (
                  <div className="px-3 py-2.5 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-900/10 dark:to-purple-900/10 rounded-xl border border-violet-100 dark:border-violet-800/20">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{aiDescription}</p>
                  </div>
                ) : aiDescriptionStatus === 'idle' ? (
                  <p className="text-[11px] text-gray-400 italic">Click "Generate" to get an AI-powered file summary</p>
                ) : aiDescriptionStatus === 'error' ? (
                  <p className="text-[11px] text-gray-400 italic">AI summary unavailable for this file</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="min-h-96">
            {renderPreview()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-surface dark:bg-surface-variant">
          <Button variant="secondary" onClick={onClose} className="!rounded-full !px-6">
            Close
          </Button>
          <Button
            onClick={() => onDownload(file)}
            disabled={!canDownload}
            className="!rounded-full !px-6"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};
