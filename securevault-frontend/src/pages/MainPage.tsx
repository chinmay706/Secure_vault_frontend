import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderPlus, LayoutGrid, List as ListIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery, useMutation } from '@apollo/client';
import { FileItem, FolderChildrenResponse, FolderItem as FolderType } from '../types';
import { FILES, FOLDERS_ONLY, FOLDER, CREATE_FOLDER, TRASH_FILE, TRASH_FOLDER } from '../graphql';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../hooks/useSearch';
import { UploadButton } from '../components/files/UploadButton';
import { PreviewModal } from '../components/files/PreviewModal';
import { MoveModal } from '../components/files/MoveModal';
import { SearchModal } from '../components/common/SearchModal';
import { ShareModal } from '../components/common/ShareModal';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ListSkeleton } from '../components/ui/Skeleton';
import { FileCard } from '../components/files/FileCard';
import { FileRow } from '../components/files/FileRow';

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'date' | 'type' | 'size';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const MainPage: React.FC = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { token } = useAuth();
  const { searchOpen, closeSearch } = useSearch();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('sv.ui.viewMode') as ViewMode) || 'grid';
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const saved = localStorage.getItem('sv.ui.sortConfig');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { field: 'name', direction: 'asc' };
      }
    }
    return { field: 'name', direction: 'asc' };
  });

  useEffect(() => {
    localStorage.setItem('sv.ui.viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('sv.ui.sortConfig', JSON.stringify(sortConfig));
  }, [sortConfig]);

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [fileToMove, setFileToMove] = useState<FileItem | null>(null);
  const [folderToMove, setFolderToMove] = useState<FolderType | null>(null);
  const [shareItem, setShareItem] = useState<FileItem | FolderType | null>(null);
  const [shareItemType, setShareItemType] = useState<'file' | 'folder'>('file');

  // Get persisted page for current folder
  const getPersistedPage = (folderId?: string) => {
    const key = `sv.ui.page.${folderId || 'root'}`;
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 1;
  };

  // Set persisted page for current folder  
  const setPersistedPage = (folderId: string | undefined, page: number) => {
    const key = `sv.ui.page.${folderId || 'root'}`;
    localStorage.setItem(key, page.toString());
  };

  const [currentPage, setCurrentPage] = useState(() => getPersistedPage(folderId));

  // Update page when folder changes
  useEffect(() => {
    setCurrentPage(getPersistedPage(folderId));
  }, [folderId]);

  // Update persisted page when currentPage changes
  useEffect(() => {
    setPersistedPage(folderId, currentPage);
  }, [folderId, currentPage]);

  const isRoot = !folderId;

  // Folders query
  const {
    data: foldersData,
    loading: foldersLoading,
    error: foldersError,
    refetch: refetchFolders
  } = useQuery(FOLDERS_ONLY, {
    variables: {
      parent_id: isRoot ? null : folderId,
    },
    fetchPolicy: 'cache-and-network',
  });

  // Files query
  const {
    data: filesData,
    loading: filesLoading,
    error: filesError,
    refetch: refetchFiles
  } = useQuery(FILES, {
    variables: {
      folder_id: isRoot ? null : folderId,
      page: currentPage,
      page_size: 20
    },
    fetchPolicy: 'cache-and-network',
  });

  // Query folder details for breadcrumbs
  const {
    data: folderData,
    loading: folderLoading,
    error: folderError,
  } = useQuery(FOLDER, {
    variables: { id: folderId! },
    skip: !folderId,
  });

  // Create folder mutation
  const [createFolder, { loading: createFolderLoading }] = useMutation(CREATE_FOLDER, {
    onCompleted: (data) => {
      addToast('success', `Folder "${data.createFolder.name}" created successfully!`);
      setShowCreateFolder(false);
      setNewFolderName('');
      refetchData();
    },
    onError: (error) => {
      addToast('error', `Failed to create folder: ${error.message}`);
    }
  });

  // Trash file mutation (soft-delete)
  const [trashFile] = useMutation(TRASH_FILE, {
    onCompleted: () => {
      addToast('success', 'File moved to trash');
      refetchData();
    },
    onError: (error) => {
      addToast('error', `Failed to move file to trash: ${error.message}`);
    }
  });

  // Trash folder mutation (soft-delete)
  const [trashFolder] = useMutation(TRASH_FOLDER, {
    onCompleted: () => {
      addToast('success', 'Folder moved to trash');
      refetchData();
    },
    onError: (error) => {
      addToast('error', `Failed to move folder to trash: ${error.message}`);
    }
  });

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sorting function for files
  const sortFiles = (files: FileItem[], config: SortConfig): FileItem[] => {
    return [...files].sort((a, b) => {
      let comparison = 0;

      switch (config.field) {
        case 'name':
          comparison = a.original_filename.localeCompare(b.original_filename);
          break;
        case 'date':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        case 'type':
          comparison = (a.mime_type || '').localeCompare(b.mime_type || '');
          break;
        case 'size':
          comparison = a.size_bytes - b.size_bytes;
          break;
        default:
          comparison = 0;
      }

      return config.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Sorting function for folders (only by name and date)
  const sortFolders = (folders: FolderType[], config: SortConfig): FolderType[] => {
    return [...folders].sort((a, b) => {
      let comparison = 0;

      switch (config.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        // For type and size, keep folders in name order
        case 'type':
        case 'size':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = 0;
      }

      // For folders, only reverse for name and date
      if (config.field === 'name' || config.field === 'date') {
        return config.direction === 'asc' ? comparison : -comparison;
      }
      return comparison;
    });
  };

  const data: FolderChildrenResponse | null = useMemo(() => {
    if (!foldersData?.foldersOnly || !filesData?.files) return null;

    const rawFolders = foldersData.foldersOnly || [];
    const rawFiles = filesData.files.files || [];

    // Apply sorting
    const sortedFolders = sortFolders(rawFolders, sortConfig);
    const sortedFiles = sortFiles(rawFiles, sortConfig);

    return {
      folders: sortedFolders,
      files: sortedFiles,
      pagination: {
        page: filesData.files.page || currentPage,
        page_size: filesData.files.page_size || 20,
        total_folders: rawFolders.length,
        total_files: filesData.files.total || 0,
        has_more: false
      }
    };
  }, [foldersData, filesData, currentPage, sortConfig]);

  const loading = foldersLoading || filesLoading || (folderId && folderLoading);

  // Refetch queries when needed
  const refetchData = React.useCallback(() => {
    refetchFolders();
    refetchFiles();
  }, [refetchFolders, refetchFiles]);

  const handleFolderClick = (folder: FolderType) => {
    navigate(`/app/folder/${folder.id}`);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const variables: { name: string; parent_id?: string } = {
      name: newFolderName.trim()
    };

    // Add parent_id only if we're inside a subfolder
    if (folderId) {
      variables.parent_id = folderId;
    }

    await createFolder({ variables });
  };

  const handleFilePreview = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleFileDownload = async (file: FileItem) => {
    if (!token) {
      addToast('error', 'Authentication required for file download');
      return;
    }

    try {
      const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${restBaseUrl}/files/${file.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Download failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file.original_filename;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addToast('success', `File "${filename}" downloaded successfully!`);
    } catch (error) {
      addToast('error', `Failed to download "${file.original_filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleFilePublic = async () => {
    refetchData();
  };

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const handleMoveFile = (file: FileItem) => {
    setFileToMove(file);
  };

  const handleMoveFolder = (folder: FolderType) => {
    setFolderToMove(folder);
  };

  const handleShareFile = (file: FileItem) => {
    setShareItem(file);
    setShareItemType('file');
  };

  const handleShareFolder = (folder: FolderType) => {
    setShareItem(folder);
    setShareItemType('folder');
  };

  const closeShareModal = () => {
    setShareItem(null);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      addToast('info', `Moving "${fileToDelete.original_filename}" to trash...`);
      await trashFile({ variables: { id: fileToDelete.id } });
    } catch {
      // Error is handled by the mutation's onError callback
    } finally {
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  const cancelDeleteFile = () => {
    setShowDeleteConfirm(false);
    setFileToDelete(null);
  };

  const handleDeleteFolder = (folder: FolderType) => {
    setFolderToDelete(folder);
    setShowFolderDeleteConfirm(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      addToast('info', `Moving folder "${folderToDelete.name}" to trash...`);
      await trashFolder({ variables: { id: folderToDelete.id, recursive: true } });
    } catch {
      // Error is handled by the mutation's onError callback
    } finally {
      setShowFolderDeleteConfirm(false);
      setFolderToDelete(null);
    }
  };

  const cancelDeleteFolder = () => {
    setShowFolderDeleteConfirm(false);
    setFolderToDelete(null);
  };

  const getCurrentFolder = (): FolderType | null => {
    if (!folderId || !folderData?.folder?.folder) return null;
    return folderData.folder.folder;
  };

  const getBreadcrumbs = () => {
    if (!folderId || !folderData?.folder?.breadcrumbs) return [];
    return folderData.folder.breadcrumbs;
  };

  // Sort Header Component
  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isActive = sortConfig.field === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${isActive ? 'text-gray-800 dark:text-gray-100' : ''} ${className}`}
      >
        {children}
        {isActive && (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        )}
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed at top */}
      <div className="shrink-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white truncate">
            {getCurrentFolder()?.name || 'My Drive'}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                title="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button variant="secondary" onClick={() => setShowCreateFolder(true)} className="text-sm">
              <FolderPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
            <UploadButton folderId={folderId} onUploadComplete={refetchData} />
          </div>
        </div>

        <Breadcrumbs items={getBreadcrumbs()} />
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
        {loading ? (
          <ListSkeleton />
        ) : foldersError || filesError || folderError ? (
          <div className="text-center py-12">
            <p className="text-red-400">Failed to load content</p>
            <p className="text-gray-400 text-sm mt-2">
              {foldersError?.message || filesError?.message || folderError?.message}
            </p>
          </div>
        ) : data ? (
          <div className="space-y-4 pb-4">
            {data.folders.length === 0 && data.files.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <FolderPlus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Empty folder</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Upload files or create a folder to get started</p>
              </div>
            )}

            {/* List View with Sortable Headers */}
            {viewMode === 'list' && (data.folders.length > 0 || data.files.length > 0) && (
              <div className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Sortable Header Row - Sticky */}
                <div className="flex items-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-surface-variant select-none sticky top-0 z-10">
                  <div className="flex-1 pl-10">
                    <SortHeader field="name">Name</SortHeader>
                  </div>
                  <div className="w-32 hidden md:block">
                    <SortHeader field="date">Modified</SortHeader>
                  </div>
                  <div className="w-28 hidden lg:block">
                    <SortHeader field="type">Type</SortHeader>
                  </div>
                  <div className="w-20 hidden sm:block">
                    <SortHeader field="size">Size</SortHeader>
                  </div>
                  <div className="w-28 sm:w-36 text-right pr-2">Actions</div>
                </div>

                {/* Folders */}
                {data.folders.map((folder) => (
                  <FileRow
                    key={folder.id}
                    item={folder}
                    type="folder"
                    onClick={() => handleFolderClick(folder)}
                    onDelete={() => handleDeleteFolder(folder)}
                    onShare={() => handleShareFolder(folder)}
                    onMove={() => handleMoveFolder(folder)}
                  />
                ))}

                {/* Files */}
                {data.files.map((file) => (
                  <FileRow
                    key={file.id}
                    item={file}
                    type="file"
                    onDownload={() => handleFileDownload(file)}
                    onPreview={() => handleFilePreview(file)}
                    onDelete={() => handleDeleteFile(file)}
                    onShare={() => handleShareFile(file)}
                    onMove={() => handleMoveFile(file)}
                  />
                ))}
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <>
                {/* Folders */}
                {data.folders.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Folders</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {data.folders.map((folder) => (
                        <FileCard
                          key={folder.id}
                          item={folder}
                          type="folder"
                          onClick={() => handleFolderClick(folder)}
                          onDelete={() => handleDeleteFolder(folder)}
                          onShare={() => handleShareFolder(folder)}
                          onMove={() => handleMoveFolder(folder)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {data.files.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Files</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {data.files.map((file) => (
                        <FileCard
                          key={file.id}
                          item={file}
                          type="file"
                          onDownload={() => handleFileDownload(file)}
                          onPreview={() => handleFilePreview(file)}
                          onDelete={() => handleDeleteFile(file)}
                          onShare={() => handleShareFile(file)}
                          onMove={() => handleMoveFile(file)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {data.pagination.total_files > data.pagination.page_size && (
              <Pagination
                currentPage={data.pagination.page}
                totalPages={Math.ceil(data.pagination.total_files / data.pagination.page_size)}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* Create Folder Modal */}
      <Modal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} title="Create New Folder">
        <div className="space-y-4">
          <Input
            label="Folder Name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderLoading}>
              {createFolderLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <PreviewModal file={previewFile} isOpen={!!previewFile} onClose={() => setPreviewFile(null)} onDownload={handleFileDownload} />

      {/* Move to Trash Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={cancelDeleteFile}
        onConfirm={confirmDeleteFile}
        title="Move to Trash"
        message={fileToDelete ? `Move "${fileToDelete.original_filename}" to trash?\n\nYou can restore it later from the Trash page.` : "Move this file to trash?"}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Folder Move to Trash Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showFolderDeleteConfirm}
        onClose={cancelDeleteFolder}
        onConfirm={confirmDeleteFolder}
        title="Move to Trash"
        message={folderToDelete ? `Move the folder "${folderToDelete.name}" and all its contents to trash?\n\nYou can restore it later from the Trash page.` : "Move this folder to trash?"}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={closeSearch}
        onDownload={handleFileDownload}
        onPreview={handleFilePreview}
        onTogglePublic={handleToggleFilePublic}
        onDelete={handleDeleteFile}
        onMove={handleMoveFile}
      />

      {/* Move File Modal */}
      {fileToMove && <MoveModal item={fileToMove} itemType="file" onClose={() => setFileToMove(null)} />}

      {/* Move Folder Modal */}
      {folderToMove && <MoveModal item={folderToMove} itemType="folder" onClose={() => setFolderToMove(null)} />}

      {/* Share Modal */}
      {shareItem && <ShareModal isOpen={!!shareItem} item={shareItem} itemType={shareItemType} onClose={closeShareModal} />}
    </div>
  );
};
