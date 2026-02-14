import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Folder, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GET_ALL_FOLDERS } from '../../graphql/queries';
import { MOVE_FOLDER, MOVE_FILE } from '../../graphql/mutations';
import { FolderItem, FileItem } from '../../types';

interface MoveModalProps {
    item: FolderItem | FileItem;
    itemType: 'folder' | 'file';
    onClose: () => void;
}

interface FolderTreeNode {
    id: string;
    name: string;
    parent_id: string | null;
    children: FolderTreeNode[];
}

interface AllFoldersData {
    allFolders: {
        id: string;
        name: string;
        parent_id: string | null;
        created_at: string;
        updated_at: string;
    }[];
}

export const MoveModal: React.FC<MoveModalProps> = ({
    item,
    itemType,
    onClose,
}) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

    const { data, loading, error } = useQuery<AllFoldersData>(GET_ALL_FOLDERS);

    const [moveFolder, { loading: movingFolder }] = useMutation(MOVE_FOLDER, {
        onCompleted: () => {
            onClose();
            window.location.reload();
        },
        onError: (error) => {
            console.error('Failed to move folder:', error);
            alert('Failed to move folder. Please try again.');
        }
    });

    const [moveFile, { loading: movingFile }] = useMutation(MOVE_FILE, {
        onCompleted: () => {
            onClose();
            window.location.reload();
        },
        onError: (error) => {
            console.error('Failed to move file:', error);
            alert('Failed to move file. Please try again.');
        }
    });

    const isMoving = movingFolder || movingFile;

    const buildFolderTree = (folders: AllFoldersData['allFolders']): FolderTreeNode[] => {
        const folderMap = new Map<string, FolderTreeNode>();
        const rootFolders: FolderTreeNode[] = [];

        folders.forEach(f => {
            if (itemType === 'folder' && f.id === item.id) return;

            folderMap.set(f.id, {
                id: f.id,
                name: f.name,
                parent_id: f.parent_id,
                children: []
            });
        });

        folders.forEach(f => {
            if (itemType === 'folder' && f.id === item.id) return;

            const node = folderMap.get(f.id);
            if (!node) return;

            if (!f.parent_id) {
                rootFolders.push(node);
            } else {
                const parent = folderMap.get(f.parent_id);
                if (parent) {
                    parent.children.push(node);
                }
            }
        });

        return rootFolders;
    };

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const handleMove = async () => {
        if (selectedParentId === null) return;

        try {
            if (itemType === 'folder') {
                await moveFolder({
                    variables: {
                        id: item.id,
                        parent_id: selectedParentId === 'root' ? null : selectedParentId
                    }
                });
            } else {
                await moveFile({
                    variables: {
                        file_id: item.id,
                        folder_id: selectedParentId === 'root' ? null : selectedParentId
                    }
                });
            }
        } catch (error) {
            console.error(`Move ${itemType} error:`, error);
        }
    };

    const renderFolderTree = (folders: FolderTreeNode[], level = 0) => {
        return folders.map(f => {
            const isSelected = selectedParentId === f.id;
            return (
                <div key={f.id} className="select-none">
                    <div
                        className={`flex items-center py-2 px-3 cursor-pointer rounded-lg mx-1 my-0.5 transition-colors ${isSelected
                                ? 'bg-blue-500 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                            }`}
                        style={{ paddingLeft: `${level * 20 + 12}px` }}
                        onClick={() => setSelectedParentId(f.id)}
                    >
                        {f.children.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFolder(f.id);
                                }}
                                className={`mr-1 p-1 rounded transition-colors ${isSelected
                                        ? 'hover:bg-blue-400'
                                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {expandedFolders.has(f.id) ? (
                                    <ChevronDown className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                ) : (
                                    <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                )}
                            </button>
                        )}
                        {f.children.length === 0 && <div className="w-6" />}
                        <Folder className={`h-4 w-4 mr-2 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                        <span className="text-sm">{f.name}</span>
                    </div>

                    {expandedFolders.has(f.id) && f.children.length > 0 && (
                        <div>
                            {renderFolderTree(f.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (loading) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Move Item" size="md">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-500 dark:text-gray-300">Loading folders...</span>
                </div>
            </Modal>
        );
    }

    if (error) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Move Item" size="md">
                <div className="text-center py-8">
                    <p className="text-red-400 mb-4">Failed to load folders</p>
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                </div>
            </Modal>
        );
    }

    const folderTree = data?.allFolders ? buildFolderTree(data.allFolders) : [];
    const itemName = 'original_filename' in item ? item.original_filename : item.name;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Move "${itemName}"`} size="md">
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Select the destination folder where you want to move "{itemName}":
                </p>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 max-h-64 overflow-y-auto">
                    <div
                        className={`flex items-center py-3 px-3 cursor-pointer rounded-lg mx-1 my-1 transition-colors ${selectedParentId === 'root'
                                ? 'bg-blue-500 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                            }`}
                        onClick={() => setSelectedParentId('root')}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFolder('root');
                            }}
                            className={`mr-1 p-1 rounded transition-colors ${selectedParentId === 'root'
                                    ? 'hover:bg-blue-400'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {expandedFolders.has('root') ? (
                                <ChevronDown className={`h-4 w-4 ${selectedParentId === 'root' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                            ) : (
                                <ChevronRight className={`h-4 w-4 ${selectedParentId === 'root' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                            )}
                        </button>
                        <Home className={`h-4 w-4 mr-2 ${selectedParentId === 'root' ? 'text-white' : 'text-green-500'}`} />
                        <span className="text-sm font-medium">Root Folder</span>
                    </div>

                    {expandedFolders.has('root') && (
                        <div className="pl-4">
                            {renderFolderTree(folderTree)}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button onClick={onClose} variant="secondary" disabled={isMoving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleMove}
                        disabled={selectedParentId === null || isMoving}
                        className="min-w-20"
                    >
                        {isMoving ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Moving...
                            </div>
                        ) : (
                            'Move Here'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};