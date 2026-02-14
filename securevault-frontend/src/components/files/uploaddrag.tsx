import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface UploadButtonProps {
  folderId?: string | null;
  onUpload: (files: FileList, folderId?: string | null) => void;
}

export function UploadButton({ folderId, onUpload }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleFileSelect = (files: FileList) => {
    // Simulate upload progress
    Array.from(files).forEach((file) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[file.name] || 0;
          if (currentProgress >= 100) {
            clearInterval(interval);
            // Remove from progress after completion
            setTimeout(() => {
              setUploadProgress(p => {
                const { [file.name]: removed, ...rest } = p;
                return rest;
              });
            }, 1000);
            return prev;
          }
          return { ...prev, [file.name]: currentProgress + 10 };
        });
      }, 200);
    });
    
    onUpload(files, folderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const progressEntries = Object.entries(uploadProgress);

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-900/20'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </button>
            <p className="mt-2 text-sm text-gray-400">or drag and drop files here</p>
          </div>
        </div>
      </div>

      {progressEntries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">Uploading...</h4>
          {progressEntries.map(([fileName, progress]) => (
            <div key={fileName} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300 truncate">{fileName}</span>
                <span className="text-xs text-gray-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}