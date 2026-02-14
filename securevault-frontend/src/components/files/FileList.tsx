import React, { useState } from 'react';
import { 
  File, 
  Download, 
  Share2, 
  Trash2, 
  Eye, 
  Lock, 
  Globe, 
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
import { FileItem } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatting';

interface FileListProps {
  files: FileItem[];
  isPublic?: boolean;
  onDownload: (file: FileItem) => void;
  onPreview?: (file: FileItem) => void;
  onTogglePublic?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onMove?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  loading?: boolean;
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
  
  return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
};

export const FileList: React.FC<FileListProps> = ({
  files,
  isPublic = false,
  onDownload,
  onPreview,
  onDelete,
  onMove,
  onShare,
  loading = false
}) => {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleDownload = async (file: FileItem) => {
    setLoadingFile(file.id);
    try {
      await onDownload(file);
    } finally {
      setLoadingFile(null);
    }
  };

  const handleDoubleClick = (file: FileItem) => {
    if (onPreview) {
      onPreview(file);
    }
  };

  // Check if file is publicly shared (has active share link)
  const isShared = (file: FileItem) => {
    return file.is_public || file.share_link?.is_active;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 bg-white dark:bg-surface rounded-xl animate-pulse border border-gray-100 dark:border-gray-800">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <File className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No files found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          {isPublic ? 'This folder is empty.' : 'Upload some files to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const canDownload = isPublic ? !!file.share_link?.token : true;
        const fileIsShared = isShared(file);
        const FileIcon = getFileIcon(file.mime_type, file.original_filename);
        const iconColorClass = getIconColorClass(file.mime_type, file.original_filename);

        return (
          <div
            key={file.id}
            className="flex items-center space-x-4 p-4 bg-white dark:bg-surface rounded-xl hover:bg-blue-50 dark:hover:bg-gray-800/70 transition-all duration-150 cursor-pointer select-none border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-gray-700 hover:shadow-sm active:scale-[0.995]"
            onDoubleClick={() => handleDoubleClick(file)}
            title={onPreview ? "Double-click to preview" : undefined}
          >
            <div className="flex-shrink-0">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconColorClass}`}>
                <FileIcon className="h-5 w-5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {file.original_filename}
                </h3>
                {/* Shared/Public indicator */}
                {fileIsShared ? (
                  <div title="Publicly shared" className="shrink-0">
                    <Globe className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <div title="Private" className="shrink-0">
                    <Lock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatFileSize(file.size_bytes)}</span>
                <span className="hidden sm:inline">{file.mime_type}</span>
                <span>{formatDate(file.created_at)}</span>
                {file.download_count !== undefined && file.download_count > 0 && (
                  <span className="hidden md:inline">{file.download_count} downloads</span>
                )}
              </div>
              {file.tags && file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {file.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions - Always visible with colored icons */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {onPreview && (
                <button
                  onClick={() => onPreview(file)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => handleDownload(file)}
                disabled={!canDownload || loadingFile === file.id}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                title="Download"
              >
                {loadingFile === file.id ? (
                  <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                <Download className="h-4 w-4" />
                )}
              </button>

              {/* Share button - Blue */}
              {!isPublic && onShare && (
                <button
                  onClick={() => onShare(file)}
                  className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}

              {/* Delete button - Red */}
              {!isPublic && onDelete && (
                <button
                  onClick={() => onDelete(file)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* More actions dropdown */}
              {!isPublic && onMove && (
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === file.id ? null : file.id)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openDropdown === file.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenDropdown(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-surface-variant rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden animate-slide-down">
                        <div className="py-1">
                            <button
                            onClick={() => {
                                onMove(file);
                                setOpenDropdown(null);
                              }}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors active:bg-gray-200 dark:active:bg-gray-700"
                            >
                            <Move className="h-4 w-4 mr-3 text-gray-400" />
                              Move
                            </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
