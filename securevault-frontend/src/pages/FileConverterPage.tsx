import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileOutput,
  Search,
  X,
  File,
  Image,
  Film,
  Music,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  XCircle,
  Trash2,
} from 'lucide-react';
import { FILES } from '../graphql/queries';
import { FileItem, ConversionJob } from '../types';
import { formatFileSize, formatDate } from '../utils/formatting';
import { converterApi } from '../lib/api';
import { useToast } from '../hooks/useToast';

const CONVERSION_MATRIX: Record<string, string[]> = {
  txt: ['pdf'],
  csv: ['pdf', 'xlsx'],
  md: ['txt'],
  html: ['txt'],
  pdf: ['txt'],
  docx: ['txt'],
};

const MAX_FILE_SIZE = 52_428_800; // 50 MB

type PageState = 'select' | 'configure' | 'converting' | 'done';

const getFileExt = (filename: string) =>
  filename.split('.').pop()?.toLowerCase() || '';

const isConvertible = (file: FileItem): boolean =>
  getFileExt(file.original_filename) in CONVERSION_MATRIX;

const getFileIcon = (mimeType: string, filename: string) => {
  const ext = getFileExt(filename);
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (mimeType.includes('javascript') || mimeType.includes('json') || ['js', 'ts', 'py', 'html', 'css', 'go', 'rs', 'java'].includes(ext)) return FileCode;
  if (mimeType.includes('zip') || mimeType.includes('rar') || ['zip', 'rar', '7z'].includes(ext)) return FileArchive;
  if (mimeType.startsWith('text/') || ['txt', 'md', 'doc', 'docx'].includes(ext)) return FileText;
  return File;
};

const getIconColor = (mimeType: string, filename: string) => {
  const ext = getFileExt(filename);
  if (mimeType === 'application/pdf') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-50 dark:bg-green-900/20';
  if (mimeType.includes('javascript') || mimeType.includes('json') || ['js', 'ts', 'py', 'go', 'rs', 'java'].includes(ext)) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
  if (['md', 'doc', 'docx'].includes(ext)) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
  if (['html', 'css'].includes(ext)) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
  return 'text-gray-400 bg-gray-50 dark:bg-gray-800';
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
};

const isExpired = (job: ConversionJob) => {
  const created = new Date(job.created_at);
  const now = new Date();
  return now.getTime() - created.getTime() > 24 * 60 * 60 * 1000;
};

const getExpiresLabel = (job: ConversionJob) => {
  const created = new Date(job.created_at);
  const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const remainMs = expiresAt.getTime() - now.getTime();
  if (remainMs <= 0) return 'Expired';
  const hours = Math.floor(remainMs / 3600000);
  if (hours < 1) return 'Expires <1h';
  return `Expires in ${hours}h`;
};

const statusBadge = (status: ConversionJob['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'processing':
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
  }
};

export const FileConverterPage: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>('select');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [targetFormat, setTargetFormat] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<ConversionJob | null>(null);
  const [history, setHistory] = useState<ConversionJob[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addToast } = useToast();

  const { data: filesData, loading: filesLoading } = useQuery(FILES, {
    variables: { page: 1, page_size: 500 },
    fetchPolicy: 'cache-and-network',
  });

  const allFiles: FileItem[] = filesData?.files?.files || [];

  const convertibleFiles = useMemo(() => {
    let files = allFiles.filter(isConvertible);
    if (fileSearch) {
      files = files.filter(f =>
        f.original_filename.toLowerCase().includes(fileSearch.toLowerCase())
      );
    }
    return files.sort((a, b) => a.original_filename.localeCompare(b.original_filename));
  }, [allFiles, fileSearch]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await converterApi.getHistory();
      setHistory((data.jobs || []).slice(0, 10));
    } catch {
      // silently ignore history fetch failures
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSelectFile = useCallback((file: FileItem) => {
    setSelectedFile(file);
    setTargetFormat(null);
    setError(null);
    setPageState('configure');
  }, []);

  const handleConvert = useCallback(async () => {
    if (!selectedFile || !targetFormat) return;
    setError(null);
    setPageState('converting');

    try {
      const result = await converterApi.convert(selectedFile.id, targetFormat);
      const jobId = result.id;

      stopPolling();
      let attempts = 0;
      const maxAttempts = 120;

      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const job = await converterApi.getJob(jobId);
          if (job.status === 'completed') {
            stopPolling();
            setCurrentJob(job);
            setPageState('done');
            fetchHistory();
          } else if (job.status === 'failed') {
            stopPolling();
            setError(job.error_message || 'Conversion failed. Please try again.');
            setPageState('configure');
          }
        } catch {
          if (attempts >= maxAttempts) {
            stopPolling();
            setError('Conversion timed out. Please try again.');
            setPageState('configure');
          }
        }
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversion');
      setPageState('configure');
    }
  }, [selectedFile, targetFormat, stopPolling, fetchHistory]);

  const handleDownloadResult = useCallback(async () => {
    if (!currentJob) return;
    try {
      const blob = await converterApi.downloadConverted(currentJob.id);
      const resultName = currentJob.original_filename.replace(
        /\.[^.]+$/,
        `.${currentJob.target_format}`
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', `Downloaded ${resultName}`);
    } catch {
      addToast('error', 'Failed to download converted file');
    }
  }, [currentJob, addToast]);

  const handleDownloadHistoryItem = useCallback(async (job: ConversionJob) => {
    try {
      const blob = await converterApi.downloadConverted(job.id);
      const resultName = job.original_filename.replace(
        /\.[^.]+$/,
        `.${job.target_format}`
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', `Downloaded ${resultName}`);
    } catch {
      addToast('error', 'Failed to download converted file');
    }
  }, [addToast]);

  const handleDeleteHistoryItem = useCallback(async (job: ConversionJob) => {
    try {
      await converterApi.deleteJob(job.id);
      setHistory(prev => prev.filter(j => j.id !== job.id));
      addToast('success', 'Conversion deleted');
    } catch {
      addToast('error', 'Failed to delete conversion');
    }
  }, [addToast]);

  const handleReset = useCallback(() => {
    stopPolling();
    setSelectedFile(null);
    setTargetFormat(null);
    setCurrentJob(null);
    setPageState('select');
    setError(null);
  }, [stopPolling]);

  const handleCancelConverting = useCallback(() => {
    stopPolling();
    setPageState('select');
    setError(null);
  }, [stopPolling]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
            <FileOutput className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">File Converter</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Convert documents between formats
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* State A: File Selection */}
        {pageState === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Select a File
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Supports TXT, CSV, MD, HTML, PDF, and DOCX files
                </p>
              </div>

              {/* Search */}
              <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full h-9 pl-9 pr-8 text-sm bg-gray-100 dark:bg-surface-variant border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400"
                  />
                  {fileSearch && (
                    <button onClick={() => setFileSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* File list */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[60vh] overflow-y-auto">
                {filesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : convertibleFiles.length > 0 ? (
                  convertibleFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mime_type, file.original_filename);
                    const iconColor = getIconColor(file.mime_type, file.original_filename);
                    const tooLarge = file.size_bytes > MAX_FILE_SIZE;

                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 px-6 py-3 transition-colors group ${tooLarge ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                          <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.original_filename}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size_bytes)}
                            {file.created_at && ` \u2022 ${formatDate(file.created_at)}`}
                          </p>
                        </div>
                        {tooLarge ? (
                          <span className="text-xs text-gray-400 font-medium shrink-0">(too large)</span>
                        ) : (
                          <button
                            onClick={() => handleSelectFile(file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16">
                    <File className="h-12 w-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {fileSearch ? 'No matching files' : 'No convertible files found'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload TXT, CSV, MD, HTML, PDF, or DOCX files to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* State B: Format Configuration */}
        {pageState === 'configure' && selectedFile && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800">
              {/* Selected file header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-400" />
                </button>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getIconColor(selectedFile.mime_type, selectedFile.original_filename)}`}>
                  {React.createElement(getFileIcon(selectedFile.mime_type, selectedFile.original_filename), { className: 'h-4 w-4' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{selectedFile.original_filename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size_bytes)}</p>
                </div>
              </div>

              {/* Format picker */}
              <div className="px-6 py-8">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Convert to
                </p>
                <div className="flex flex-wrap gap-3">
                  {(CONVERSION_MATRIX[getFileExt(selectedFile.original_filename)] || []).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setTargetFormat(fmt)}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all ${
                        targetFormat === fmt
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleConvert}
                    disabled={!targetFormat}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    Convert Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State C: Converting */}
        {pageState === 'converting' && selectedFile && (
          <motion.div
            key="converting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                    <FileOutput className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-[#1E1F20] rounded-full flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
                    <RotateCw className="h-4 w-4 text-emerald-500 animate-spin" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">Converting Document</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {selectedFile.original_filename} &rarr; {targetFormat?.toUpperCase()}
                </p>
                <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size_bytes)}</p>

                <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>This may take a moment...</span>
                </div>

                <button
                  onClick={handleCancelConverting}
                  className="mt-6 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* State D: Done */}
        {pageState === 'done' && currentJob && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">Conversion Complete!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {currentJob.original_filename.replace(/\.[^.]+$/, `.${currentJob.target_format}`)}
                </p>
                {currentJob.result_size_bytes > 0 && (
                  <p className="text-xs text-gray-400">{formatFileSize(currentJob.result_size_bytes)}</p>
                )}

                <p className="mt-4 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Download available for 24 hours
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={handleDownloadResult}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Convert Another
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Conversions */}
      <div className="mt-6">
        <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Conversions
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {history.length > 0 ? (
              history.map((job) => {
                const expired = job.status === 'completed' && isExpired(job);
                return (
                  <div key={job.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm text-foreground truncate">{job.original_filename}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-foreground shrink-0">
                        {job.target_format.toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadge(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 w-20 text-right">
                      {formatRelativeTime(job.created_at)}
                    </span>
                    <div className="w-24 shrink-0 flex justify-end">
                      {job.status === 'completed' && !expired ? (
                        <button
                          onClick={() => handleDownloadHistoryItem(job)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      ) : job.status === 'completed' && expired ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <XCircle className="h-3 w-3" />
                          Expired
                        </span>
                      ) : job.status === 'failed' ? (
                        <span className="text-xs text-red-400 truncate" title={job.error_message}>
                          {job.error_message ? job.error_message.slice(0, 20) : 'Failed'}
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => handleDeleteHistoryItem(job)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                      title="Delete conversion"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No conversions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
