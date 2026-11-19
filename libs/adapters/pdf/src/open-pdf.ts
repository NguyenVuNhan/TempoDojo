import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PdfError, type PdfDoc } from './pdf-doc';

let workerConfigured = false;

function ensureWorker(): void {
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    workerConfigured = true;
  }
}

const activeRenders = new WeakMap<HTMLCanvasElement, pdfjs.RenderTask>();

export async function openPdf(bytes: Uint8Array): Promise<PdfDoc> {
  ensureWorker();

  let doc: pdfjs.PDFDocumentProxy;
  let loadingTask: ReturnType<typeof pdfjs.getDocument>;
  try {
    loadingTask = pdfjs.getDocument({ data: bytes.slice() });
    doc = await loadingTask.promise;
  } catch {
    throw new PdfError('unreadable');
  }

  return {
    pageCount: doc.numPages,
    async renderPage(page: number, canvas: HTMLCanvasElement, cssWidth: number, maxCssHeight?: number): Promise<void> {
      activeRenders.get(canvas)?.cancel();

      const pdfPage = await doc.getPage(page);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const fitWidth = cssWidth / baseViewport.width;
      const scale = maxCssHeight ? Math.min(fitWidth, maxCssHeight / baseViewport.height) : fitWidth;
      const viewport = pdfPage.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;

      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      activeRenders.get(canvas)?.cancel();
      const task = pdfPage.render({
        canvas,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      });
      activeRenders.set(canvas, task);

      try {
        await task.promise;
      } catch (err) {
        if (!(err instanceof pdfjs.RenderingCancelledException)) {
          throw err;
        }
      } finally {
        if (activeRenders.get(canvas) === task) {
          activeRenders.delete(canvas);
        }
      }
    },
    destroy() {
      // pdf.js 6: the loading task owns the worker and the document.
      void loadingTask.destroy();
    },
  };
}
