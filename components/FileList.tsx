import React, { useState, useRef } from 'react';
import type { PdfFile } from '../types';
import { PdfFileIcon } from './icons/PdfFileIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { DragHandleIcon } from './icons/DragHandleIcon';

interface FileListProps {
  files: PdfFile[];
  onRemove: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onDragReorder: (startIndex: number, endIndex: number) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileList: React.FC<FileListProps> = ({ files, onRemove, onReorder, onDragReorder }) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const dragStartIndex = useRef<number | null>(null);
  const dropTargetIndex = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string, index: number) => {
    setDraggedItemId(id);
    dragStartIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // To hide the default drag preview, some browsers require setting some data
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    dropTargetIndex.current = index;
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragStartIndex.current !== null && dropTargetIndex.current !== null && dragStartIndex.current !== dropTargetIndex.current) {
        onDragReorder(dragStartIndex.current, dropTargetIndex.current);
    }
    setDraggedItemId(null);
    dragStartIndex.current = null;
    dropTargetIndex.current = null;
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    dragStartIndex.current = null;
    dropTargetIndex.current = null;
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {files.map((pdfFile, index) => (
        <div 
            key={pdfFile.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, pdfFile.id, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`group flex items-center p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 ${draggedItemId === pdfFile.id ? 'opacity-50 shadow-xl' : 'opacity-100'}`}
        >
          <div className="cursor-move text-slate-400 dark:text-slate-500 mr-3" aria-label="Drag to reorder">
            <DragHandleIcon className="w-5 h-5" />
          </div>
          <PdfFileIcon className="w-8 h-8 mr-4 text-indigo-500 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={pdfFile.file.name}>
              {pdfFile.file.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatFileSize(pdfFile.file.size)}
            </p>
          </div>
          <div className="flex items-center ml-4 space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReorder(pdfFile.id, 'up')}
              disabled={index === 0}
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move up"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReorder(pdfFile.id, 'down')}
              disabled={index === files.length - 1}
              className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move down"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(pdfFile.id)}
              className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
              aria-label="Remove file"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
