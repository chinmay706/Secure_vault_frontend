import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-300 dark:bg-gray-700 rounded',
        className
      )}
    />
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="space-y-8">
      {/* Folders skeleton */}
      <div>
        <Skeleton className="h-6 w-20 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-surface rounded-lg border border-outline">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <div className="space-x-2">
                <Skeleton className="h-8 w-8 inline-block rounded" />
                <Skeleton className="h-8 w-8 inline-block rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Files skeleton */}
      <div>
        <Skeleton className="h-6 w-16 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-surface rounded-lg border border-outline">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="space-x-2">
                <Skeleton className="h-8 w-8 inline-block rounded" />
                <Skeleton className="h-8 w-8 inline-block rounded" />
                <Skeleton className="h-8 w-8 inline-block rounded" />
                <Skeleton className="h-8 w-8 inline-block rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const StatsSkeleton: React.FC = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-surface border border-outline p-4 rounded-lg">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
          {/* Add progress bar for the last card (usage card) */}
          {index === 3 && (
            <div className="mt-2">
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export const AdminStatsSkeleton: React.FC = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-surface border border-outline p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-surface-variant rounded-lg">
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <div className="ml-4 flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 p-4 bg-surface rounded-lg border border-outline">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};