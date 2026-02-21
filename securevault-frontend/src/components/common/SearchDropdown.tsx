import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Lock,
  Clock,
  Sparkles,
  Tag,
  ArrowRight,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { SEARCH_FILES, GET_POPULAR_TAGS } from '../../graphql/queries';
import { FileItem, TagInfo } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatting';
import { useSearchHistory } from '../../hooks/useSearchHistory';

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
  onNavigateToTags?: () => void;
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
  anchorRef,
  onNavigateToTags
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    filename: '',
    mime_type: '',
    tags: ''
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // Fetch popular tags
  const { data: popularTagsData } = useQuery(GET_POPULAR_TAGS, {
    variables: { limit: 8 },
    skip: !isOpen,
    fetchPolicy: 'cache-first'
  });

  const popularTags: TagInfo[] = popularTagsData?.popularTags || [];

  // Build the combined tags string for the query
  const combinedTags = useMemo(() => {
    const parts: string[] = [];
    if (activeTagFilters.length > 0) parts.push(...activeTagFilters);
    if (filters.tags) parts.push(...filters.tags.split(',').map(t => t.trim()).filter(Boolean));
    return parts.join(',');
  }, [activeTagFilters, filters.tags]);

  const shouldSearch = hasSearched && (filters.filename || filters.mime_type || combinedTags);

  const { data, loading, refetch } = useQuery(SEARCH_FILES, {
    variables: {
      filename: filters.filename || undefined,
      tags: combinedTags || undefined,
      page: 1,
      page_size: 50
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
      setActiveTagFilters([]);
      setSelectedIndex(-1);
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

  // Debounced auto-search
  const triggerSearch = useCallback(() => {
    setHasSearched(true);
    refetch?.({
      filename: filters.filename || undefined,
      tags: combinedTags || undefined,
      page: 1,
      page_size: 50
    });
  }, [filters.filename, combinedTags, refetch]);

  const debouncedSearch = useCallback((value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (value.length >= 2 || combinedTags) {
      debounceTimer.current = setTimeout(() => {
        setHasSearched(true);
        refetch?.({
          filename: value || undefined,
          tags: combinedTags || undefined,
          page: 1,
          page_size: 50
        });
      }, 300);
    }
  }, [combinedTags, refetch]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filters.filename) {
          addToHistory(filters.filename, activeTagFilters.length > 0 ? activeTagFilters : undefined);
        }
        triggerSearch();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, files.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, triggerSearch, onClose, filters.filename, activeTagFilters, addToHistory]);

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);

    if (field === 'filename') {
      debouncedSearch(value);
    }

    if (field === 'mime_type') {
      setHasSearched(true);
      if (newFilters.filename || newFilters.tags || data || combinedTags) {
        refetch?.({
          filename: newFilters.filename || undefined,
          tags: combinedTags || undefined,
          page: 1,
          page_size: 50
        });
      }
    }
  };

  const handleTagChipClick = (tagName: string) => {
    setActiveTagFilters(prev => {
      const isActive = prev.includes(tagName);
      const updated = isActive ? prev.filter(t => t !== tagName) : [...prev, tagName];
      // Trigger search with updated tags
      setTimeout(() => {
        setHasSearched(true);
        const newCombined = updated.join(',');
        refetch?.({
          filename: filters.filename || undefined,
          tags: newCombined || undefined,
          page: 1,
          page_size: 50
        });
      }, 0);
      return updated;
    });
  };

  const handleHistoryClick = (query: string) => {
    setFilters(prev => ({ ...prev, filename: query }));
    setHasSearched(true);
    refetch?.({
      filename: query || undefined,
      tags: combinedTags || undefined,
      page: 1,
      page_size: 50
    });
  };

  // Get raw files from query
  const rawFiles: FileItem[] = data?.files?.files || [];

  // Client-side filter by mime_type prefix
  const files = filters.mime_type
    ? rawFiles.filter(f => f.mime_type.startsWith(filters.mime_type))
    : rawFiles;

  const totalResults = files.length;

  // Determine what view to show
  const showInitialState = !hasSearched && !loading && !filters.filename && activeTagFilters.length === 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1E1F20] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 max-h-[75vh] flex flex-col"
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              className="w-full h-10 pl-10 pr-20 text-sm bg-gray-100 dark:bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400"
              placeholder="Search files, tags, or content..."
              value={filters.filename}
              onChange={(e) => handleFilterChange('filename', e.target.value)}
            />
            <div className="absolute right-2 flex items-center gap-1">
              {filters.filename && (
                <button
                  onClick={() => {
                    handleFilterChange('filename', '');
                    setHasSearched(false);
                  }}
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
                {(filters.mime_type || filters.tags || activeTagFilters.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Active Tag Filters */}
          {activeTagFilters.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="flex flex-wrap gap-1.5 mt-2"
            >
              {activeTagFilters.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 rounded-full"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {tag}
                  <button
                    onClick={() => handleTagChipClick(tag)}
                    className="hover:bg-violet-100 dark:hover:bg-violet-800/30 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  setActiveTagFilters([]);
                  setHasSearched(false);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
              >
                Clear all
              </button>
            </motion.div>
          )}

          {/* Filter chips */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
            </div>
          )}

          {/* Initial State: Show suggestions, history, popular tags */}
          {showInitialState && !loading && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Popular Tags Section */}
              {popularTags.length > 0 && (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Popular Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {popularTags.map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() => handleTagChipClick(tag.name)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full transition-all hover:scale-105 ${
                          activeTagFilters.includes(tag.name)
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 ring-1 ring-violet-300 dark:ring-violet-700'
                            : tag.is_ai_generated
                              ? 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-600 dark:from-violet-900/20 dark:to-purple-900/20 dark:text-violet-400 hover:from-violet-100 hover:to-purple-100'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        }`}
                      >
                        {tag.is_ai_generated && <Sparkles className="h-2.5 w-2.5" />}
                        <Tag className="h-2.5 w-2.5" />
                        {tag.name}
                        <span className="text-[10px] opacity-60">{tag.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches Section */}
              {history.length > 0 && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent</span>
                    </div>
                    <button
                      onClick={clearHistory}
                      className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {history.slice(0, 5).map((item) => (
                      <div
                        key={item.query}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group"
                        onClick={() => handleHistoryClick(item.query)}
                      >
                        <Clock className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate">{item.query}</span>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.tags.slice(0, 2).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-500 rounded-full">{t}</span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(item.query);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-opacity"
                        >
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state when no history and no popular tags */}
              {history.length === 0 && popularTags.length === 0 && (
                <div className="py-12 text-center px-4">
                  <Search className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Search files by name, type, or tags
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Results appear as you type, or press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">Enter</kbd>
                  </p>
                </div>
              )}

              {/* Browse All Tags link */}
              {onNavigateToTags && (
                <div className="px-4 py-2.5">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToTags();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <Tag className="h-4 w-4" />
                    <span>Browse All Tags</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {hasSearched && !loading && files.length === 0 && (
            <div className="py-12 text-center px-4">
              <File className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No files found</p>
              {activeTagFilters.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTagFilters([]);
                    setHasSearched(false);
                  }}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Clear tag filters
                </button>
              )}
            </div>
          )}

          {/* File Results */}
          {hasSearched && !loading && files.length > 0 && (
            <div>
              {/* Results header */}
              <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
                <File className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Files
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              </div>

              {files.map((file: FileItem, index: number) => {
                const FileIcon = getFileIcon(file.mime_type, file.original_filename);
                const iconColor = getIconColor(file.mime_type, file.original_filename);
                const isShared = file.is_public || file.share_link?.is_active;
                const fileTags = file.tags || [];

                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 group ${
                      selectedIndex === index ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                    onClick={() => {
                      if (filters.filename) {
                        addToHistory(filters.filename, activeTagFilters.length > 0 ? activeTagFilters : undefined);
                      }
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size_bytes)} {file.created_at ? `\u2022 ${formatDate(file.created_at)}` : ''}
                        </p>
                        {/* Inline file tags */}
                        {fileTags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {fileTags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {fileTags.length > 2 && (
                              <span className="text-[10px] text-gray-400">+{fileTags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
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
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-surface-variant flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {hasSearched && files.length > 0 && (
              <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
            )}
            {activeTagFilters.length > 0 && (
              <span className="text-violet-500">{activeTagFilters.length} tag filter{activeTagFilters.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[10px]">Enter</kbd>
            <span>search</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[10px] ml-2">Esc</kbd>
            <span>close</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
