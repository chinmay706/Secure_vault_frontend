import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Globe, File, Folder, Eye, Download, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import { FileItem, FolderItem } from '../types';
import { formatFileSize, formatDate } from '../utils/formatting';
import { PreviewModal } from '../components/files/PreviewModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { filesApi, foldersApi } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { FILES } from '../graphql/queries';

// File icon helpers
const getFileIcon = (mimeType: string, filename: string) => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  return '📁';
};

export const SharedFilesPage: React.FC = () => {
  const { addToast } = useToast();
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ item: FileItem | FolderItem; type: 'file' | 'folder' } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Get all files - we'll filter for shared ones on the client
  const { data, loading, refetch } = useQuery(FILES, {
    variables: { page: 1, page_size: 100 },
    fetchPolicy: 'cache-and-network',
  });

  // Filter to only get shared files
  const sharedFiles = (data?.files?.files || []).filter(
    (f: FileItem) => f.is_public || f.share_link?.is_active
  );
  
  // Note: Shared folders are not supported via this query
  // They would need a separate endpoint or the folders query to include share_link
  const sharedFolders: FolderItem[] = [];

  const handleDownload = async (file: FileItem) => {
    try {
      const blob = await filesApi.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('success', `Downloaded ${file.original_filename}`);
    } catch {
      addToast('error', 'Failed to download file');
    }
  };

  const handleCopyLink = async (token: string, type: 'file' | 'folder') => {
    const baseUrl = window.location.origin;
    const url = type === 'file' 
      ? `${baseUrl}/public/files/share/${token}`
      : `${baseUrl}/public/folders/share/${token}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(token);
      setTimeout(() => setCopiedLink(null), 2000);
      addToast('success', 'Link copied to clipboard');
    } catch {
      addToast('error', 'Failed to copy link');
    }
  };

  const handleRemoveShare = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.type === 'file') {
        await filesApi.updateFileVisibility(deleteItem.item.id, false);
      } else {
        await foldersApi.removeShareLink(deleteItem.item.id);
      }
      addToast('success', 'Share removed');
      refetch();
    } catch {
      addToast('error', 'Failed to remove share');
    } finally {
      setDeleteItem(null);
    }
  };

  const totalItems = sharedFiles.length + sharedFolders.length;

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      {/* Header */}
      <div className="shrink-0 pb-4 sm:pb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Shared Files</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {totalItems} shared item{totalItems !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-2 sm:space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-surface rounded-xl animate-pulse border border-gray-100 dark:border-gray-800">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Globe className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No shared files</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto px-4">
              Files and folders you share publicly will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Shared Folders */}
            {sharedFolders.map((folder: FolderItem) => (
              <div
                key={folder.id}
                className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-gray-700 transition-all group"
              >
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                  <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="text-xs sm:text-sm font-medium text-foreground truncate">{folder.name}</h3>
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    Shared {formatDate(folder.share_link?.created_at || folder.created_at)}
                    {folder.share_link?.download_count !== undefined && folder.share_link.download_count > 0 && (
                      <span className="hidden xs:inline"> • {folder.share_link.download_count} views</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {folder.share_link?.token && (
                    <>
                      <a
                        href={`/public/folders/share/${folder.share_link.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden sm:block"
                        title="Open link"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                      <button
                        onClick={() => handleCopyLink(folder.share_link!.token, 'folder')}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Copy link"
                      >
                        {copiedLink === folder.share_link.token ? (
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDeleteItem({ item: folder, type: 'folder' })}
                    className="p-1.5 sm:p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 hover:text-red-600 transition-colors"
                    title="Remove share"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Shared Files */}
            {sharedFiles.map((file: FileItem) => (
              <div
                key={file.id}
                className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-gray-700 transition-all group cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0 text-sm sm:text-lg">
                  {getFileIcon(file.mime_type, file.original_filename)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="text-xs sm:text-sm font-medium text-foreground truncate">{file.original_filename}</h3>
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {formatFileSize(file.size_bytes)}
                    <span className="hidden xs:inline"> • Shared {formatDate(file.share_link?.created_at || file.created_at)}</span>
                    {file.download_count > 0 && (
                      <span className="hidden sm:inline"> • {file.download_count} downloads</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden sm:block"
                    title="Preview"
                  >
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  {file.share_link?.token && (
                    <>
                      <a
                        href={`/public/files/share/${file.share_link.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden sm:block"
                        title="Open link"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                      <button
                        onClick={() => handleCopyLink(file.share_link!.token, 'file')}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden xs:block"
                        title="Copy link"
                      >
                        {copiedLink === file.share_link.token ? (
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDeleteItem({ item: file, type: 'file' })}
                    className="p-1.5 sm:p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 hover:text-red-600 transition-colors"
                    title="Remove share"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* Confirm Remove Share */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleRemoveShare}
        title="Remove Share"
        message={`Are you sure you want to stop sharing "${deleteItem?.type === 'file' ? (deleteItem.item as FileItem).original_filename : (deleteItem?.item as FolderItem)?.name}"? The public link will no longer work.`}
        confirmText="Remove Share"
        variant="danger"
      />
    </div>
  );
};

