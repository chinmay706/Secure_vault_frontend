import React, { useState } from 'react';
import { 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  Download, 
  Eye,
  FileText,
  Image,
  Film,
  Music,
  FileArchive,
  FileCode,
  File,
  FileSpreadsheet,
  Presentation,
  Database,
  FileJson
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

interface TreeFolder {
  id: string;
  name: string;
  folders: TreeFolder[];
  files: PublicFile[];
}

interface FolderTreeNodeProps {
  folder: TreeFolder;
  level: number;
  onFilePreview?: (file: PublicFile) => void;
  onFileDownload: (file: PublicFile) => void;
  folderToken: string;
}

interface FolderTreeProps {
  rootFolder: TreeFolder;
  onFilePreview?: (file: PublicFile) => void;
  onFileDownload: (file: PublicFile) => void;
  folderToken: string;
}

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

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({
  folder,
  level,
  onFilePreview,
  onFileDownload,
  folderToken
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = folder.folders.length > 0 || folder.files.length > 0;
  const indent = level * 16;

  const toggleExpanded = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      {/* Folder Header */}
      <div
        className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        style={{ marginLeft: `${indent}px` }}
        onClick={toggleExpanded}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <div className={`transform transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Folder Icon */}
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 shrink-0">
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-5 h-5 text-primary" />
          ) : (
            <Folder className="w-5 h-5 text-primary" />
          )}
        </div>

        {/* Folder Name */}
        <div className="flex-1 min-w-0">
          <span className="text-gray-900 dark:text-white font-medium truncate block text-sm">
            {folder.name}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {folder.folders.length + folder.files.length} item{(folder.folders.length + folder.files.length) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Folder Contents */}
      {isExpanded && hasChildren && (
        <div className="relative mt-1">
          {/* Subfolders */}
          <div className="space-y-0.5">
            {folder.folders.map((subfolder) => (
              <FolderTreeNode
                key={subfolder.id}
                folder={subfolder}
                level={level + 1}
                onFilePreview={onFilePreview}
                onFileDownload={onFileDownload}
                folderToken={folderToken}
              />
            ))}
          </div>

          {/* Files */}
          <div className="space-y-0.5 mt-0.5">
            {folder.files.map((file) => {
              const FileIcon = getFileIcon(file.mime_type, file.original_filename);
              const canPreview = file.mime_type.startsWith('image/') || 
                                file.mime_type.startsWith('video/') || 
                                file.mime_type.startsWith('text/') || 
                                file.mime_type === 'application/pdf' ||
                                file.mime_type === 'application/json';
              
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  style={{ marginLeft: `${indent + 16}px` }}
                >
                  {/* File Icon */}
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                    <FileIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-800 dark:text-gray-100 font-medium truncate block text-sm">
                      {file.original_filename}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </div>

                  {/* File Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onFilePreview && canPreview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilePreview(file);
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDownload(file);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FolderTree: React.FC<FolderTreeProps> = ({
  rootFolder,
  onFilePreview,
  onFileDownload,
  folderToken
}) => {
  const totalItems = rootFolder.folders.length + rootFolder.files.length;
  
  return (
    <div className="bg-gray-50 dark:bg-surface rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Tree Content */}
      <div className="p-2">
        <FolderTreeNode
          folder={rootFolder}
          level={0}
          onFilePreview={onFilePreview}
          onFileDownload={onFileDownload}
          folderToken={folderToken}
        />
      </div>
      
      {/* Empty State */}
      {rootFolder.folders.length === 0 && rootFolder.files.length === 0 && (
        <div className="p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Folder className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-1">Empty folder</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No files or folders to display</p>
        </div>
      )}
    </div>
  );
};

export default FolderTree;
