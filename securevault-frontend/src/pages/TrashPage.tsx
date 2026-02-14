import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText, Image, Film, Music, FileSpreadsheet, Archive, Code } from 'lucide-react';
import { useQuery, useMutation } from '@apollo/client';
import { TRASH, RESTORE_FILE, RESTORE_FOLDER, PERMANENT_DELETE_FILE, PERMANENT_DELETE_FOLDER, EMPTY_TRASH } from '../graphql';
import { FileItem, FolderItem } from '../types';
import { useToast } from '../hooks/useToast';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ListSkeleton } from '../components/ui/Skeleton';
import { formatFileSize } from '../utils/formatting';

// Get icon for file type
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-pink-500" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-orange-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <Archive className="h-5 w-5 text-yellow-500" />;
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('xml')) return <Code className="h-5 w-5 text-cyan-500" />;
  return <FileText className="h-5 w-5 text-gray-500" />;
};

// Format relative time for deletion date
const formatDeletedDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

export const TrashPage: React.FC = () => {
  const { addToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ item: FileItem | FolderItem; type: 'file' | 'folder' } | null>(null);

  // Trash query
  const {
    data: trashData,
    loading,
    error,
    refetch: refetchTrash,
  } = useQuery(TRASH, {
    variables: {
      page: currentPage,
      page_size: 20,
    },
    fetchPolicy: 'network-only',
  });

  // Mutations
  const [restoreFile] = useMutation(RESTORE_FILE, {
    onCompleted: () => {
      addToast('success', 'File restored successfully');
      refetchTrash();
    },
    onError: (error) => {
      addToast('error', `Failed to restore file: ${error.message}`);
    },
  });

  const [restoreFolder] = useMutation(RESTORE_FOLDER, {
    onCompleted: () => {
      addToast('success', 'Folder restored successfully');
      refetchTrash();
    },
    onError: (error) => {
      addToast('error', `Failed to restore folder: ${error.message}`);
    },
  });

  const [permanentDeleteFile] = useMutation(PERMANENT_DELETE_FILE, {
    onCompleted: () => {
      addToast('success', 'File permanently deleted');
      refetchTrash();
    },
    onError: (error) => {
      addToast('error', `Failed to delete file: ${error.message}`);
    },
  });

  const [permanentDeleteFolder] = useMutation(PERMANENT_DELETE_FOLDER, {
    onCompleted: () => {
      addToast('success', 'Folder permanently deleted');
      refetchTrash();
    },
    onError: (error) => {
      addToast('error', `Failed to delete folder: ${error.message}`);
    },
  });

  const [emptyTrash] = useMutation(EMPTY_TRASH, {
    onCompleted: () => {
      addToast('success', 'Trash emptied successfully');
      setCurrentPage(1);
      refetchTrash();
    },
    onError: (error) => {
      addToast('error', `Failed to empty trash: ${error.message}`);
    },
  });

  const trash = trashData?.trash;
  const files: FileItem[] = trash?.files || [];
  const folders: FolderItem[] = trash?.folders || [];
  const total = trash?.total || 0;
  const pageSize = trash?.page_size || 20;
  const totalPages = Math.ceil(total / pageSize);
  const hasItems = files.length > 0 || folders.length > 0;

  const handleRestore = async (item: FileItem | FolderItem, type: 'file' | 'folder') => {
    if (type === 'file') {
      await restoreFile({ variables: { id: item.id } });
    } else {
      await restoreFolder({ variables: { id: item.id } });
    }
  };

  const handlePermanentDelete = (item: FileItem | FolderItem, type: 'file' | 'folder') => {
    setItemToDelete({ item, type });
    setShowPermanentDeleteConfirm(true);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'file') {
        await permanentDeleteFile({ variables: { id: itemToDelete.item.id } });
      } else {
        await permanentDeleteFolder({ variables: { id: itemToDelete.item.id } });
      }
    } catch {
      // Handled by mutation onError
    } finally {
      setShowPermanentDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const confirmEmptyTrash = async () => {
    try {
      await emptyTrash();
    } catch {
      // Handled by mutation onError
    } finally {
      setShowEmptyTrashConfirm(false);
    }
  };

  const getItemName = () => {
    if (!itemToDelete) return '';
    if (itemToDelete.type === 'file') return (itemToDelete.item as FileItem).original_filename;
    return (itemToDelete.item as FolderItem).name;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white">
                Trash
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {total > 0 ? `${total} item${total !== 1 ? 's' : ''}` : 'No items'}
              </p>
            </div>
          </div>

          {hasItems && (
            <Button
              variant="secondary"
              onClick={() => setShowEmptyTrashConfirm(true)}
              className="text-sm text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Empty Trash
            </Button>
          )}
        </div>

        {/* Info banner */}
        {hasItems && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Items in trash will be automatically deleted after 30 days.</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">Failed to load trash</p>
            <p className="text-gray-400 text-sm mt-2">{error.message}</p>
          </div>
        ) : !hasItems ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Trash2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Trash is empty</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Items you delete will appear here</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Header Row */}
              <div className="flex items-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-surface-variant select-none">
                <div className="flex-1 pl-10">Name</div>
                <div className="w-28 hidden md:block">Deleted</div>
                <div className="w-20 hidden sm:block">Size</div>
                <div className="w-36 text-right pr-2">Actions</div>
              </div>

              {/* Folders */}
              {folders.map((folder) => (
                <div
                  key={`folder-${folder.id}`}
                  className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3 shrink-0">
                      <Folder className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {folder.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Folder</p>
                    </div>
                  </div>
                  <div className="w-28 hidden md:block text-sm text-gray-500 dark:text-gray-400">
                    {formatDeletedDate(folder.deleted_at)}
                  </div>
                  <div className="w-20 hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                    --
                  </div>
                  <div className="w-36 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRestore(folder, 'folder')}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 transition-colors"
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(folder, 'folder')}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 dark:text-red-400 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={`file-${file.id}`}
                  className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center mr-3 shrink-0">
                      {getFileIcon(file.mime_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.original_filename}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{file.mime_type}</p>
                    </div>
                  </div>
                  <div className="w-28 hidden md:block text-sm text-gray-500 dark:text-gray-400">
                    {formatDeletedDate(file.deleted_at)}
                  </div>
                  <div className="w-20 hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size_bytes)}
                  </div>
                  <div className="w-36 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRestore(file, 'file')}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 transition-colors"
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(file, 'file')}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 dark:text-red-400 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation */}
      <ConfirmDialog
        isOpen={showPermanentDeleteConfirm}
        onClose={() => {
          setShowPermanentDeleteConfirm(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmPermanentDelete}
        title="Delete Permanently"
        message={`Are you sure you want to permanently delete "${getItemName()}"?\n\nThis action cannot be undone.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Empty Trash Confirmation */}
      <ConfirmDialog
        isOpen={showEmptyTrashConfirm}
        onClose={() => setShowEmptyTrashConfirm(false)}
        onConfirm={confirmEmptyTrash}
        title="Empty Trash"
        message={`Are you sure you want to permanently delete all ${total} item${total !== 1 ? 's' : ''} in trash?\n\nThis action cannot be undone.`}
        confirmText="Empty Trash"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
