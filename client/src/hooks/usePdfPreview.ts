import { useState, useEffect, useRef, useCallback } from "react";

interface UsePdfPreviewOptions {
  debounceMs?: number;
}

interface UsePdfPreviewResult {
  blobUrl: string | null;
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
}

export function usePdfPreview(
  pdfElement: React.ReactElement | null,
  deps: any[],
  options: UsePdfPreviewOptions = {},
): UsePdfPreviewResult {
  const { debounceMs = 400 } = options;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfElementRef = useRef<React.ReactElement | null>(pdfElement);
  const [regenerateCount, setRegenerateCount] = useState(0);

  pdfElementRef.current = pdfElement;

  const regenerate = useCallback(() => {
    setRegenerateCount((c) => c + 1);
  }, []);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;

    if (!pdfElementRef.current) {
      setBlobUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (currentRequestId !== requestIdRef.current) return;

      const elementToRender = pdfElementRef.current;
      if (!elementToRender) {
        setIsLoading(false);
        return;
      }

      try {
        if (typeof window !== "undefined" && !(window as any).Buffer) {
          const { Buffer } = await import("buffer");
          (window as any).Buffer = Buffer;
        }

        const { pdf } = await import("@react-pdf/renderer");
        const blob = await pdf(elementToRender).toBlob();

        if (currentRequestId !== requestIdRef.current) return;

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
        setError(null);
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;
        console.error("Erro ao gerar PDF preview:", err);
        setError(err?.message || "Erro ao gerar PDF");
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [...deps, regenerateCount]);

  useEffect(() => {
    return () => {
      requestIdRef.current++;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return { blobUrl, isLoading, error, regenerate };
}
