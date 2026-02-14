import React, { useState } from 'react';
import { Folder, Trash2, MoreVertical, Move, Share2, Globe } from 'lucide-react';
import { FolderItem } from '../../types';
import { formatDate } from '../../utils/formatting';
import { MoveModal } from './MoveModal';

interface FolderListProps {
  folders: FolderItem[];
  isPublic?: boolean;
  onFolderClick: (folder: FolderItem) => void;
  onDelete?: (folder: FolderItem) => void;
  onShare?: (folder: FolderItem) => void;
  loading?: boolean;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  isPublic = false,
  onFolderClick,
  onDelete,
  onShare,
  loading = false
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [moveModalFolder, setMoveModalFolder] = useState<FolderItem | null>(null);

  // Check if folder is publicly shared
  const isShared = (folder: FolderItem) => {
    return folder.share_link?.is_active;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 bg-white dark:bg-surface rounded-xl animate-pulse border border-gray-100 dark:border-gray-800">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {folders.map((folder) => {
        const folderIsShared = isShared(folder);

        return (
          <div
            key={folder.id}
            className="flex items-center space-x-4 p-4 bg-white dark:bg-surface rounded-xl hover:bg-blue-50 dark:hover:bg-gray-800/70 transition-all duration-150 cursor-pointer border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-gray-700 hover:shadow-sm active:scale-[0.995]"
              onClick={() => onFolderClick(folder)}
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
          </div>

          <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {folder.name}
              </h3>
                {/* Shared indicator */}
                {folderIsShared && (
                  <div title="Publicly shared" className="shrink-0">
                    <Globe className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(folder.created_at)}
                {folderIsShared && (
                  <span className="ml-2 text-green-600 dark:text-green-400">• Shared</span>
                )}
              </p>
          </div>

            {/* Actions - Always visible with colored icons */}
          {!isPublic && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {/* Share button - Blue */}
                {onShare && (
                  <button
                    onClick={() => onShare(folder)}
                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}

                {/* Delete button - Red */}
                {onDelete && (
                  <button
                    onClick={() => onDelete(folder)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* More actions dropdown */}
            <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === folder.id ? null : folder.id)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
                  </button>

              {openDropdown === folder.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenDropdown(null)}
                  />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-surface-variant rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden animate-slide-down">
                    <div className="py-1">
                        <button
                            onClick={() => {
                          setMoveModalFolder(folder);
                          setOpenDropdown(null);
                        }}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors active:bg-gray-200 dark:active:bg-gray-700"
                      >
                            <Move className="h-4 w-4 mr-3 text-gray-400" />
                        Move
                      </button>
                    </div>
                  </div>
                </>
              )}
                </div>
            </div>
          )}
        </div>
        );
      })}

      {moveModalFolder && (
        <MoveModal
          item={moveModalFolder}
          itemType="folder"
          onClose={() => setMoveModalFolder(null)}
        />
      )}
    </div>
  );
};
