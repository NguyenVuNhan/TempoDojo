/** An opened PDF. Pages are 1-based. */
export interface PdfDoc {
  pageCount: number;
  /** Draws the page to fit cssWidth, at the device pixel ratio. */
  renderPage(page: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<void>;
  destroy(): void;
}

export class PdfError extends Error {
  constructor(public readonly code: 'unreadable') {
    super(code);
    this.name = 'PdfError';
  }
}
