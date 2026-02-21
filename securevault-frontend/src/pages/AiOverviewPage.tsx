import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  BrainCircuit,
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
  Sparkles,
  ArrowLeft,
  Send,
  Copy,
  Download,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { FILES } from '../graphql/queries';
import { FileItem, AiSummary } from '../types';
import { formatFileSize, formatDate } from '../utils/formatting';
import { aiApi } from '../lib/api';
import { useToast } from '../hooks/useToast';

const SUPPORTED_MIME_PREFIXES = ['text/', 'application/pdf', 'application/json', 'application/msword', 'application/vnd.openxmlformats'];
const SUPPORTED_EXTENSIONS = ['txt', 'md', 'pdf', 'doc', 'docx', 'csv', 'json', 'js', 'ts', 'py', 'go', 'java', 'html', 'css', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'log', 'sql', 'sh', 'bat', 'rs', 'cpp', 'c', 'h', 'rb', 'php'];

const isSupportedFile = (file: FileItem): boolean => {
  const ext = file.original_filename.split('.').pop()?.toLowerCase() || '';
  if (SUPPORTED_EXTENSIONS.includes(ext)) return true;
  return SUPPORTED_MIME_PREFIXES.some(p => file.mime_type.startsWith(p));
};

const getFileIcon = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
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
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (mimeType === 'application/pdf') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-50 dark:bg-green-900/20';
  if (mimeType.includes('javascript') || mimeType.includes('json') || ['js', 'ts', 'py', 'go', 'rs', 'java'].includes(ext)) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
  if (['md', 'doc', 'docx'].includes(ext)) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
  return 'text-gray-400 bg-gray-50 dark:bg-gray-800';
};

type PageState = 'select' | 'generating' | 'summary';

const QUICK_COMMANDS = [
  'Make it shorter',
  'Add more detail',
  'Focus on key findings',
  'List action items',
  'Extract technical details',
];

export const AiOverviewPage: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>('select');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [refineCommand, setRefineCommand] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const { data: filesData, loading: filesLoading } = useQuery(FILES, {
    variables: { page: 1, page_size: 500 },
    fetchPolicy: 'cache-and-network',
  });

  const allFiles: FileItem[] = filesData?.files?.files || [];

  const supportedFiles = useMemo(() => {
    let files = allFiles.filter(isSupportedFile);
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

  const pollForSummary = useCallback((fileId: string) => {
    stopPolling();
    let attempts = 0;
    const maxAttempts = 60;

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const result = await aiApi.getSummary(fileId);
        if (result.status === 'completed') {
          stopPolling();
          setSummary(result);
          setPageState('summary');
        } else if (result.status === 'failed') {
          stopPolling();
          setError(result.error_message || 'AI analysis failed. Please try again.');
          setPageState('select');
        }
      } catch {
        if (attempts >= maxAttempts) {
          stopPolling();
          setError('Analysis timed out. Please try again.');
          setPageState('select');
        }
      }
    }, 2500);
  }, [stopPolling]);

  const handleAnalyze = useCallback(async (file: FileItem) => {
    setSelectedFile(file);
    setError(null);
    setPageState('generating');
    setSummary(null);

    try {
      const result = await aiApi.generateSummary(file.id);
      if (result.status === 'completed') {
        const fullSummary = await aiApi.getSummary(file.id);
        setSummary(fullSummary);
        setPageState('summary');
      } else {
        pollForSummary(file.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
      setPageState('select');
    }
  }, [pollForSummary]);

  const handleRefine = useCallback(async (command: string) => {
    if (!selectedFile || !command.trim()) return;
    setIsRefining(true);
    setError(null);

    try {
      const result = await aiApi.refineSummary(selectedFile.id, command.trim());
      setSummary(result);
      setRefineCommand('');
      addToast('success', 'Summary refined');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refine summary';
      setError(msg);
      addToast('error', msg);
    } finally {
      setIsRefining(false);
    }
  }, [selectedFile, addToast]);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    const text = summary.summary +
      (summary.recommendations.length > 0
        ? '\n\nRecommendations:\n' + summary.recommendations.map(r => `- ${r}`).join('\n')
        : '');
    navigator.clipboard.writeText(text);
    addToast('success', 'Copied to clipboard');
  }, [summary, addToast]);

  const handleDownloadTxt = useCallback(() => {
    if (!summary || !selectedFile) return;
    const text = `AI Summary: ${selectedFile.original_filename}\n${'='.repeat(40)}\n\n${summary.summary}` +
      (summary.recommendations.length > 0
        ? `\n\nRecommendations:\n${summary.recommendations.map(r => `- ${r}`).join('\n')}`
        : '');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-${selectedFile.original_filename.replace(/\.[^.]+$/, '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'Summary downloaded');
  }, [summary, selectedFile, addToast]);

  const handleRevertToVersion = useCallback((version: { summary: string }) => {
    if (!summary) return;
    setSummary({ ...summary, summary: version.summary });
    addToast('success', 'Reverted to selected version');
  }, [summary, addToast]);

  const handleReset = useCallback(() => {
    stopPolling();
    setSelectedFile(null);
    setSummary(null);
    setPageState('select');
    setError(null);
    setRefineCommand('');
    setHistoryOpen(false);
  }, [stopPolling]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Overview</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Analyze documents with AI-powered insights
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

      {/* State A: File Selection */}
      <AnimatePresence mode="wait">
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
                  Select a Document to Analyze
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Supports PDF, text, markdown, code files, and documents
                </p>
              </div>

              {/* File search */}
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
                ) : supportedFiles.length > 0 ? (
                  supportedFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mime_type, file.original_filename);
                    const iconColor = getIconColor(file.mime_type, file.original_filename);

                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
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
                        <button
                          onClick={() => handleAnalyze(file)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Analyze
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16">
                    <File className="h-12 w-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {fileSearch ? 'No matching files' : 'No supported files found'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload PDF, text, or document files to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* State B: Generating */}
        {pageState === 'generating' && selectedFile && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                    <BrainCircuit className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-[#1E1F20] rounded-full flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-800">
                    <RotateCw className="h-4 w-4 text-indigo-500 animate-spin" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">Analyzing Document</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{selectedFile.original_filename}</p>
                <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size_bytes)}</p>

                <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>This may take a moment for larger files...</span>
                </div>

                <button
                  onClick={handleReset}
                  className="mt-6 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* State C: Summary + Refinement */}
        {pageState === 'summary' && selectedFile && summary && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* File header bar */}
            <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
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
              <button
                onClick={() => handleAnalyze(selectedFile)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Re-analyze
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Analyze Another
              </button>
            </div>

            {/* Summary + History layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Summary panel */}
              <div className="lg:col-span-3 space-y-4">
                {/* Summary card */}
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-foreground">Summary</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Copy">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={handleDownloadTxt} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Download as TXT">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-5 prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-strong:text-foreground">
                    <ReactMarkdown>{summary.summary}</ReactMarkdown>
                  </div>
                </div>

                {/* Recommendations */}
                {summary.recommendations.length > 0 && (
                  <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      <ul className="space-y-2.5">
                        {summary.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Refinement bar */}
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_COMMANDS.map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => handleRefine(cmd)}
                        disabled={isRefining}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRefine(refineCommand); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={commandInputRef}
                      type="text"
                      value={refineCommand}
                      onChange={(e) => setRefineCommand(e.target.value)}
                      placeholder="Ask AI to refine the summary..."
                      disabled={isRefining}
                      className="flex-1 h-10 px-4 text-sm bg-gray-100 dark:bg-surface-variant border-none rounded-lg focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder-gray-400 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isRefining || !refineCommand.trim()}
                      className="h-10 px-4 flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {isRefining ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{isRefining ? 'Refining...' : 'Send'}</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* History sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-gray-800 sticky top-4">
                  <button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-500 dark:text-gray-400 lg:cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>History</span>
                      <span className="text-xs font-normal text-gray-400">
                        ({(summary.history?.length || 0) + 1})
                      </span>
                    </div>
                    <ChevronRight className={`h-4 w-4 lg:hidden transition-transform ${historyOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <div className={`border-t border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 ${historyOpen ? '' : 'hidden lg:block'}`}>
                    {/* Current version */}
                    <div className="px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Current</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {summary.summary.slice(0, 80)}...
                      </p>
                    </div>

                    {/* Previous versions */}
                    {(summary.history || []).slice().reverse().map((version, i) => (
                      <button
                        key={i}
                        onClick={() => handleRevertToVersion(version)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {version.command ? `"${version.command}"` : 'Original'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                          {version.summary.slice(0, 80)}...
                        </p>
                      </button>
                    ))}

                    {(!summary.history || summary.history.length === 0) && (
                      <div className="px-4 py-4 text-center">
                        <p className="text-xs text-gray-400">No previous versions yet</p>
                        <p className="text-[11px] text-gray-400 mt-1">Refine the summary to create history</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
