import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  File, 
  Image, 
  Music, 
  Film, 
  FileText, 
  X, 
  Sliders,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Download,
  Eye,
  Globe,
  Lock
} from 'lucide-react';
import { useQuery } from '@apollo/client';
import { SEARCH_FILES } from '../../graphql/queries';
import { FileItem } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatting';

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

interface SearchFilters {
  filename: string;
  mime_type: string;
  tags: string;
}

const FILE_TYPES = [
  { label: 'All', value: '', icon: File },
  { label: 'Images', value: 'image/', icon: Image },
  { label: 'Videos', value: 'video/', icon: Film },
  { label: 'Audio', value: 'audio/', icon: Music },
  { label: 'Text', value: 'text/', icon: FileText },
  { label: 'PDFs', value: 'application/pdf', icon: FileText },
];

// Get file icon based on mime type
const getFileIcon = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (mimeType.includes('javascript') || mimeType.includes('json') || ['js', 'ts', 'py', 'html', 'css'].includes(ext)) return FileCode;
  if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', '7z'].includes(ext)) return FileArchive;
  if (mimeType.startsWith('text/') || ['txt', 'md'].includes(ext)) return FileText;
  
  return File;
};

// Get icon color
const getIconColor = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (mimeType.startsWith('image/')) return 'text-pink-500 bg-pink-100 dark:bg-pink-900/30';
  if (mimeType.startsWith('video/')) return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
  if (mimeType.startsWith('audio/')) return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
  if (mimeType === 'application/pdf') return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-100 dark:bg-green-900/30';
  if (mimeType.includes('javascript') || mimeType.includes('json') || ['js', 'ts'].includes(ext)) return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30';
  
  return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
};

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  onClose,
  onDownload,
  onPreview,
  anchorRef
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    filename: '',
    mime_type: '',
    tags: ''
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Don't send mime_type to backend - we filter client-side for prefix matching
  // If only mime_type filter is set, we still need to fetch files
  const shouldSearch = hasSearched && (filters.filename || filters.mime_type || filters.tags);
  
  const { data, loading, refetch } = useQuery(SEARCH_FILES, {
    variables: {
      filename: filters.filename || undefined,
      tags: filters.tags || undefined,
      page: 1,
      page_size: 50 // Fetch more so client-side filtering has enough results
    },
    skip: !shouldSearch,
    fetchPolicy: 'cache-and-network'
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setFilters({ filename: '', mime_type: '', tags: '' });
      setHasSearched(false);
      setShowFilters(false);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  const performSearch = useCallback(() => {
    if (!filters.filename && !filters.mime_type && !filters.tags) {
      return;
    }
    setHasSearched(true);
    refetch?.({
      filename: filters.filename || undefined,
      tags: filters.tags || undefined,
      page: 1,
      page_size: 50
    });
  }, [filters, refetch]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        performSearch();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, performSearch, onClose]);

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // Auto-search when changing mime_type filter (if we have data or any filter set)
    if (field === 'mime_type') {
      setHasSearched(true);
      // Trigger refetch if we already have data or other filters
      if (newFilters.filename || newFilters.tags || data) {
        refetch?.({
          filename: newFilters.filename || undefined,
          tags: newFilters.tags || undefined,
          page: 1,
          page_size: 50
        });
      }
    }
  };

  // Get raw files from query
  const rawFiles: FileItem[] = data?.files?.files || [];
  
  // Client-side filter by mime_type prefix
  const files = filters.mime_type 
    ? rawFiles.filter(f => f.mime_type.startsWith(filters.mime_type))
    : rawFiles;
  
  const totalResults = files.length;

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1E1F20] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 max-h-[70vh] flex flex-col"
    >
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            className="w-full h-10 pl-10 pr-20 text-sm bg-gray-100 dark:bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400"
            placeholder="Search files..."
            value={filters.filename}
            onChange={(e) => handleFilterChange('filename', e.target.value)}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {filters.filename && (
              <button
                onClick={() => handleFilterChange('filename', '')}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors relative ${showFilters ? 'bg-primary/10 text-primary' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400'}`}
            >
              <Sliders className="h-4 w-4" />
              {(filters.mime_type || filters.tags) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Tags input */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Filter by tags</label>
              <input
                type="text"
                className="w-full h-8 px-3 text-xs bg-gray-100 dark:bg-surface-variant border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400"
                placeholder="e.g. important, work..."
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
              />
            </div>
            
            {/* File type chips */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">File type</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FILE_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isActive = filters.mime_type === type.value;
                  return (
                    <button
                      key={type.label}
                      onClick={() => handleFilterChange('mime_type', isActive ? '' : type.value)}
                      className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${isActive
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="py-12 text-center px-4">
            <Search className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Type to search your files
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">Enter</kbd> to search
            </p>
          </div>
        )}

        {hasSearched && !loading && files.length === 0 && (
          <div className="py-12 text-center px-4">
            <File className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No files found</p>
          </div>
        )}

        {hasSearched && !loading && files.length > 0 && (
          <div>
            {files.map((file: FileItem) => {
              const FileIcon = getFileIcon(file.mime_type, file.original_filename);
              const iconColor = getIconColor(file.mime_type, file.original_filename);
              const isShared = file.is_public || file.share_link?.is_active;

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 group"
                  onClick={() => {
                    onClose();
                    onPreview(file);
                  }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.original_filename}
                      </p>
                      {isShared ? (
                        <Globe className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size_bytes)} • {formatDate(file.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onPreview(file);
                      }}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasSearched && files.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-surface-variant flex justify-between items-center text-xs text-gray-500">
          <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">Esc</kbd> to close</span>
        </div>
      )}
    </div>
  );
};

