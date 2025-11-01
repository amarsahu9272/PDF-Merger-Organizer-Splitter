import type { PdfFile } from '../types';

// Fix: Augment the global Window interface to declare the PDFLib property.
// This lets TypeScript know that `window.PDFLib` is available, as it's loaded from a CDN script.
declare global {
  interface Window {
    PDFLib: any;
  }
}

// Define a new interface for the return type of mergePdfs
export interface MergeResult {
  mergedPdfBytes: Uint8Array | null;
  failedFiles: { fileName: string; reason: string }[];
}

// Interface for the input to the new createPdfFromPages function
export interface PageToMerge {
  file: File;
  pageIndex: number; // 0-based index of the page in the original file
}

export const mergePdfs = async (pdfFiles: PdfFile[]): Promise<MergeResult> => {
  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    throw new Error('PDF-Lib is not loaded. Please check your internet connection or ad-blocker and refresh the page.');
  }
  
  const { PDFDocument } = window.PDFLib;

  const mergedPdfDoc = await PDFDocument.create();
  const failedFiles: { fileName: string; reason: string }[] = [];

  for (const pdfFile of pdfFiles) {
    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      // Load the PDF, ignoring potential encryption issues that might prevent merging.
      const pdfToMerge = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      
      const pageIndices = pdfToMerge.getPageIndices();
      
      if (pageIndices.length === 0) {
        failedFiles.push({ fileName: pdfFile.file.name, reason: "File is empty (0 pages)" });
        continue;
      }
      
      const copiedPages = await mergedPdfDoc.copyPages(pdfToMerge, pageIndices);
      
      copiedPages.forEach((page) => {
        mergedPdfDoc.addPage(page);
      });
    } catch (error) {
        console.error(`Skipping corrupted or unreadable file: ${pdfFile.file.name}`, error);
        failedFiles.push({ fileName: pdfFile.file.name, reason: "File is corrupted or unreadable" });
    }
  }

  if (mergedPdfDoc.getPageCount() === 0) {
      return { mergedPdfBytes: null, failedFiles };
  }

  const mergedPdfBytes = await mergedPdfDoc.save();
  return { mergedPdfBytes, failedFiles };
};


export const createPdfFromPages = async (pages: PageToMerge[]): Promise<Uint8Array | null> => {
  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    throw new Error('PDF-Lib is not loaded.');
  }
  const { PDFDocument } = window.PDFLib;

  const newPdfDoc = await PDFDocument.create();
  // To avoid reloading the same file multiple times, we can cache the loaded PDF documents.
  const pdfDocCache = new Map<string, any>(); // Map<fileName, loaded PDFDoc>

  for (const page of pages) {
    let sourcePdfDoc = pdfDocCache.get(page.file.name);
    
    if (!sourcePdfDoc) {
      try {
        const arrayBuffer = await page.file.arrayBuffer();
        sourcePdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        pdfDocCache.set(page.file.name, sourcePdfDoc);
      } catch (e) {
        console.error(`Could not load file ${page.file.name} for page extraction.`, e);
        continue; // Skip this page if its parent file is unloadable
      }
    }
    
    // Ensure the page index is valid for the source document
    if (page.pageIndex < sourcePdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [page.pageIndex]);
        newPdfDoc.addPage(copiedPage);
    } else {
        console.warn(`Skipping page index ${page.pageIndex} for file ${page.file.name} as it is out of bounds.`);
    }
  }

  if (newPdfDoc.getPageCount() === 0) {
    return null;
  }

  return await newPdfDoc.save();
};
