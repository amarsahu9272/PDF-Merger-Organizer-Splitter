import React, { useState, useEffect, useCallback } from 'react';
import type { PdfPage } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { HashtagIcon } from './icons/HashtagIcon';

interface SplitRenameModalProps {
  isOpen: boolean;
  pages: PdfPage[];
  onCancel: () => void;
  onConfirm: (renamedFiles: Map<string, string>) => Promise<void>;
}

export const SplitRenameModal: React.FC<SplitRenameModalProps> = ({ isOpen, pages, onCancel, onConfirm }) => {
  const [fileNames, setFileNames] = useState<Map<string, string>>(new Map());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isBulkRenameVisible, setIsBulkRenameVisible] = useState<boolean>(false);
  const [bulkPrefix, setBulkPrefix] = useState<string>('');
  const [bulkSuffix, setBulkSuffix] = useState<string>('');
  const [isSequentialRenameVisible, setIsSequentialRenameVisible] = useState<boolean>(false);
  const [sequentialBaseName, setSequentialBaseName] = useState<string>('document');
  const [sequentialStartNumber, setSequentialStartNumber] = useState<number>(1);


  useEffect(() => {
    if (isOpen) {
      const initialNames = new Map<string, string>();
      pages.forEach(page => {
        const originalName = page.originalFileName.replace(/\.pdf$/i, '');
        const defaultName = `${originalName}-page-${page.originalPageIndex + 1}.pdf`;
        initialNames.set(page.id, defaultName);
      });
      setFileNames(initialNames);
      // Reset rename states on open
      setIsBulkRenameVisible(false);
      setBulkPrefix('');
      setBulkSuffix('');
      setIsSequentialRenameVisible(false);
      setSequentialBaseName('document');
      setSequentialStartNumber(1);
    }
  }, [isOpen, pages]);

  const handleNameChange = (pageId: string, newName: string) => {
    setFileNames(prev => new Map(prev).set(pageId, newName));
  };
  
  const handleApplyBulkRename = () => {
    const newFileNames = new Map<string, string>();
    pages.forEach(page => {
        const originalBaseName = page.originalFileName.replace(/\.pdf$/i, '');
        const pagePart = `-page-${page.originalPageIndex + 1}`;
        const coreName = `${originalBaseName}${pagePart}`;
        const finalName = `${bulkPrefix}${coreName}${bulkSuffix}.pdf`;
        newFileNames.set(page.id, finalName);
    });
    setFileNames(newFileNames);
  };

  const handleApplySequentialRename = () => {
    const newFileNames = new Map<string, string>();
    const baseName = sequentialBaseName.trim() || 'document';
    const startNum = isNaN(sequentialStartNumber) ? 1 : sequentialStartNumber;

    pages.forEach((page, index) => {
        const sequentialNumber = startNum + index;
        const finalName = `${baseName}-${sequentialNumber}.pdf`;
        newFileNames.set(page.id, finalName);
    });
    setFileNames(newFileNames);
  };

  const handleConfirmClick = async () => {
    setIsProcessing(true);
    await onConfirm(fileNames);
    // The parent component will close the modal, which will unmount this component,
    // so we don't strictly need to set isProcessing back to false.
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);


  if (!isOpen) {
    return null;
  }

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        aria-labelledby="rename-modal-title"
        role="dialog"
        aria-modal="true"
        onClick={onCancel}
    >
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
          <h2 id="rename-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Name Your Split Files
          </h2>
          <div className="flex items-center gap-2">
             <button
                onClick={() => {
                    setIsBulkRenameVisible(prev => !prev);
                    if (!isBulkRenameVisible) setIsSequentialRenameVisible(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
                aria-expanded={isBulkRenameVisible}
              >
                <PencilSquareIcon className="w-4 h-4" />
                Rename All
            </button>
            <button
                onClick={() => {
                    setIsSequentialRenameVisible(prev => !prev);
                    if (!isSequentialRenameVisible) setIsBulkRenameVisible(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
                aria-expanded={isSequentialRenameVisible}
              >
                <HashtagIcon className="w-4 h-4" />
                Sequence
            </button>
            <button onClick={onCancel} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        <div className="p-6 flex-grow overflow-y-auto">
            {isBulkRenameVisible && (
                 <div className="p-4 mb-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Batch Rename Options</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="bulk-prefix" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Prefix</label>
                            <input
                                id="bulk-prefix"
                                type="text"
                                placeholder="e.g., ProjectA-"
                                value={bulkPrefix}
                                onChange={e => setBulkPrefix(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100"
                            />
                        </div>
                         <div>
                            <label htmlFor="bulk-suffix" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Suffix</label>
                            <input
                                id="bulk-suffix"
                                type="text"
                                placeholder="e.g., -final"
                                value={bulkSuffix}
                                onChange={e => setBulkSuffix(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                    <div className="mt-3 text-right">
                        <button 
                            onClick={handleApplyBulkRename}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
                        >
                            Apply to All
                        </button>
                    </div>
                </div>
            )}
             {isSequentialRenameVisible && (
                <div className="p-4 mb-6 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Sequential Rename Options</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="seq-base-name" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Base Name</label>
                            <input
                                id="seq-base-name"
                                type="text"
                                placeholder="e.g., Report"
                                value={sequentialBaseName}
                                onChange={e => setSequentialBaseName(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100"
                            />
                        </div>
                        <div>
                            <label htmlFor="seq-start-number" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Start Number</label>
                            <input
                                id="seq-start-number"
                                type="number"
                                min="0"
                                step="1"
                                value={sequentialStartNumber}
                                onChange={e => setSequentialStartNumber(parseInt(e.target.value, 10) || 1)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                    <div className="mt-3 text-right">
                        <button
                            onClick={handleApplySequentialRename}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
                        >
                            Apply Sequence
                        </button>
                    </div>
                </div>
            )}


            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Review and edit the filenames for each PDF that will be created. All files will be downloaded in a single ZIP archive.
            </p>
            <div className="space-y-4">
                {pages.map(page => (
                    <div key={page.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <img 
                            src={page.thumbnailUrl} 
                            alt={`Thumbnail of page ${page.originalPageIndex + 1}`}
                            className="w-16 h-auto object-contain rounded-md border border-slate-200 dark:border-slate-700 flex-shrink-0"
                        />
                        <div className="flex-grow">
                            <label htmlFor={`filename-${page.id}`} className="sr-only">Filename for {page.originalFileName} page {page.originalPageIndex + 1}</label>
                             <input
                                id={`filename-${page.id}`}
                                type="text"
                                value={fileNames.get(page.id) || ''}
                                onChange={e => handleNameChange(page.id, e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
            >
                Cancel
            </button>
            <button
                onClick={handleConfirmClick}
                disabled={isProcessing}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition"
            >
                {isProcessing && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {isProcessing ? 'Processing...' : `Confirm & Download ${pages.length} Files`}
            </button>
        </footer>
      </div>
    </div>
  );
};