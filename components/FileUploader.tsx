
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploaderProps {
  onFilesSelected: (files: FileList) => void;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value to allow selecting the same file again
      e.target.value = ''; 
    }
  };

  if (compact) {
    return (
        <label className="cursor-pointer w-full text-center px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition">
             <span>Add More Files</span>
             <input
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
            />
        </label>
    );
  }

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full ${compact ? 'py-8' : 'py-16'} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800'}`}
    >
        <UploadIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
        <p className="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-indigo-500">Click to upload</span> or drag and drop
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select one or more PDF files</p>
        <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
        />
    </label>
  );
};
