import React, { useState, useEffect, useCallback } from 'react';
import type { PdfFile, PdfPage, PageIdentifier } from '../types';
import { PageThumbnail } from './PageThumbnail';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ScissorsIcon } from './icons/ScissorsIcon';
import { createPdfFromPages } from '../services/pdfService';
import type { PageToMerge } from '../services/pdfService';
import { SplitRenameModal } from './SplitRenameModal';


declare global {
  interface Window {
    pdfjsLib: any;
    JSZip: any;
  }
}

interface PageOrganizerProps {
    files: PdfFile[];
    onCancel: () => void;
    onMerge: (pages: PageIdentifier[]) => void;
}

export const PageOrganizer: React.FC<PageOrganizerProps> = ({ files, onCancel, onMerge }) => {
    const [pages, setPages] = useState<PdfPage[]>([]);
    const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSplitting, setIsSplitting] = useState<boolean>(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
    const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

    useEffect(() => {
        const generateThumbnails = async () => {
            setIsLoading(true);
            const allPages: PdfPage[] = [];
            const { pdfjsLib } = window;
            if (!pdfjsLib) {
                console.error("pdf.js is not loaded.");
                setIsLoading(false);
                return;
            }

            for (const pdfFile of files) {
                try {
                    const arrayBuffer = await pdfFile.file.arrayBuffer();
                    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                    for (let i = 1; i <= pdfDoc.numPages; i++) {
                        const page = await pdfDoc.getPage(i);
                        const viewport = page.getViewport({ scale: 0.4 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) continue;
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        
                        allPages.push({
                            id: `${pdfFile.id}-page-${i-1}`,
                            originalFileId: pdfFile.id,
                            originalFileName: pdfFile.file.name,
                            originalPageIndex: i - 1,
                            thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8),
                        });
                    }
                } catch (error) {
                    console.error(`Failed to process ${pdfFile.file.name}:`, error);
                }
            }
            setPages(allPages);
            setIsLoading(false);
        };

        generateThumbnails();
    }, [files]);

    const handlePageClick = useCallback((pageId: string, shiftKey: boolean) => {
        const clickedIndex = pages.findIndex(p => p.id === pageId);
        if (clickedIndex === -1) return;

        if (shiftKey && lastClickedIndex !== null) {
            // Range selection: select all pages between the last clicked and current clicked.
            const start = Math.min(lastClickedIndex, clickedIndex);
            const end = Math.max(lastClickedIndex, clickedIndex);
            const pageIdsToSelect = pages.slice(start, end + 1).map(p => p.id);
            
            setSelectedPages(prev => {
                const newSet = new Set(prev);
                pageIdsToSelect.forEach(id => newSet.add(id));
                return newSet;
            });
            // We don't update the lastClickedIndex on a shift-click, allowing the user
            // to expand the selection range from the original anchor point.
        } else {
            // Single selection toggle
            setSelectedPages(prev => {
                const newSet = new Set(prev);
                if (newSet.has(pageId)) {
                    newSet.delete(pageId);
                } else {
                    newSet.add(pageId);
                }
                return newSet;
            });
            setLastClickedIndex(clickedIndex);
        }
    }, [pages, lastClickedIndex]);

    const handleSelectAll = useCallback(() => {
        if (pages.length > 0 && selectedPages.size === pages.length) {
            setSelectedPages(new Set());
        } else {
            setSelectedPages(new Set(pages.map(p => p.id)));
        }
    }, [pages, selectedPages.size]);

    const handleDeleteSelected = () => {
        setPages(prev => prev.filter(p => !selectedPages.has(p.id)));
        setSelectedPages(new Set());
        setLastClickedIndex(null); // Reset anchor on delete
    };

    const handleMergeClick = () => {
        const pagesToMerge = pages.map(p => ({
            fileId: p.originalFileId,
            pageIndex: p.originalPageIndex
        }));
        onMerge(pagesToMerge);
    };

    const handleSplitClick = () => {
        if (selectedPages.size > 0) {
            setIsRenameModalOpen(true);
        }
    };

    const handleConfirmSplitRename = async (renamedFiles: Map<string, string>) => {
        setIsRenameModalOpen(false);
        if (selectedPages.size === 0 || !window.JSZip) {
            console.error("No pages selected or JSZip is not loaded.");
            return;
        }

        setIsSplitting(true);
        const selectedPageObjects = pages.filter(p => selectedPages.has(p.id));
        const fileMap: Map<string, File> = new Map(files.map(f => [f.id, f.file]));
        const zip = new window.JSZip();

        for (const page of selectedPageObjects) {
            const file = fileMap.get(page.originalFileId);
            if (!file) continue;

            const pageToMerge: PageToMerge = {
                file: file,
                pageIndex: page.originalPageIndex,
            };

            try {
                const pdfBytes = await createPdfFromPages([pageToMerge]);
                const customFileName = renamedFiles.get(page.id);
                if (pdfBytes && customFileName) {
                    const finalFileName = customFileName.toLowerCase().endsWith('.pdf') ? customFileName : `${customFileName}.pdf`;
                    zip.file(finalFileName, pdfBytes);
                }
            } catch (error) {
                console.error(`Failed to split page ${page.originalPageIndex + 1} from ${page.originalFileName}`, error);
            }
        }
        
        if (Object.keys(zip.files).length > 0) {
            try {
                 const zipBlob = await zip.generateAsync({ type: 'blob' });
                 const url = URL.createObjectURL(zipBlob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `split-pdfs-${Date.now()}.zip`;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
                 URL.revokeObjectURL(url);
            } catch(e) {
                console.error("Failed to generate zip file", e);
            }
        }

        setIsSplitting(false);
    };

    // Drag and Drop Handlers
    const handleDragStart = (id: string) => {
        setDraggedPageId(id);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow drop
    };
    
    const handleDrop = (targetId: string) => {
        if (!draggedPageId || draggedPageId === targetId) return;

        setPages(prevPages => {
            const draggedIndex = prevPages.findIndex(p => p.id === draggedPageId);
            const targetIndex = prevPages.findIndex(p => p.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1) return prevPages;
            
            const newPages = [...prevPages];
            const [draggedItem] = newPages.splice(draggedIndex, 1);
            newPages.splice(targetIndex, 0, draggedItem);
            return newPages;
        });
    };

    const handleDragEnd = () => {
        setDraggedPageId(null);
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <svg className="animate-spin mx-auto h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Generating page previews...</p>
            </div>
        )
    }

    const allSelected = pages.length > 0 && selectedPages.size === pages.length;

    return (
        <>
            <SplitRenameModal 
                isOpen={isRenameModalOpen}
                pages={pages.filter(p => selectedPages.has(p.id))}
                onCancel={() => setIsRenameModalOpen(false)}
                onConfirm={handleConfirmSplitRename}
            />
            <div className="flex flex-col h-full">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm z-10">
                    <button onClick={onCancel} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition">
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Files
                    </button>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={handleSelectAll}
                            disabled={pages.length === 0}
                            className="px-3 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 transition"
                        >
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        <button 
                            onClick={handleDeleteSelected}
                            disabled={selectedPages.size === 0}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-red-600 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400 dark:bg-red-900/50 dark:hover:bg-red-900 transition"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Delete ({selectedPages.size})
                        </button>
                        <button
                            onClick={handleSplitClick}
                            disabled={selectedPages.size === 0 || isSplitting}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed dark:text-indigo-300 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 transition"
                        >
                            {isSplitting ? (
                                <svg className="animate-spin h-4 w-4 text-indigo-700 dark:text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <ScissorsIcon className="w-4 h-4" />
                            )}
                            {isSplitting ? 'Splitting...' : `Split (${selectedPages.size})`}
                        </button>
                        <button
                            onClick={handleMergeClick}
                            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
                        >
                            Create PDF
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-6 flex-grow overflow-y-auto">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">Click to select, Shift-click to select a range, or drag to reorder pages.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {pages.map(page => (
                            <PageThumbnail 
                                key={page.id}
                                page={page}
                                isSelected={selectedPages.has(page.id)}
                                onClick={handlePageClick}
                                onDragStart={() => handleDragStart(page.id)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(page.id)}
                                onDragEnd={handleDragEnd}
                                isDragged={draggedPageId === page.id}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};