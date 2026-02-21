import React from 'react';
import { Tag, Sparkles, FileQuestion, TrendingUp } from 'lucide-react';
import { TagInfo } from '../../types';

interface TagStatsProps {
  tags: TagInfo[];
  totalFiles?: number;
}

export const TagStats: React.FC<TagStatsProps> = ({ tags, totalFiles }) => {
  const totalTags = tags.length;
  const aiTags = tags.filter(t => t.is_ai_generated).length;
  const mostUsed = tags.length > 0 ? tags.reduce((a, b) => a.count > b.count ? a : b) : null;
  const totalTagged = tags.reduce((sum, t) => sum + t.count, 0);

  const stats = [
    {
      label: 'Total Tags',
      value: totalTags,
      icon: Tag,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Most Used',
      value: mostUsed ? mostUsed.name : '-',
      sublabel: mostUsed ? `${mostUsed.count} files` : undefined,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'AI Generated',
      value: aiTags,
      sublabel: totalTags > 0 ? `${Math.round((aiTags / totalTags) * 100)}%` : '0%',
      icon: Sparkles,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: 'Tagged Files',
      value: totalTagged,
      sublabel: totalFiles ? `of ${totalFiles} total` : undefined,
      icon: FileQuestion,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#1E1F20] rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground truncate">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            {stat.sublabel && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.sublabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
