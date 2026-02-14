import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Globe, 
  File, 
  ArrowUp, 
  ArrowDown,
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
import { AdminFilesResponse } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { TableSkeleton } from '../ui/Skeleton';
import { Pagination } from '../common/Pagination';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatFileSize, formatDate } from '../../utils/formatting';
import { adminApi } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

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

type SortField = 'filename' | 'size' | 'upload_date' | 'user_email';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const AdminFilesTable: React.FC = () => {
  const [data, setData] = useState<AdminFilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    user_email: '',
    filename: '',
    mime_type: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'upload_date',
    direction: 'desc'
  });
  const pageSize = 10;
  const { addToast } = useToast();

  const fetchFiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const filesData = await adminApi.getFiles(currentPage, pageSize);
      setData(filesData);
    } catch (error) {
      console.error('Error fetching admin files:', error);
      addToast('error', 'Failed to load files');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, addToast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFileId) return;

    try {
      await adminApi.deleteFile(deleteFileId);
      addToast('success', 'File deleted successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      addToast('error', 'Failed to delete file');
    } finally {
      setDeleteFileId(null);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter and sort files
  const sortedFilteredFiles = useMemo(() => {
    if (!data?.files) return [];

    // Filter
    let filtered = data.files.filter(file => {
    const matchesEmail = !filters.user_email || file.user_email.toLowerCase().includes(filters.user_email.toLowerCase());
    const matchesFilename = !filters.filename || file.filename.toLowerCase().includes(filters.filename.toLowerCase());
    const matchesMimeType = !filters.mime_type || file.mime_type.toLowerCase().includes(filters.mime_type.toLowerCase());
    return matchesEmail && matchesFilename && matchesMimeType;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.field) {
        case 'filename':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'upload_date':
          comparison = new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
          break;
        case 'user_email':
          comparison = a.user_email.localeCompare(b.user_email);
          break;
        default:
          comparison = 0;
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data?.files, filters, sortConfig]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortConfig.field === field;
    return (
      <th
        className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1.5">
          {children}
          <span className={`transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`}>
            {isActive && sortConfig.direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : isActive && sortConfig.direction === 'desc' ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50" />
            )}
          </span>
        </div>
      </th>
    );
  };

  if (loading && !data) {
    return <TableSkeleton rows={10} cols={6} />;
  }

  const totalPages = data ? data.pagination.total_pages : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Filter by user email..."
          value={filters.user_email}
          onChange={(e) => handleFilterChange('user_email', e.target.value)}
        />
        <Input
          placeholder="Filter by filename..."
          value={filters.filename}
          onChange={(e) => handleFilterChange('filename', e.target.value)}
        />
        <Input
          placeholder="Filter by file type..."
          value={filters.mime_type}
          onChange={(e) => handleFilterChange('mime_type', e.target.value)}
        />
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {sortedFilteredFiles.length} of {data?.pagination.total || 0} files
        {sortConfig.field && (
          <span className="ml-2 text-xs">
            • Sorted by {sortConfig.field.replace('_', ' ')} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})
          </span>
        )}
      </div>

      {/* Files Table */}
      <div className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : sortedFilteredFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-variant dark:bg-surface-variant border-b border-gray-200 dark:border-gray-800">
                <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                  <SortHeader field="filename">Filename</SortHeader>
                  <SortHeader field="size">Size</SortHeader>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <SortHeader field="user_email">Owner</SortHeader>
                  <SortHeader field="upload_date">Upload Date</SortHeader>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedFilteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.mime_type, file.filename);
                  const iconColorClass = getIconColorClass(file.mime_type, file.filename);
                  
                  return (
                  <tr key={file.id} className="text-sm hover:bg-gray-50 dark:hover:bg-surface-variant transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColorClass}`}>
                          <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate max-w-[200px]">
                            {file.filename}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {file.is_public && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-full">
                                <Globe className="h-3 w-3" />
                                Public
                              </span>
                            )}
                            <span className="text-gray-400 dark:text-gray-500 text-xs">
                              {file.download_count} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                        {file.mime_type}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {file.user_email}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {formatDate(file.upload_date)}
                    </td>
                    <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteFileId(file.id)}
                          title="Delete file"
                        className="!p-2 hover:!bg-red-50 dark:hover:!bg-red-900/20"
                        >
                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No files found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteFileId !== null}
        onClose={() => setDeleteFileId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
