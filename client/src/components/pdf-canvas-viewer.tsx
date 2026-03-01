import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, FileText } from "lucide-react";

interface PdfCanvasViewerProps {
  blobUrl: string | null;
  isLoading: boolean;
  error: string | null;
  width?: number;
}

export function PdfCanvasViewer({
  blobUrl,
  isLoading,
  error,
  width = 794,
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!blobUrl) return;

    let cancelled = false;

    const render = async () => {
      setRendering(true);
      setRenderError(null);

      try {
        const pdfjsLib = await import("pdfjs-dist");
        const workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).href;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

        const pdf = await pdfjsLib.getDocument(blobUrl).promise;

        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = "";

        const dpr = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          const scale = width / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(scaledViewport.width * dpr);
          canvas.height = Math.floor(scaledViewport.height * dpr);
          canvas.style.width = `${scaledViewport.width}px`;
          canvas.style.height = `${scaledViewport.height}px`;
          canvas.style.display = "block";

          if (pageNum > 1) {
            canvas.style.marginTop = "12px";
          }

          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          ctx.scale(dpr, dpr);

          await page.render({
            canvasContext: ctx,
            viewport: scaledViewport,
          }).promise;
        }
      } catch (err: any) {
        if (!cancelled) {
          setRenderError(err?.message || "Erro ao renderizar PDF");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [blobUrl, width]);

  if (error || renderError) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-red-200 rounded-lg shadow-md"
        style={{ width, minHeight: 400 }}
      >
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-red-600 font-medium">Erro ao gerar preview</p>
        <p className="text-xs text-red-400 mt-1 max-w-xs text-center">{error || renderError}</p>
      </div>
    );
  }

  if (isLoading || !blobUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg shadow-md"
        style={{ width, minHeight: 400 }}
      >
        <div className="relative">
          <FileText className="h-16 w-16 text-gray-200" />
          <Loader2 className="h-8 w-8 text-medsync-blue animate-spin absolute top-4 left-4" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">Gerando visualizacao do PDF...</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width }}>
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
          <Loader2 className="h-8 w-8 text-medsync-blue animate-spin" />
        </div>
      )}
      <div ref={containerRef} style={{ width }} />
    </div>
  );
}
