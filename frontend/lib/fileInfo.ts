// lib/fileInfo.ts
import { PDFDocument } from 'pdf-lib';

export async function extractFileInfo(file: File): Promise<{
  totalPages: number;
  fileType: string;
  dimensions?: { width: number; height: number };
}> {
  const fileType = file.type;

  // PDF Files
  if (fileType === 'application/pdf') {
    return await extractPdfInfo(file);
  }

  // Image Files
  if (fileType.startsWith('image/')) {
    return await extractImageInfo(file);
  }

  // Word Documents
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return await extractDocxInfo(file);
  }

  // Default fallback
  return {
    totalPages: 1,
    fileType: fileType || 'unknown'
  };
}

async function extractPdfInfo(file: File): Promise<{
  totalPages: number;
  fileType: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    console.log(`✅ PDF loaded: ${totalPages} pages`);

    return {
      totalPages,
      fileType: 'pdf'
    };
  } catch (error) {
    console.error('Failed to extract PDF info:', error);
    return { totalPages: 1, fileType: 'pdf' };
  }
}

async function extractImageInfo(file: File): Promise<{
  totalPages: number;
  fileType: string;
  dimensions: { width: number; height: number };
}> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      console.log(`✅ Image loaded: ${img.width}x${img.height}`);
      resolve({
        totalPages: 1,
        fileType: 'image',
        dimensions: {
          width: img.width,
          height: img.height
        }
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        totalPages: 1,
        fileType: 'image',
        dimensions: { width: 0, height: 0 }
      });
    };

    img.src = url;
  });
}

async function extractDocxInfo(file: File): Promise<{
  totalPages: number;
  fileType: string;
}> {
  try {
    // Estimate based on file size (rough: 1 page ≈ 50KB)
    const estimatedPages = Math.max(1, Math.ceil(file.size / 51200));

    console.log(`✅ DOCX loaded: ~${estimatedPages} pages estimated`);

    return {
      totalPages: estimatedPages,
      fileType: 'docx'
    };
  } catch (error) {
    console.error('Failed to extract DOCX info:', error);
    return { totalPages: 1, fileType: 'docx' };
  }
}
