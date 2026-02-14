import React, { useState, useEffect, useCallback } from 'react';
import { Search, File, Image, Music, Video, FileText, Tag, X } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { Modal } from '../ui/Modal';
import { FileList } from '../files/FileList';
import { SEARCH_FILES } from '../../graphql/queries';
import { FileItem } from '../../types';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: (file: FileItem) => void;
    onPreview: (file: FileItem) => void;
    onTogglePublic?: (file: FileItem) => void;
    onDelete?: (file: FileItem) => void;
    onMove?: (file: FileItem) => void;
}

interface SearchFilters {
    filename: string;
    mime_type: string;
    tags: string;
}

const FILE_TYPES = [
    { label: 'All', value: '', icon: File },
    { label: 'Images', value: 'image/', icon: Image },
    { label: 'Videos', value: 'video/', icon: Video },
    { label: 'Audio', value: 'audio/', icon: Music },
    { label: 'PDFs', value: 'application/pdf', icon: FileText },
];

export const SearchModal: React.FC<SearchModalProps> = ({
    isOpen,
    onClose,
    onDownload,
    onPreview,
    onTogglePublic,
    onDelete,
    onMove,
}) => {
    // When previewing a file, close search modal first then open preview
    const handlePreview = (file: FileItem) => {
        onClose();
        // Small delay to let the modal close animation finish
        setTimeout(() => {
            onPreview(file);
        }, 150);
    };
    const [filters, setFilters] = useState<SearchFilters>({
        filename: '',
        mime_type: '',
        tags: ''
    });
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const { data, loading, refetch } = useQuery(SEARCH_FILES, {
        variables: {
            filename: filters.filename || undefined,
            mime_type: filters.mime_type || undefined,
            tags: filters.tags || undefined,
            page: currentPage,
            page_size: 20
        },
        skip: !hasSearched || (!filters.filename && !filters.mime_type && !filters.tags),
        fetchPolicy: 'cache-and-network'
    });

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setFilters({ filename: '', mime_type: '', tags: '' });
            setHasSearched(false);
            setCurrentPage(1);
        }
    }, [isOpen]);

    const performSearch = useCallback(() => {
            if (!filters.filename && !filters.mime_type && !filters.tags) {
                return;
            }
            setHasSearched(true);
            setCurrentPage(1);
        refetch?.({
                    filename: filters.filename || undefined,
                    mime_type: filters.mime_type || undefined,
                    tags: filters.tags || undefined,
                    page: 1,
                    page_size: 20
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
        setFilters(prev => ({ ...prev, [field]: value }));
        // Auto-search when mime_type changes
        if (field === 'mime_type' && value) {
            setHasSearched(true);
        }
    };

    const clearFilter = (field: keyof SearchFilters) => {
        setFilters(prev => ({ ...prev, [field]: '' }));
    };

    const files = data?.files?.files || [];
    const totalResults = data?.files?.total || 0;
    const activeFiltersCount = [filters.mime_type, filters.tags].filter(Boolean).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" noPadding>
            <div className="flex flex-col h-[650px] relative">
                {/* Close Button - Positioned outside the header padding */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors z-20"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Search Header */}
                <div className="p-5 pr-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-surface">
                    {/* Main Search Input */}
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            className="w-full h-12 pl-12 pr-10 text-lg bg-gray-100 dark:bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400 transition-all"
                            placeholder="Search files by name..."
                            value={filters.filename}
                            onChange={(e) => handleFilterChange('filename', e.target.value)}
                            autoFocus
                        />
                        {filters.filename && (
                            <button
                                onClick={() => clearFilter('filename')}
                                className="absolute right-3 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Tags Input */}
                    <div className="relative flex items-center mt-3">
                        <Tag className="absolute left-4 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            className="w-full h-10 pl-11 pr-10 text-sm bg-gray-100 dark:bg-surface-variant border-none rounded-xl focus:ring-2 focus:ring-primary/50 text-foreground placeholder-gray-400 transition-all"
                            placeholder="Filter by tags (comma separated)..."
                            value={filters.tags}
                            onChange={(e) => handleFilterChange('tags', e.target.value)}
                        />
                        {filters.tags && (
                            <button
                                onClick={() => clearFilter('tags')}
                                className="absolute right-3 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* File Type Chips */}
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
                        {FILE_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isActive = filters.mime_type === type.value;
                            return (
                                <button
                                    key={type.label}
                                    onClick={() => handleFilterChange('mime_type', isActive ? '' : type.value)}
                                    className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700'
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

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-background custom-scrollbar">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-4"></div>
                            <p className="text-gray-500 dark:text-gray-400">Searching...</p>
                        </div>
                    )}

                    {!hasSearched && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Search className="h-10 w-10 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">Search your files</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Enter a filename, select a type, or add tags to search
                            </p>
                            <p className="text-xs text-gray-400 mt-3">
                                Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">Enter</kbd> to search
                            </p>
                        </div>
                    )}

                    {hasSearched && !loading && files.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <File className="h-10 w-10 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No files found</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Try adjusting your search terms or filters
                            </p>
                        </div>
                    )}

                    {hasSearched && !loading && files.length > 0 && (
                        <div className="p-4">
                            <FileList
                                files={files}
                                onDownload={onDownload}
                                onPreview={handlePreview}
                                onTogglePublic={onTogglePublic}
                                onDelete={onDelete}
                                onMove={onMove}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-surface flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {hasSearched && (
                            <span className="font-medium">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
                        )}
                        {activeFiltersCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> Search</span>
                        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> Close</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
