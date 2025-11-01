import React, { useState, useRef } from 'react';
import type { PdfPage } from '../types';

interface PageThumbnailProps {
    page: PdfPage;
    isSelected: boolean;
    onClick: (pageId: string, shiftKey: boolean) => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: () => void;
    onDragEnd: () => void;
    isDragged: boolean;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({ page, isSelected, onClick, onDragStart, onDragOver, onDrop, onDragEnd, isDragged }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [previewPosition, setPreviewPosition] = useState<'right' | 'left'>('right');
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            // Estimate preview width to check against viewport
            const previewWidth = 280 + 16; // width + margin
            if (rect.right + previewWidth > window.innerWidth) {
                setPreviewPosition('left');
            } else {
                setPreviewPosition('right');
            }
        }
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.shiftKey) {
            e.preventDefault(); // Prevents text selection on shift-click
        }
        onClick(page.id, e.shiftKey);
    };
    
    const previewClasses = {
        base: "absolute z-30 top-1/2 -translate-y-1/2 w-[280px] bg-white dark:bg-slate-900 p-2 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 pointer-events-none transition-opacity duration-200",
        right: "left-[calc(100%+0.5rem)]",
        left: "right-[calc(100%+0.5rem)]",
        visible: "opacity-100",
        hidden: "opacity-0 invisible"
    };

    return (
        <div 
            ref={ref}
            draggable
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onClick={handleClick}
            className={`relative rounded-lg border-2 transition-all cursor-pointer active:cursor-grabbing ${ isSelected ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700' } ${isDragged ? 'opacity-30' : 'opacity-100'} overflow-hidden flex flex-col`}
        >
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <input 
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-5 w-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                />
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm aspect-[7/10] flex flex-col items-center justify-center relative">
                <img 
                    src={page.thumbnailUrl} 
                    alt={`Page ${page.originalPageIndex + 1} of ${page.originalFileName}`}
                    className="max-w-full max-h-full object-contain"
                    draggable="false"
                />
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">
                    {page.originalPageIndex + 1}
                </div>
            </div>
            
            <div className="p-2 text-center bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={page.originalFileName}>
                    {page.originalFileName}
                </p>
            </div>

            {/* Detailed Preview Popup */}
            <div className={`${previewClasses.base} ${previewPosition === 'right' ? previewClasses.right : previewClasses.left} ${isHovering ? previewClasses.visible : previewClasses.hidden}`}>
                 <img 
                    src={page.thumbnailUrl} 
                    alt={`Preview of Page ${page.originalPageIndex + 1}`} 
                    className="w-full rounded-md"
                />
                 <div className="mt-2 px-1 text-xs">
                     <p className="truncate font-bold text-slate-800 dark:text-slate-200" title={page.originalFileName}>{page.originalFileName}</p>
                     <p className="text-slate-600 dark:text-slate-400">Page {page.originalPageIndex + 1}</p>
                </div>
            </div>
        </div>
    )
}