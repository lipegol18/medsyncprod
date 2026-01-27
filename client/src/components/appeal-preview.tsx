import { useRef, useEffect, useState, useCallback } from "react";
import MedSyncLogo from "@/assets/icons/Medsync_Y_Estilizado_Azul.svg";
import { useAuth } from "@/hooks/use-auth";
import { GripVertical, RotateCcw } from "lucide-react";

interface AppealPreviewProps {
  patient: {
    fullName: string;
    birthDate: string;
    insurance?: string;
    insuranceNumber?: string;
    plan?: string;
  };
  hospital: {
    name: string;
    logoUrl?: string;
  };
  rejectionReason: string;
  appealJustification: string;
}

interface PageBreakInfo {
  originalPosition: number; // Posição calculada automaticamente (limite máximo)
  adjustedPosition: number; // Posição ajustada pelo usuário
}

// Constantes para cálculo de quebra de página A4
// A4: 297mm altura, com margens de ~40mm total (20mm top + 20mm bottom)
// Área útil por página: ~257mm ≈ 970px (considerando 96dpi: 1mm ≈ 3.78px)
const PAGE_HEIGHT_PX = 970; // Altura útil por página em pixels
const MIN_PAGE_CONTENT = 200; // Mínimo de conteúdo por página em pixels

export function AppealPreview({ 
  patient, 
  hospital, 
  rejectionReason, 
  appealJustification 
}: AppealPreviewProps) {
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageBreaks, setPageBreaks] = useState<PageBreakInfo[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartPosition, setDragStartPosition] = useState<number>(0);

  const formatDateBR = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calcular posições das quebras de página
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const breaks: PageBreakInfo[] = [];
      
      // Primeira página começa após o cabeçalho
      let currentPosition = PAGE_HEIGHT_PX;
      
      while (currentPosition < contentHeight) {
        breaks.push({
          originalPosition: currentPosition,
          adjustedPosition: currentPosition, // Começa igual à posição original
        });
        currentPosition += PAGE_HEIGHT_PX;
      }
      
      setPageBreaks(breaks);
    }
  }, [appealJustification, patient, hospital]);

  // Funções de arraste
  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDraggingIndex(index);
    setDragStartY(clientY);
    setDragStartPosition(pageBreaks[index]?.adjustedPosition || 0);
  }, [pageBreaks]);

  const handleDragMove = useCallback((clientY: number) => {
    if (draggingIndex === null || !containerRef.current) return;
    
    const deltaY = clientY - dragStartY;
    const newPosition = dragStartPosition + deltaY;
    const breakInfo = pageBreaks[draggingIndex];
    
    if (!breakInfo) return;
    
    // Limite superior: posição da quebra anterior + MIN_PAGE_CONTENT
    const previousBreakPosition = draggingIndex > 0 
      ? pageBreaks[draggingIndex - 1].adjustedPosition 
      : 0;
    const minPosition = previousBreakPosition + MIN_PAGE_CONTENT;
    
    // Limite inferior: posição original (não pode passar do limite da página)
    const maxPosition = breakInfo.originalPosition;
    
    // Aplicar limites
    const clampedPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
    
    setPageBreaks(prev => {
      const updated = [...prev];
      updated[draggingIndex] = {
        ...updated[draggingIndex],
        adjustedPosition: clampedPosition,
      };
      return updated;
    });
  }, [draggingIndex, dragStartY, dragStartPosition, pageBreaks]);

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  // Resetar uma quebra para posição original
  const resetBreak = useCallback((index: number) => {
    setPageBreaks(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        adjustedPosition: updated[index].originalPosition,
      };
      return updated;
    });
  }, []);

  // Event listeners globais para drag
  useEffect(() => {
    if (draggingIndex === null) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragMove(e.clientY);
    };
    
    const handleMouseUp = () => {
      handleDragEnd();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, handleDragMove, handleDragEnd]);

  return (
    <div className="flex justify-center mb-10">
      <div 
        ref={containerRef}
        id="documento-recurso-completo" 
        className="bg-white shadow-xl relative" 
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        {/* Marcadores de quebra de página arrastáveis */}
        {pageBreaks.map((breakInfo, index) => {
          const isAdjusted = breakInfo.adjustedPosition !== breakInfo.originalPosition;
          const isDragging = draggingIndex === index;
          
          return (
            <div
              key={index}
              className="absolute left-0 right-0 z-20"
              style={{ top: `${breakInfo.adjustedPosition}px` }}
            >
              <div className="relative">
                {/* Linha pontilhada */}
                <div 
                  className={`border-t-2 border-dashed ${isAdjusted ? 'border-orange-500' : 'border-red-500'}`}
                  style={{ width: '100%' }}
                />
                
                {/* Badge arrastável */}
                <div 
                  className={`absolute -top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs cursor-grab select-none transition-colors ${
                    isDragging 
                      ? 'bg-orange-600 cursor-grabbing scale-105' 
                      : isAdjusted 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-red-500 hover:bg-red-600'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDragStart(index, e.clientY);
                  }}
                  title="Arraste para ajustar a quebra de página"
                >
                  <GripVertical className="h-3 w-3" />
                  <span className="whitespace-nowrap">
                    Quebra {index + 1}
                    {isAdjusted && ' (ajustada)'}
                  </span>
                  
                  {/* Botão de reset */}
                  {isAdjusted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetBreak(index);
                      }}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded"
                      title="Resetar para posição original"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
                
                {/* Indicador de limite máximo (posição original) */}
                {isAdjusted && (
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-gray-300"
                    style={{ top: `${breakInfo.originalPosition - breakInfo.adjustedPosition}px` }}
                  >
                    <div className="absolute -top-2 right-4 text-[10px] text-gray-400 bg-white px-1">
                      limite
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Área de conteúdo com margens A4 */}
        <div 
          ref={contentRef}
          style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '30px', marginRight: '30px' }}
        >
          <div id="documento-recurso" className="w-full bg-white text-black p-2">
            
            {/* Cabeçalho com logos do hospital e médico */}
            <div className="mb-2">
              <div className="flex items-start justify-between">
                {/* Logo do hospital - lado esquerdo */}
                <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
                  {hospital?.logoUrl ? (
                    <img 
                      src={hospital.logoUrl} 
                      alt={`Logo do ${hospital.name}`} 
                      className="max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground text-center">
                      {hospital?.name || 'Hospital'}
                    </div>
                  )}
                </div>

                {/* Logo do médico - lado direito */}
                <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
                  {user?.logoUrl && (
                    <img 
                      src={user.logoUrl} 
                      alt="Logo do Médico" 
                      className="max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Dados do Paciente */}
            {patient && (
              <div className="mb-5 p-2 bg-white rounded-lg">
                <h3 className="text-sm font-semibold mb-1 border-b pb-1">Dados do Paciente</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    <p><span className="font-medium">Nome:</span> {patient.fullName}</p>
                    <p><span className="font-medium">Data de Nascimento:</span> {formatDateBR(patient.birthDate)}</p>
                    <p><span className="font-medium">Idade:</span> {calculateAge(patient.birthDate)} anos</p>
                  </div>
                  <div className="text-xs">
                    <p><span className="font-medium">Plano de Saúde:</span> {patient.insurance || 'Não informado'}</p>
                    <p><span className="font-medium">Número da Carteirinha:</span> {patient.insuranceNumber || 'Não informado'}</p>
                    <p><span className="font-medium">Tipo do Plano:</span> {patient.plan || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Título do documento */}
            <div className="pb-1 mb-4">
              <h2 className="text-base font-bold text-center text-foreground">
                RECURSO DE GLOSA - SOLICITAÇÃO DE REAVALIAÇÃO
              </h2>
            </div>

            {/* Justificativa Médica (Recurso) */}
            <div className="mb-6">
              <div className="text-xs text-justify bg-white p-3 rounded-md" style={{ 
                minHeight: '200px',
                height: 'auto'
              }}>
                <p className="whitespace-pre-wrap">{appealJustification || 'Justificativa médica será exibida aqui'}</p>
              </div>
            </div>

            {/* Seção de assinatura */}
            <div className="mt-8 mb-4">
              {/* Data */}
              <div className="text-right mb-6">
                <p className="text-xs text-muted-foreground">
                  {hospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Assinatura do médico */}
              <div className="flex justify-center relative mb-0">
                {user?.signatureUrl ? (
                  <img 
                    src={user.signatureUrl} 
                    alt="Assinatura do Médico" 
                    className="object-contain relative z-0"
                    style={{ maxWidth: '240px', maxHeight: '120px', marginBottom: '-10px' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-36 w-48 border border-border flex items-center justify-center bg-muted/30">
                    <span className="text-xs text-muted-foreground">Assinatura não cadastrada</span>
                  </div>
                )}
              </div>

              {/* Dados do médico */}
              {user && (
                <div className="flex flex-col items-center mb-6 relative z-10">
                  <div className="border-t border-border w-48 mb-1"></div>
                  <p className="text-xs font-bold text-foreground">{user.name?.toUpperCase()}</p>
                  <div className="text-xs text-muted-foreground text-center">
                    {user.signatureNote ? (
                      user.signatureNote.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      ))
                    ) : (
                      <p>ORTOPEDIA E TRAUMATOLOGIA</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">CRM {user.crm}</p>
                </div>
              )}

              {/* Rodapé */}
              <div className="pt-1 border-t border-border flex flex-row items-center justify-center">
                <img 
                  src={MedSyncLogo} 
                  alt="Logo MedSync" 
                  className="h-5 mr-2"
                />
                <p className="text-xs text-muted-foreground">Documento gerado por MedSync v2.5.3</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
