import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileList } from './components/FileList';
import { PageOrganizer } from './components/PageOrganizer';
import { mergePdfs, createPdfFromPages } from './services/pdfService';
import type { PdfFile, PageIdentifier } from './types';
import { PdfFileIcon } from './components/icons/PdfFileIcon';

const App: React.FC = () => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
      }
    };
  }, [mergedPdfUrl]);

  const handleFilesSelected = useCallback((selectedFiles: FileList) => {
    setError(null);
    const newPdfFiles = Array.from(selectedFiles)
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        file,
      }));
    
    setFiles(prevFiles => {
      const existingIds = new Set(prevFiles.map(f => f.id));
      const uniqueNewFiles = newPdfFiles.filter(f => !existingIds.has(f.id));
      return [...prevFiles, ...uniqueNewFiles];
    });
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
  }, []);

  const handleReorderFile = useCallback((id: string, direction: 'up' | 'down') => {
    setFiles(prevFiles => {
      const index = prevFiles.findIndex(file => file.id === id);
      if (index === -1) return prevFiles;

      const newFiles = [...prevFiles];
      if (direction === 'up' && index > 0) {
        [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      } else if (direction === 'down' && index < newFiles.length - 1) {
        [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      }
      return newFiles;
    });
  }, []);

  const handleDragReorder = useCallback((startIndex: number, endIndex: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const [removed] = newFiles.splice(startIndex, 1);
      newFiles.splice(endIndex, 0, removed);
      return newFiles;
    });
  }, []);

  const handleStartOrganizing = () => {
    if (files.length === 0) {
      setError('Please select at least one PDF file to organize.');
      return;
    }
    setError(null);
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }
    setIsOrganizing(true);
  };
  
  const handleCancelOrganizing = () => {
    setIsOrganizing(false);
  }

  const handleCreatePdf = async (pages: PageIdentifier[]) => {
    if (pages.length === 0) {
        setError('Cannot create an empty PDF. Please add some pages.');
        setIsOrganizing(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    setIsOrganizing(false); // Switch back to main view to show loading/result
     if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }

    try {
        // FIX: Explicitly type `fileMap` to resolve a TypeScript type inference issue.
        const fileMap: Map<string, File> = new Map(files.map(f => [f.id, f.file]));
        const pagesToMerge = pages.map(p => ({
            file: fileMap.get(p.fileId)!,
            pageIndex: p.pageIndex
        }));

        const pdfBytes = await createPdfFromPages(pagesToMerge);
        if (pdfBytes) {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setMergedPdfUrl(url);
        } else {
            setError("Could not create PDF from the selected pages.");
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during PDF creation.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }


  const handleSimpleMerge = async () => {
    if (files.length < 2) {
      setError('Please select at least two PDF files to merge.');
      return;
    }
    setError(null);
    setIsLoading(true);
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }

    try {
      const { mergedPdfBytes, failedFiles } = await mergePdfs(files);

      if (mergedPdfBytes) {
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setMergedPdfUrl(url);
      }
      
      if (failedFiles.length > 0) {
        const failedFilesMessage = failedFiles.map(f => `"${f.fileName}" (${f.reason})`).join(', ');
        const errorMessage = mergedPdfBytes
          ? `Merge complete, but some files were skipped: ${failedFilesMessage}.`
          : `Merging failed. All files were unreadable or empty: ${failedFilesMessage}.`;
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during merging.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsLoading(false);
    setError(null);
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
    }
    setMergedPdfUrl(null);
    setIsOrganizing(false);
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 antialiased">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-3 mb-2">
            <PdfFileIcon className="w-10 h-10 text-indigo-500" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
              PDF Merger & Organizer
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Combine, reorder, and organize PDF files and pages. Fast, secure, and entirely in your browser.
          </p>
        </header>

        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {isOrganizing ? (
                <PageOrganizer 
                    files={files} 
                    onCancel={handleCancelOrganizing} 
                    onMerge={handleCreatePdf}
                />
            ) : (
                <div className="p-6 md:p-8">
                {files.length === 0 && (
                  <FileUploader onFilesSelected={handleFilesSelected} />
                )}

                {files.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                       <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">Your Files</h2>
                       <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Drag and drop to reorder files, or use the arrows.</p>
                      <FileList 
                        files={files} 
                        onRemove={handleRemoveFile} 
                        onReorder={handleReorderFile}
                        onDragReorder={handleDragReorder}
                      />
                      <div className="mt-4">
                         <FileUploader onFilesSelected={handleFilesSelected} compact={true} />
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                      {mergedPdfUrl ? (
                        <div className="text-center">
                          <h3 className="text-xl font-semibold mb-3 text-green-600 dark:text-green-400">Success!</h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-6">Your customized PDF is ready for download.</p>
                          <a
                            href={mergedPdfUrl}
                            download={`merged-${Date.now()}.pdf`}
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition"
                          >
                            Download PDF
                          </a>
                          <button 
                            onClick={handleReset} 
                            className="w-full mt-3 inline-flex justify-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition"
                          >
                            Start Over
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <h3 className="text-xl font-semibold mb-3 text-slate-700 dark:text-slate-300">Ready to Go?</h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-6">You have {files.length} file(s) ready. Organize pages or merge files directly.</p>
                          <button
                            onClick={handleStartOrganizing}
                            disabled={isLoading || files.length < 1}
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-slate-900 transition"
                          >
                            Organize Pages
                          </button>
                          <button
                            onClick={handleSimpleMerge}
                            disabled={isLoading || files.length < 2}
                            className="w-full mt-3 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition"
                          >
                            {isLoading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Merging...
                              </>
                            ) : (
                              `Quick Merge ${files.length} Files`
                            )}
                          </button>
                           <button 
                            onClick={handleReset} 
                            className="w-full mt-3 inline-flex justify-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      {error && (
                        <div className="mt-4 text-center text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded-md">
                          {error}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
        <footer className="text-center mt-8 md:mt-12">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Created with React, Tailwind CSS, pdf-lib, and pdf.js. Your files are processed locally and never uploaded.
            </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
