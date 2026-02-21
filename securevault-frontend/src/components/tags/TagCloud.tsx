import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { TagInfo } from '../../types';

interface TagCloudProps {
  tags: TagInfo[];
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  maxCount?: number;
}

export const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  selectedTag,
  onTagClick,
  maxCount
}) => {
  if (tags.length === 0) return null;

  const max = maxCount || Math.max(...tags.map(t => t.count), 1);

  // Calculate relative size (1-3 scale — tighter range for cleaner look)
  const getSize = (count: number): number => {
    const ratio = count / max;
    if (ratio > 0.66) return 3;
    if (ratio > 0.33) return 2;
    return 1;
  };

  const sizeClasses: Record<number, string> = {
    1: 'text-[11px] px-2 py-0.5',
    2: 'text-xs px-2.5 py-1',
    3: 'text-xs px-3 py-1 font-medium',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, index) => {
        const size = getSize(tag.count);
        const isSelected = selectedTag === tag.name;
        const isAi = tag.is_ai_generated;

        return (
          <motion.button
            key={tag.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTagClick(tag.name)}
            className={`
              inline-flex items-center gap-1 rounded-lg transition-all cursor-pointer leading-tight
              ${sizeClasses[size]}
              ${isSelected
                ? 'bg-primary text-white shadow-sm shadow-primary/20 ring-1 ring-primary/40'
                : isAi
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/15 border border-violet-500/15 dark:border-violet-500/20'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 border border-gray-200/60 dark:border-gray-700/40'
              }
            `}
          >
            {isAi && !isSelected && <Sparkles className="h-2.5 w-2.5 opacity-50" />}
            <span>{tag.name}</span>
            <span className={`text-[9px] tabular-nums ${isSelected ? 'text-white/60' : 'opacity-40'}`}>
              {tag.count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
