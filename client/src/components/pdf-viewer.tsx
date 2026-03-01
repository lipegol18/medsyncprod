import { useEffect, useState } from "react";
import { Loader2, AlertCircle, FileText, Download, Smartphone } from "lucide-react";

interface PdfViewerProps {
  blobUrl: string | null;
  isLoading: boolean;
  error: string | null;
  height?: string;
  width?: string;
  maxWidth?: string;
  hideScrollbar?: boolean;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(mobile);
  }, []);

  return isMobile;
}

export function PdfViewer({
  blobUrl,
  isLoading,
  error,
  height = "297mm",
  width = "210mm",
  maxWidth,
  hideScrollbar = false,
}: PdfViewerProps) {
  const isMobile = useIsMobile();
  const containerStyle = { width, height, minHeight: "400px", maxWidth: maxWidth || undefined };

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-red-200 rounded-lg shadow-md"
        style={containerStyle}
      >
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-red-600 font-medium">Erro ao gerar preview</p>
        <p className="text-xs text-red-400 mt-1 max-w-xs text-center">{error}</p>
      </div>
    );
  }

  if (isLoading || !blobUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg shadow-md"
        style={containerStyle}
      >
        <div className="relative">
          <FileText className="h-16 w-16 text-gray-200" />
          <Loader2 className="h-8 w-8 text-medsync-blue animate-spin absolute top-4 left-4" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">Gerando visualizacao do PDF...</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg shadow-md gap-5 px-6"
        style={containerStyle}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="relative">
            <FileText className="h-16 w-16 text-gray-300" />
            <Smartphone className="h-6 w-6 text-gray-400 absolute -bottom-1 -right-1 bg-white rounded-full" />
          </div>
          <p className="text-sm font-medium text-gray-700 mt-2">
            Visualizacao indisponivel no navegador mobile
          </p>
          <p className="text-xs text-gray-500">
            O Chrome para Android nao suporta PDFs embutidos. Baixe o arquivo para visualizar ou abrir em outro aplicativo.
          </p>
        </div>
        <a
          href={blobUrl}
          download="pedido-medico.pdf"
          className="flex items-center gap-2 bg-medsync-blue hover:bg-medsync-blue/90 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          Baixar PDF
        </a>
      </div>
    );
  }

  const scrollbar = hideScrollbar ? 0 : 1;
  const zoom = hideScrollbar ? "&zoom=page-width" : "";

  return (
    <iframe
      src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=${scrollbar}${zoom}`}
      style={containerStyle}
      className="bg-white border border-gray-300 shadow-xl rounded-sm"
      title="Visualizacao do PDF"
    />
  );
}
