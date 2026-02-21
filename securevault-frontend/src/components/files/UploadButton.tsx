import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Cloud, Sparkles, FolderInput, RotateCw } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { UPDATE_FILE_TAGS } from '../../graphql/mutations';

interface AiResult {
  fileId: string;
  fileName: string;
  tags: string[];
  description: string;
  suggestedFolder: string | null;
  status: 'waiting' | 'analyzing' | 'saving' | 'done' | 'error';
}

interface UploadProgressItem {
  id: string;
  name: string;
  progress: number;
  size: number;
  status: 'uploading' | 'completed' | 'error';
  fileId?: string;
}

interface UploadButtonProps {
  folderId?: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  folderId,
  onUploadComplete,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadProgressItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tags, setTags] = useState('');
  const [aiResults, setAiResults] = useState<AiResult[]>([]);

  const { token } = useAuth();
  const { addToast } = useToast();
  const [updateFileTags] = useMutation(UPDATE_FILE_TAGS);

  const pollingIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsDragging(false);
    setTags('');
    setUploads([]);
    setAiResults([]);
    pollingIntervals.current.forEach(interval => clearInterval(interval));
    pollingIntervals.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach(interval => clearInterval(interval));
      pollingIntervals.current.clear();
    };
  }, []);

  // Auto-save AI tags: when tags arrive, save them immediately
  const autoSaveAiTags = useCallback(async (fileId: string, fileName: string, aiTags: string[], description: string, suggestedFolder: string | null) => {
    // Merge with any manual tags already on the file (max 4 tags from AI)
    const existingManualTags = tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const mergedTags = [...new Set([...existingManualTags, ...aiTags])];

    // Update UI immediately to show tags
    setAiResults(prev => prev.map(r =>
      r.fileId === fileId ? { ...r, tags: aiTags, description: description || '', suggestedFolder: suggestedFolder || null, status: 'saving' as const } : r
    ));

    try {
      if (mergedTags.length > 0) {
        await updateFileTags({
          variables: { file_id: fileId, tags: mergedTags },
          // Don't use optimisticResponse — avoid cache mismatch crashes
          errorPolicy: 'all',
        });
      }
    } catch (err) {
      // Log but don't crash — tags are already shown in the UI
      console.warn('[UploadButton] Failed to save AI tags via GraphQL:', err);
    }

    // Always mark as done regardless of save success
    setAiResults(prev => prev.map(r =>
      r.fileId === fileId ? { ...r, status: 'done' as const } : r
    ));

    try { onUploadComplete?.(); } catch { /* ignore refetch errors */ }
  }, [tags, updateFileTags, onUploadComplete]);

  // Poll AI tags endpoint and auto-save when ready
  const pollAndAutoSave = useCallback((fileId: string, fileName: string) => {
    const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';
    let attempts = 0;
    const maxAttempts = 20;
    const pollMs = 2500;

    setAiResults(prev => [
      ...prev,
      { fileId, fileName, tags: [], description: '', suggestedFolder: null, status: 'analyzing' }
    ]);

    const stopPolling = (fId: string) => {
      const interval = pollingIntervals.current.get(fId);
      if (interval) clearInterval(interval);
      pollingIntervals.current.delete(fId);
    };

    const poll = async () => {
      attempts++;
      try {
        const response = await fetch(`${restBaseUrl}/files/${fileId}/ai-tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 202 = still processing (auto-triggered by backend) — keep polling
        // 200 = completed or failed — process the result
        // Other = error
        if (response.status === 202) {
          // Still processing — keep polling unless max attempts reached
          if (attempts >= maxAttempts) {
            stopPolling(fileId);
            setAiResults(prev => prev.map(r =>
              r.fileId === fileId ? { ...r, status: 'error' } : r
            ));
          }
          return;
        }

        if (!response.ok && response.status !== 200) {
          // Real error (4xx, 5xx other than 202)
          if (attempts >= maxAttempts) {
            stopPolling(fileId);
            setAiResults(prev => prev.map(r =>
              r.fileId === fileId ? { ...r, status: 'error' } : r
            ));
          }
          return;
        }

        let data: Record<string, unknown>;
        try {
          data = await response.json();
        } catch {
          // Invalid JSON — keep polling
          if (attempts >= maxAttempts) {
            stopPolling(fileId);
            setAiResults(prev => prev.map(r =>
              r.fileId === fileId ? { ...r, status: 'error' } : r
            ));
          }
          return;
        }

        const status: string = (data.status as string) || 'completed';

        if (status === 'completed') {
          stopPolling(fileId);

          const aiTags: string[] = (Array.isArray(data.suggested_tags) ? data.suggested_tags : []) as string[];
          const description: string = ((data.ai_description || data.description || '') as string);
          const suggestedFolder: string | null = ((data.suggested_folder || null) as string | null);

          if (aiTags.length > 0) {
            autoSaveAiTags(fileId, fileName, aiTags, description, suggestedFolder);
          } else {
            setAiResults(prev => prev.map(r =>
              r.fileId === fileId ? { ...r, status: 'done' as const, description } : r
            ));
          }
          return;
        }

        if (status === 'failed') {
          stopPolling(fileId);
          const errMsg = (data.error_message as string) || '';
          setAiResults(prev => prev.map(r =>
            r.fileId === fileId ? { ...r, status: 'error' as const, description: errMsg } : r
          ));
          return;
        }

        // status is 'pending' or 'processing' — keep polling
        if (attempts >= maxAttempts) {
          stopPolling(fileId);
          setAiResults(prev => prev.map(r =>
            r.fileId === fileId ? { ...r, status: 'error' } : r
          ));
        }
      } catch {
        // Network error — keep polling unless max reached
        if (attempts >= maxAttempts) {
          stopPolling(fileId);
          setAiResults(prev => prev.map(r =>
            r.fileId === fileId ? { ...r, status: 'error' } : r
          ));
        }
      }
    };

    poll();
    const interval = setInterval(poll, pollMs);
    pollingIntervals.current.set(fileId, interval);
  }, [token, autoSaveAiTags]);

  // Manual trigger for a specific file
  const handleRetryAi = useCallback((fileId: string, fileName: string) => {
    // Remove old result
    setAiResults(prev => prev.filter(r => r.fileId !== fileId));
    // Clear old polling if any
    if (pollingIntervals.current.has(fileId)) {
      clearInterval(pollingIntervals.current.get(fileId)!);
      pollingIntervals.current.delete(fileId);
    }
    pollAndAutoSave(fileId, fileName);
  }, [pollAndAutoSave]);

  const uploadFile = useCallback(async (uploadId: string, file: File) => {
    if (!token) {
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error' as const } : u));
      addToast('error', 'Authentication required for file upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (tags.trim()) formData.append('tags', tags.trim());

      const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

      const uploadResult = await new Promise<{ file: { id: string; original_filename: string; size_bytes: number }; hash: string; is_duplicate: boolean }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress } : u));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Invalid JSON response')); }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error?.message || `Upload failed: ${xhr.status}`));
            } catch { reject(new Error(`Upload failed: ${xhr.status}`)); }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.open('POST', `${restBaseUrl}/files`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 60000;
        xhr.send(formData);
      });

      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, progress: 100, status: 'completed' as const, fileId: uploadResult.file?.id }
          : u
      ));

      // Move to subfolder if needed
      const restBaseUrl2 = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';
      if (folderId && uploadResult.file?.id) {
        await fetch(`${restBaseUrl2}/files/${uploadResult.file.id}/move`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_id: folderId })
        });
      }

      addToast('success', `"${file.name}" uploaded`);
      onUploadComplete?.();

      // Start AI analysis automatically
      if (uploadResult.file?.id) {
        pollAndAutoSave(uploadResult.file.id, file.name);
      }

    } catch (error) {
      setUploads(prev => prev.map(u =>
        u.id === uploadId ? { ...u, status: 'error' as const } : u
      ));
      addToast('error', `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [token, folderId, tags, addToast, onUploadComplete, pollAndAutoSave]);

  const startRealUpload = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const uploadId = `upload-${Date.now()}-${Math.random()}`;
      setUploads(prev => [...prev, { id: uploadId, name: file.name, progress: 0, size: file.size, status: 'uploading' }]);
      uploadFile(uploadId, file);
    });
  }, [uploadFile]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    startRealUpload(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) startRealUpload(e.dataTransfer.files);
  };

  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const aiDoneCount = aiResults.filter(r => r.status === 'done').length;
  const aiTagsTotal = aiResults.reduce((sum, r) => sum + r.tags.length, 0);

  return (
    <>
      <input ref={fileInputRef} type="file" multiple onChange={handleInputChange} className="hidden" disabled={disabled} />

      <Button onClick={openModal} disabled={disabled}>
        <Upload className="h-4 w-4 mr-2" />
        Upload Files
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative bg-white dark:bg-[#1E1F20] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground">Upload Files</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {completedCount > 0
                      ? `${completedCount} uploaded${aiDoneCount > 0 ? ` · ${aiTagsTotal} AI tags added` : ''}`
                      : 'Add files to your vault'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Tags Input */}
              <div>
                <label htmlFor="file-tags" className="block text-sm font-medium text-foreground mb-1.5">
                  Manual Tags <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="file-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="work, documents, important"
                  className="w-full px-4 py-2.5 bg-surface dark:bg-surface-variant border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Comma-separated. AI tags are added automatically after upload.
                </p>
              </div>

              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-6 transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <div className="text-center">
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center ${isDragging ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Upload className={`h-7 w-7 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} className="!rounded-full !px-6">
                    <Upload className="w-4 h-4 mr-2" /> Choose Files
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">or drag and drop</p>
                </div>
              </div>

              {/* Upload List + AI Results (combined per file) */}
              {uploads.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Files ({uploads.length})
                  </h4>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    {uploads.map((upload) => {
                      const aiResult = aiResults.find(r => r.fileId === upload.fileId);

                      return (
                        <div
                          key={upload.id}
                          className="bg-surface dark:bg-surface-variant rounded-xl p-3 border border-gray-100 dark:border-gray-800"
                        >
                          {/* File row */}
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              {upload.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : upload.status === 'error' ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                              )}
                            </div>
                            <span className="text-sm text-foreground truncate flex-1">{upload.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{formatSize(upload.size)}</span>
                            {upload.status !== 'uploading' && (
                              <button onClick={() => removeUpload(upload.id)} className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Progress bar (only while uploading) */}
                          {upload.status === 'uploading' && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${upload.progress}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400 w-7 text-right">{upload.progress}%</span>
                            </div>
                          )}

                          {/* AI Result inline */}
                          {upload.status === 'completed' && aiResult && (
                            <AnimatePresence>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                transition={{ duration: 0.25 }}
                                className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800"
                              >
                                {aiResult.status === 'analyzing' && (
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                                    <span className="text-[11px] text-violet-500">AI analyzing file...</span>
                                  </div>
                                )}

                                {aiResult.status === 'saving' && (
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                                    <span className="text-[11px] text-green-600">Saving AI tags...</span>
                                  </div>
                                )}

                                {aiResult.status === 'done' && (
                                  <div className="space-y-1.5">
                                    {/* AI Tags */}
                                    {aiResult.tags.length > 0 && (
                                      <div className="flex items-start gap-1.5">
                                        <Sparkles className="h-3 w-3 text-violet-500 mt-0.5 shrink-0" />
                                        <div className="flex flex-wrap gap-1">
                                          {aiResult.tags.map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 rounded-full">
                                              {tag}
                                            </span>
                                          ))}
                                          <span className="text-[10px] text-green-600 dark:text-green-400 self-center">saved</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* AI Description */}
                                    {aiResult.description && (
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pl-[18px]">
                                        {aiResult.description}
                                      </p>
                                    )}

                                    {/* Suggested Folder */}
                                    {aiResult.suggestedFolder && (
                                      <div className="flex items-center gap-1.5 pl-[18px]">
                                        <FolderInput className="h-3 w-3 text-amber-500" />
                                        <span className="text-[10px] text-gray-500">
                                          Suggested folder: <span className="font-medium text-foreground">{aiResult.suggestedFolder}</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {aiResult.status === 'error' && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 italic">AI analysis unavailable</span>
                                    {upload.fileId && (
                                      <button
                                        onClick={() => handleRetryAi(upload.fileId!, upload.name)}
                                        className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
                                      >
                                        <RotateCw className="h-2.5 w-2.5" /> Retry
                                      </button>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            </AnimatePresence>
                          )}

                          {/* Generate AI Tags button for completed files without AI result */}
                          {upload.status === 'completed' && upload.fileId && !aiResult && (
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                              <button
                                onClick={() => pollAndAutoSave(upload.fileId!, upload.name)}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                              >
                                <Sparkles className="h-3 w-3" />
                                Generate AI Tags
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-surface dark:bg-surface-variant flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {aiResults.some(r => r.status === 'analyzing') && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-[10px] text-violet-500">AI analyzing...</span>
                  </div>
                )}
                {aiDoneCount > 0 && !aiResults.some(r => r.status === 'analyzing') && (
                  <span className="text-[10px] text-green-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {aiTagsTotal} AI tags auto-saved
                  </span>
                )}
              </div>
              <Button variant="secondary" onClick={closeModal} className="!rounded-full !px-6">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
