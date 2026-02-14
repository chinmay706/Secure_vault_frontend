import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../hooks/useSearch';
import { useToast } from '../hooks/useToast';
import { FileItem } from '../types';
import { DELETE_FILE } from '../graphql';
import { AdminStats } from '../components/admin/AdminStats';
import { AdminFilesTable } from '../components/admin/AdminFilesTable';
import { SearchModal } from '../components/common/SearchModal';
import { PreviewModal } from '../components/files/PreviewModal';
import { MoveModal } from '../components/files/MoveModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';

export const AdminPage: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const { searchOpen, closeSearch } = useSearch();
  const [currentView, setCurrentView] = useState<'stats' | 'files'>('stats');

  // State for modals and actions
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToMove, setFileToMove] = useState<FileItem | null>(null);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  // Delete file mutation
  const [deleteFile] = useMutation(DELETE_FILE, {
    onCompleted: () => {
      addToast('success', 'File deleted successfully!');
      // Refresh the admin files table
      window.location.reload();
    },
    onError: (error) => {
      addToast('error', `Failed to delete file: ${error.message}`);
    }
  });

  // Handler implementations similar to MainPage
  const handleFileDownload = async (file: FileItem) => {
    if (!token) {
      addToast('error', 'Authentication required for file download');
      return;
    }

    try {
      // Get REST API base URL from environment
      const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

      // Download file using REST API
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

      // Extract filename from Content-Disposition header or use original filename
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file.original_filename;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Get the file blob
      const blob = await response.blob();

      // Create download link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addToast('success', `File "${filename}" downloaded successfully!`);

    } catch (error) {
      addToast('error', `Failed to download "${file.original_filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFilePreview = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleToggleFilePublic = async (_file: FileItem) => {
    // TODO: Implement TOGGLE_FILE_PUBLIC mutation in Phase 5
    addToast('info', 'Public toggle functionality coming in Phase 5');
  };

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const handleMoveFile = (file: FileItem) => {
    setFileToMove(file);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      addToast('info', `Deleting "${fileToDelete.original_filename}"...`);
      await deleteFile({
        variables: { id: fileToDelete.id }
      });
    } catch (_error) {
      // Error is already handled by the mutation's onError callback
    } finally {
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  const cancelDeleteFile = () => {
    setShowDeleteConfirm(false);
    setFileToDelete(null);
  };

  return (
    <div className="h-full flex flex-col">
      {currentView === 'stats' ? (
        <>
          <div className="shrink-0 pb-4 sm:pb-6">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">System overview and management tools</p>
          </div>

          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pb-4">
            <AdminStats onViewAllFiles={() => setCurrentView('files')} />
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => setCurrentView('stats')}
                className="flex items-center gap-1.5 sm:gap-2 text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden xs:inline">Back to Dashboard</span>
                <span className="xs:hidden">Back</span>
              </Button>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">All Files</h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Manage all files in the system</p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pb-4">
            <AdminFilesTable />
          </div>
        </>
      )}

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

      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleFileDownload}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={cancelDeleteFile}
        onConfirm={confirmDeleteFile}
        title="Delete File"
        message={
          fileToDelete
            ? `Are you sure you want to delete "${fileToDelete.original_filename}"?\n\nThis action cannot be undone.`
            : "Are you sure you want to delete this file?"
        }
        confirmText="Delete File"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Move File Modal */}
      {fileToMove && (
        <MoveModal
          item={fileToMove}
          itemType="file"
          onClose={() => setFileToMove(null)}
        />
      )}
    </div>
  );
};