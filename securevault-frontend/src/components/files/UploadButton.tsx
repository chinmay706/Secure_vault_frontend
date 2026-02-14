import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Cloud } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';

interface UploadProgressItem {
  id: string;
  name: string;
  progress: number;
  size: number;
  status: 'uploading' | 'completed' | 'error';
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

  const { token } = useAuth();
  const { addToast } = useToast();

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsDragging(false);
    setTags('');
  }, []);

  const uploadFile = useCallback(async (uploadId: string, file: File) => {
    if (!token) {
      setUploads(prev =>
        prev.map(upload =>
          upload.id === uploadId
            ? { ...upload, status: 'error' }
            : upload
        )
      );
      addToast('error', 'Authentication required for file upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }

      const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

      const uploadResult = await new Promise<{ file: { id: string; original_filename: string; size_bytes: number }; hash: string; is_duplicate: boolean }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploads(prev =>
              prev.map(upload =>
                upload.id === uploadId
                  ? { ...upload, progress }
                  : upload
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error?.message || `Upload failed: ${xhr.status} ${xhr.statusText}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload timeout'));
        };

        xhr.open('POST', `${restBaseUrl}/files`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 60000;
        xhr.send(formData);
      });

      setUploads(prev =>
        prev.map(upload =>
          upload.id === uploadId
            ? { ...upload, progress: 100, status: 'completed' }
            : upload
        )
      );

      const isRoot = !folderId;

      if (!isRoot && uploadResult.file?.id) {
        const moveResponse = await fetch(`${restBaseUrl}/files/${uploadResult.file.id}/move`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            folder_id: folderId
          })
        });

        if (!moveResponse.ok) {
          const errorData = await moveResponse.json().catch(() => ({}));
          throw new Error(`Failed to move file to folder: ${errorData.error?.message || moveResponse.statusText}`);
        }
      }

      addToast('success', `File "${file.name}" uploaded successfully!`);

      setTimeout(() => {
        setUploads(prev => prev.filter(upload => upload.id !== uploadId));
      }, 2000);

      onUploadComplete?.();

    } catch (error) {
      setUploads(prev =>
        prev.map(upload =>
          upload.id === uploadId
            ? { ...upload, status: 'error' }
            : upload
        )
      );

      addToast('error', `Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [token, folderId, tags, addToast, onUploadComplete]);

  const startRealUpload = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const uploadId = `upload-${Date.now()}-${Math.random()}`;
      const uploadItem: UploadProgressItem = {
        id: uploadId,
        name: file.name,
        progress: 0,
        size: file.size,
        status: 'uploading'
      };

      setUploads(prev => [...prev, uploadItem]);
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
    setUploads(prev => prev.filter(upload => upload.id !== uploadId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startRealUpload(e.dataTransfer.files);
    }
  };

  const modalUploads = useMemo(() => uploads, [uploads]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <Button onClick={openModal} disabled={disabled}>
        <Upload className="h-4 w-4 mr-2" />
        Upload Files
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-[#1E1F20] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground">Upload Files</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Add files to your drive</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Tags Input */}
              <div>
                <label htmlFor="file-tags" className="block text-sm font-medium text-foreground mb-2">
                  Tags <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="file-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="work, documents, important"
                  className="w-full px-4 py-3 bg-surface dark:bg-surface-variant border border-gray-200 dark:border-gray-700 rounded-xl text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Separate tags with commas. Tags will apply to all uploaded files.
                </p>
              </div>

              {/* Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${
                    isDragging ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="!rounded-full !px-6"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Files
                    </Button>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      or drag and drop files here
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Progress List */}
              {modalUploads.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span>Uploading</span>
                    <span className="text-xs text-gray-400 font-normal">({modalUploads.length} files)</span>
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {modalUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="bg-surface dark:bg-surface-variant rounded-xl p-3 border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {upload.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : upload.status === 'error' ? (
                              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 shrink-0">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                              </div>
                            )}
                            <span className="text-sm text-foreground truncate">{upload.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(upload.size)}</span>
                            <button
                              onClick={() => removeUpload(upload.id)}
                              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                upload.status === 'completed'
                                  ? 'bg-green-500'
                                  : upload.status === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-primary'
                              }`}
                              style={{ width: `${upload.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{upload.progress}%</span>
                        </div>
                        {upload.status === 'error' && (
                          <p className="text-xs text-red-500 mt-1.5">Upload failed</p>
                        )}
                        {upload.status === 'completed' && (
                          <p className="text-xs text-green-500 mt-1.5">Completed</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-surface dark:bg-surface-variant flex justify-end">
              <Button variant="secondary" onClick={closeModal} className="!rounded-full !px-6">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
