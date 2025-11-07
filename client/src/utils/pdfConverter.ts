import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Convert a PDF file to images (one per page)
 * This runs client-side in the browser, eliminating server-side native dependency issues
 */
export async function convertPdfToImages(file: File): Promise<File[]> {
  try {
    console.log(`Converting PDF "${file.name}" to images...`);

    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const images: File[] = [];
    const numPages = pdf.numPages;

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Set scale for good quality (2x for retina displays)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/jpeg', 0.92); // High quality JPEG
      });

      // Create File object from blob
      const originalName = file.name.replace(/\.pdf$/i, '');
      const imageName = numPages > 1
        ? `${originalName}_page${pageNum}.jpg`
        : `${originalName}.jpg`;

      const imageFile = new File([blob], imageName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      images.push(imageFile);
      console.log(`Converted page ${pageNum}/${numPages} of "${file.name}"`);
    }

    console.log(`Successfully converted "${file.name}" to ${images.length} image(s)`);
    return images;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error(`Failed to convert PDF "${file.name}" to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process an array of files, converting any PDFs to images
 */
export async function processFilesWithPdfConversion(files: File[]): Promise<File[]> {
  const processedFiles: File[] = [];

  for (const file of files) {
    if (file.type === 'application/pdf') {
      try {
        const images = await convertPdfToImages(file);
        processedFiles.push(...images);
      } catch (error) {
        console.error(`Failed to process PDF "${file.name}":`, error);
        throw error;
      }
    } else {
      processedFiles.push(file);
    }
  }

  return processedFiles;
}
