export interface PdfFile {
  id: string;
  file: File;
}

export interface PdfPage {
  id: string;
  originalFileId: string;
  originalFileName: string;
  originalPageIndex: number; // 0-based
  thumbnailUrl: string;
}

export interface PageIdentifier {
  fileId: string;
  pageIndex: number;
}
