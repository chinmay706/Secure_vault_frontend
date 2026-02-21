import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Search,
  Sparkles,
  X,
  File,
  Image,
  Film,
  Music,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Download,
  Eye,
  ChevronDown,
  SlidersHorizontal,
  RotateCw,
  Zap,
  Upload
} from 'lucide-react';
import { GET_ALL_TAGS, FILES } from '../graphql/queries';
import { TagInfo, FileItem } from '../types';
import { TagStats } from '../components/tags/TagStats';
import { PreviewModal } from '../components/files/PreviewModal';
import { formatFileSize, formatDate } from '../utils/formatting';
import { filesApi } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';

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

const getIconColor = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/')) return 'text-pink-500 bg-pink-50 dark:bg-pink-900/20';
  if (mimeType.startsWith('video/')) return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
  if (mimeType.startsWith('audio/')) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
  if (mimeType === 'application/pdf') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-50 dark:bg-green-900/20';
  if (mimeType.includes('javascript') || mimeType.includes('json') || ['js', 'ts'].includes(ext)) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
  return 'text-gray-400 bg-gray-50 dark:bg-gray-800';
};

type FilterMode = 'all' | 'ai' | 'manual';

export const TagExplorerPage: React.FC = () => {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [bulkAiRunning, setBulkAiRunning] = useState(false);
  const [bulkAiProgress, setBulkAiProgress] = useState({ done: 0, total: 0 });

  const { addToast } = useToast();
  const { token } = useAuth();

  // Fetch all tags
  const { data: tagsData, loading: tagsLoading, refetch: refetchTags } = useQuery(GET_ALL_TAGS, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  // Always fetch all files (for client-side tag extraction fallback)
  const { data: allFilesData, loading: allFilesLoading, refetch: refetchFiles } = useQuery(FILES, {
    variables: { page: 1, page_size: 500 },
    fetchPolicy: 'cache-and-network',
  });

  const allFiles: FileItem[] = allFilesData?.files?.files || [];

  // Smart tag extraction: use backend allTags if available, else extract from files client-side
  const allTags: TagInfo[] = useMemo(() => {
    const backendTags: TagInfo[] = tagsData?.allTags || [];
    if (backendTags.length > 0) return backendTags;

    // Fallback: extract tags from all files
    const tagMap = new Map<string, number>();
    allFiles.forEach(file => {
      (file.tags || []).forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries()).map(([name, count]) => ({
      name,
      count,
      is_ai_generated: false,
    }));
  }, [tagsData, allFiles]);

  const aiTagNames = useMemo(() => {
    const set = new Set<string>();
    allTags.forEach(t => { if (t.is_ai_generated) set.add(t.name); });
    return set;
  }, [allTags]);

  // Untagged files (for bulk AI tagging)
  const untaggedFiles = useMemo(() => {
    return allFiles.filter(f => !f.tags || f.tags.length === 0);
  }, [allFiles]);

  // Filter tags based on search and mode
  const filteredTags = useMemo(() => {
    let result = allTags;
    if (tagSearch) {
      result = result.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
    }
    if (filterMode === 'ai') {
      result = result.filter(t => t.is_ai_generated);
    } else if (filterMode === 'manual') {
      result = result.filter(t => !t.is_ai_generated);
    }
    // Spread before sort — Apollo returns frozen arrays that can't be mutated in-place
    return [...result].sort((a, b) => b.count - a.count);
  }, [allTags, tagSearch, filterMode]);

  const filteredTagNames = useMemo(() => {
    return new Set(filteredTags.map(t => t.name));
  }, [filteredTags]);

  const taggedFiles = useMemo(() => {
    const hasFilter = tagSearch || filterMode !== 'all';
    const result = allFiles.filter(f => {
      const tags = f.tags || [];
      if (tags.length === 0) return false;
      if (!hasFilter) return true;
      return tags.some(t => filteredTagNames.has(t));
    });
    return [...result].sort((a, b) => {
      const aMatch = (a.tags || []).filter(t => filteredTagNames.has(t)).length;
      const bMatch = (b.tags || []).filter(t => filteredTagNames.has(t)).length;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return a.original_filename.localeCompare(b.original_filename);
    });
  }, [allFiles, filteredTagNames, tagSearch, filterMode]);

  const topTags = useMemo(() => {
    return [...allTags].sort((a, b) => b.count - a.count).slice(0, 15);
  }, [allTags]);

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

  const handleTagClick = (tagName: string) => {
    setTagSearch(prev => prev === tagName ? '' : tagName);
  };

  const handleFileClick = (fileId: string) => {
    setExpandedFile(prev => prev === fileId ? null : fileId);
  };

  // Bulk AI tagging for untagged files
  const handleBulkAiTag = useCallback(async () => {
    if (!token || untaggedFiles.length === 0) return;
    setBulkAiRunning(true);
    const total = untaggedFiles.length;
    setBulkAiProgress({ done: 0, total });

    const restBaseUrl = import.meta.env.VITE_REST_BASE_URL || 'http://localhost:8080/api/v1';

    try {
      // Try the bulk endpoint first
      const bulkRes = await fetch(`${restBaseUrl}/files/bulk-ai-tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_ids: untaggedFiles.map(f => f.id) })
      });

      if (bulkRes.ok || bulkRes.status === 202) {
        // Bulk endpoint accepted — poll until files are done
        let doneCount = 0;
        for (let round = 0; round < 30 && doneCount < total; round++) {
          await new Promise(r => setTimeout(r, 3000));
          doneCount = 0;
          for (const file of untaggedFiles) {
            try {
              const res = await fetch(`${restBaseUrl}/files/${file.id}/ai-tags`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                const data = await res.json();
                if (data.status === 'completed' || data.status === 'failed') doneCount++;
              } else if (res.status === 202) {
                // Still processing
              } else {
                doneCount++; // Count errors as done
              }
            } catch { doneCount++; }
          }
          setBulkAiProgress({ done: doneCount, total });
        }
      } else {
        // Bulk endpoint not available — fall back to sequential
        for (let i = 0; i < untaggedFiles.length; i++) {
          const file = untaggedFiles[i];
          try {
            await fetch(`${restBaseUrl}/files/${file.id}/ai-tags`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            // Wait for completion
            for (let attempt = 0; attempt < 12; attempt++) {
              await new Promise(r => setTimeout(r, 2500));
              const res = await fetch(`${restBaseUrl}/files/${file.id}/ai-tags`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const isOk = res.ok || res.status === 202;
              if (isOk) {
                try {
                  const data = await res.json();
                  if (data.status === 'completed' || data.status === 'failed') break;
                } catch { break; }
              }
            }
          } catch { /* continue */ }
          setBulkAiProgress({ done: i + 1, total });
        }
      }
    } catch (err) {
      console.warn('[TagExplorer] Bulk AI tagging error:', err);
    }

    setBulkAiRunning(false);
    addToast('success', `AI tagging complete for ${total} files`);

    // Refetch data
    try { refetchTags(); } catch { /* ignore */ }
    try { refetchFiles(); } catch { /* ignore */ }
  }, [token, untaggedFiles, addToast, refetchTags, refetchFiles]);

  const isLoading = tagsLoading || allFilesLoading;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
            <Tag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tag Explorer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {allTags.length} tags across {allFiles.length} files
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <TagStats tags={allTags} />

      {/* Main Content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Tag Cloud + Filters */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full h-9 pl-9 pr-8 text-sm bg-gray-100 dark:bg-surface-variant border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400"
                />
                {tagSearch && (
                  <button onClick={() => setTagSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-surface-variant rounded-lg p-0.5">
                {(['all', 'ai', 'manual'] as FilterMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      filterMode === mode
                        ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {mode === 'ai' && <Sparkles className="h-3 w-3" />}
                    {mode === 'manual' && <Tag className="h-3 w-3" />}
                    {mode === 'all' && <SlidersHorizontal className="h-3 w-3" />}
                    {mode === 'all' ? 'All' : mode === 'ai' ? 'AI Tags' : 'Manual'}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Tagged Files */}
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tagged Files
                <span className="text-xs font-normal ml-2 lowercase text-gray-400">
                  ({taggedFiles.length})
                </span>
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : taggedFiles.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {taggedFiles.map((file, index) => {
                  const isExpanded = expandedFile === file.id;
                  const FileIcon = getFileIcon(file.mime_type, file.original_filename);
                  const iconColor = getIconColor(file.mime_type, file.original_filename);
                  const fileTags = file.tags || [];
                  const previewTags = fileTags.slice(0, 3);
                  const overflowCount = fileTags.length - 3;

                  return (
                    <div key={file.id}>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                        onClick={() => handleFileClick(file.id)}
                      >
                        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />

                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                          <FileIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.original_filename}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(file.size_bytes)}
                              {file.created_at && ` \u2022 ${formatDate(file.created_at)}`}
                            </span>
                            <span className="text-[11px] text-gray-400 tabular-nums">
                              {fileTags.length} tag{fileTags.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 min-w-0 overflow-hidden shrink-0">
                          {previewTags.map(tagName => (
                            <span
                              key={tagName}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md max-w-[140px] ${
                                aiTagNames.has(tagName)
                                  ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {aiTagNames.has(tagName) && <Sparkles className="h-2.5 w-2.5 shrink-0" />}
                              <span className="truncate">{tagName}</span>
                            </span>
                          ))}
                          {overflowCount > 0 && (
                            <span className="text-[11px] text-gray-400 shrink-0">+{overflowCount} more</span>
                          )}
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 px-6 pl-12 py-4">
                              <div className="flex flex-wrap gap-2 mb-4">
                                {fileTags.map(tagName => (
                                  <button
                                    key={tagName}
                                    onClick={() => handleTagClick(tagName)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                      aiTagNames.has(tagName)
                                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                                    }`}
                                  >
                                    {aiTagNames.has(tagName) && <Sparkles className="h-3 w-3" />}
                                    {tagName}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Preview
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <File className="h-12 w-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tagSearch ? 'No files match your tag filter' : 'No tagged files yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Upload files with tags or use AI tagging to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Top Tags */}
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sticky top-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Top Tags</h3>
            <div className="space-y-1">
              {topTags.map((tag, index) => {
                const maxBarCount = topTags[0]?.count || 1;
                const barPercent = (tag.count / maxBarCount) * 100;
                return (
                  <button
                    key={tag.name}
                    onClick={() => handleTagClick(tag.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all group relative overflow-hidden ${
                      tagSearch === tag.name
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 transition-all ${
                        tagSearch === tag.name ? 'bg-primary/10 dark:bg-primary/20' : 'bg-gray-50 dark:bg-gray-800/30'
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-gray-400 w-4 text-right shrink-0">{index + 1}</span>
                        <span className={`text-sm truncate ${tagSearch === tag.name ? 'text-primary font-medium' : 'text-foreground'}`}>{tag.name}</span>
                        {tag.is_ai_generated && <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{tag.count}</span>
                    </div>
                  </button>
                );
              })}

              {topTags.length === 0 && !isLoading && (
                <p className="text-xs text-gray-400 text-center py-4">No tags yet</p>
              )}

              {isLoading && (
                <div className="space-y-2 py-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Tagging Action Card */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold text-violet-900 dark:text-violet-300">AI Tagging</span>
            </div>

            {untaggedFiles.length > 0 ? (
              <>
                <p className="text-xs text-violet-700/70 dark:text-violet-400/60 leading-relaxed mb-3">
                  {untaggedFiles.length} file{untaggedFiles.length !== 1 ? 's' : ''} without tags.
                  Use AI to automatically analyze and tag them.
                </p>
                <button
                  onClick={handleBulkAiTag}
                  disabled={bulkAiRunning}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  {bulkAiRunning ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      Tagging {bulkAiProgress.done}/{bulkAiProgress.total}...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      Tag All Untagged Files
                    </>
                  )}
                </button>
              </>
            ) : allFiles.length > 0 ? (
              <p className="text-xs text-violet-700/70 dark:text-violet-400/60 leading-relaxed">
                All your files are tagged! Upload new files to automatically generate AI tags.
              </p>
            ) : (
              <>
                <p className="text-xs text-violet-700/70 dark:text-violet-400/60 leading-relaxed mb-3">
                  Upload files to get started. AI will analyze and tag them automatically.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-violet-500">
                  <Upload className="h-3 w-3" />
                  <span>Tags appear after upload</span>
                </div>
              </>
            )}

            <div className="mt-3 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full">
                <Sparkles className="h-2.5 w-2.5" />
                AI tag
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                manual tag
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};
