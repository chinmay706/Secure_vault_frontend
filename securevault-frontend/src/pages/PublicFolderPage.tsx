import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import FolderTree from '../components/public/FolderTree';
import { PublicFolderPreviewModal } from '../components/public/PublicFolderPreviewModal';
import { ListSkeleton } from '../components/ui/Skeleton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useToast } from '../hooks/useToast';
import { 
  FolderOpen, 
  Shield, 
  Copy, 
  Check, 
  File, 
  Folder,
  ChevronRight,
  Lock,
  Globe,
  HardDrive
} from 'lucide-react';

interface PublicFile {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  tags: string[];
  download_url: string;
  created_at: string;
  updated_at: string;
}

interface FolderInfo {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

interface PublicSubfolder {
  folder: FolderInfo;
  files: PublicFile[];
  subfolders: PublicSubfolder[];
}

interface PublicFolder {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

interface TreeFolder {
  id: string;
  name: string;
  folders: TreeFolder[];
  files: PublicFile[];
}

interface PublicFolderResponse {
  folder: PublicFolder;
  files: PublicFile[];
  subfolders: PublicSubfolder[];
  breadcrumbs?: Array<{ id: string; name: string; }>;
}

// Count total items recursively
const countItems = (folder: TreeFolder): { files: number; folders: number } => {
  let files = folder.files.length;
  let folders = folder.folders.length;
  
  for (const subfolder of folder.folders) {
    const subCount = countItems(subfolder);
    files += subCount.files;
    folders += subCount.folders;
  }
  
  return { files, folders };
};

// Calculate total size recursively
const calculateTotalSize = (folder: TreeFolder | null): number => {
  if (!folder) return 0;
  let size = folder.files.reduce((acc, f) => acc + f.size_bytes, 0);
  for (const sub of folder.folders) {
    size += calculateTotalSize(sub);
  }
  return size;
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const PublicFolderPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { addToast } = useToast();
  const [folderResponse, setFolderResponse] = useState<PublicFolderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string; }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewFile, setPreviewFile] = useState<PublicFile | null>(null);

  useEffect(() => {
    const fetchPublicFolder = async () => {
      if (!token) {
        setError('No folder token provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_REST_BASE_URL}/public/folders/share/${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const result: PublicFolderResponse = await response.json();
          setFolderResponse(result);
          setBreadcrumbs(result.breadcrumbs || [{ id: result.folder.id, name: result.folder.name }]);
        } else if (response.status === 404) {
          setError('Folder not found or link has expired');
        } else if (response.status === 403) {
          setError('This folder is not publicly accessible');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to load folder');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load folder';
        setError(`Failed to load folder: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicFolder();
  }, [token]);

  const handleTreeFileDownload = async (file: PublicFile) => {
    try {
      const response = await fetch(file.download_url);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      addToast('success', `${file.original_filename} downloaded`);
    } catch (error) {
      console.error('Download error:', error);
      addToast('error', `Failed to download ${file.original_filename}`);
    }
  };

  const handleFilePreview = (file: PublicFile) => {
    setPreviewFile(file);
  };

  const convertToTreeFormat = (folderResp: PublicFolderResponse): TreeFolder => {
    const convertSubfolder = (subfolder: PublicSubfolder): TreeFolder => ({
      id: subfolder.folder.id,
      name: subfolder.folder.name,
      folders: subfolder.subfolders.map(convertSubfolder),
      files: subfolder.files
    });

    return {
      id: folderResp.folder.id,
      name: folderResp.folder.name,
      folders: folderResp.subfolders.map(convertSubfolder),
      files: folderResp.files
    };
  };

  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/public/folders/share/${token}`;
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

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center p-4 transition-colors">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Folder Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{error}</p>
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

  const treeData = folderResponse ? convertToTreeFormat(folderResponse) : null;
  const itemCounts = treeData ? countItems(treeData) : { files: 0, folders: 0 };
  const totalSize = calculateTotalSize(treeData);

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Folder Card */}
        <div className="bg-gray-50 dark:bg-surface rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Folder Header */}
          <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                <FolderOpen className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white break-words mb-2">
                  {folderResponse?.folder.name || 'Public Folder'}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Folder className="h-4 w-4" />
                    {itemCounts.folders} folder{itemCounts.folders !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <File className="h-4 w-4" />
                    {itemCounts.files} file{itemCounts.files !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-4 w-4" />
                    {formatSize(totalSize)}
                  </span>
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Globe className="h-4 w-4" />
                    Public
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="px-6 sm:px-8 py-3 bg-white dark:bg-background border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-sm overflow-x-auto scrollbar-hide">
                <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    {index > 0 && <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />}
                    <span className={`whitespace-nowrap ${index === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {crumb.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8 bg-white dark:bg-background">
            {loading ? (
              <ListSkeleton />
            ) : folderResponse ? (
              <FolderTree
                rootFolder={convertToTreeFormat(folderResponse)}
                onFilePreview={handleFilePreview}
                onFileDownload={handleTreeFileDownload}
                folderToken={token!}
              />
            ) : null}
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

      {/* Preview Modal */}
      {previewFile && (
        <PublicFolderPreviewModal
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleTreeFileDownload}
          folderToken={token!}
        />
      )}
    </div>
  );
};
