import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, RotateCcw } from 'lucide-react';
import { MarkdownViewer } from '@/components/markdown-editor';
import MedSyncLogo from '@assets/medSync-logo.svg';

// Tipos para quebra de página
export interface PageBreakInfo {
  originalPosition: number;
  adjustedPosition: number;
}

// Interface para item CID com associação cirúrgica
interface CidItemWithAssociation {
  cid: {
    id: number;
    code: string;
    description: string;
    category?: string;
    sourceApproachId?: number;
    sourceProcedureId?: number;
  };
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
  sourceApproachId?: number;
  sourceProcedureId?: number;
}

// Interface para item OPME com associação
interface OpmeItemWithAssociation {
  item?: {
    id: number;
    technicalName: string;
    commercialName?: string | null;
    anvisaCode?: string | null;
    sourceApproachId?: number;
    sourceProcedureId?: number;
  };
  technicalName?: string;
  quantity: number;
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
  sourceApproachId?: number;
  sourceProcedureId?: number;
}

// Interface para procedimento secundário
interface SecondaryProcedure {
  procedure: {
    id: number;
    code: string;
    name: string;
    porte?: string | null;
    sourceApproachId?: number;
    sourceProcedureId?: number;
    sourceApproachName?: string;
    sourceProcedureName?: string;
    surgicalApproach?: { id: number; name: string } | null;
    surgicalProcedure?: { id: number; name: string } | null;
  };
  quantity: number;
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
}

// Interface para fornecedor
interface SupplierDetail {
  id: number;
  companyName: string;
  tradeName: string | null;
  cnpj: string;
  sourceApproachId?: number | null;
  sourceApproachName?: string | null;
  sourceProcedureId?: number | null;
  sourceProcedureName?: string | null;
}

// Interface para paciente
interface Patient {
  id: number;
  fullName: string;
  birthDate: string;
  insurance?: string | null;
  insuranceNumber?: string | null;
  plan?: string | null;
}

// Interface para hospital
interface Hospital {
  id: number;
  name: string;
  logoUrl?: string | null;
}

// Interface para usuário (médico)
interface User {
  id: number;
  name?: string;
  crm?: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatureNote?: string | null;
}

// Props do componente
export interface OrderPreviewProps {
  // Dados principais
  selectedPatient: Patient | null;
  selectedHospital: Hospital | null;
  user: User | null;
  
  // Dados clínicos
  clinicalJustification: string;
  procedureType: string;
  procedureLaterality: string;
  
  // Listas de itens
  multipleCids: CidItemWithAssociation[];
  secondaryProcedures: SecondaryProcedure[];
  selectedOpmeItems: OpmeItemWithAssociation[];
  supplierDetails: SupplierDetail[];
  
  // Observações adicionais
  cbhpmAdditionalNotes?: string;
  opmeAdditionalNotes?: string;
  supplierAdditionalNotes?: string;
  
  // Callback para quebras de página
  onPageBreaksChange?: (breaks: PageBreakInfo[]) => void;
  
  // Refs externos (opcional)
  containerRef?: React.RefObject<HTMLDivElement>;
  previewRef?: React.RefObject<HTMLDivElement>;
}

// Constantes sincronizadas com PDF
// PDF: A4 = 842pt, paddingTop=80pt, paddingBottom=60pt → altura útil = 702pt
// Convertendo para pixels de tela (96 DPI): 702 * (96/72) ≈ 936px
const PAGE_HEIGHT_PX = 936;
const MIN_PAGE_CONTENT = 200;

// Função para formatar data no formato brasileiro
const formatDateBR = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

export function OrderPreview({
  selectedPatient,
  selectedHospital,
  user,
  clinicalJustification,
  procedureType,
  procedureLaterality,
  multipleCids,
  secondaryProcedures,
  selectedOpmeItems,
  supplierDetails,
  cbhpmAdditionalNotes,
  opmeAdditionalNotes,
  supplierAdditionalNotes,
  onPageBreaksChange,
  containerRef: externalContainerRef,
  previewRef: externalPreviewRef,
}: OrderPreviewProps) {
  // Refs internos (usar externos se fornecidos)
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const internalPreviewRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const previewRef = externalPreviewRef || internalPreviewRef;
  
  // Estados para quebras de página
  const [pageBreaks, setPageBreaks] = useState<PageBreakInfo[]>([]);
  const [draggingBreakIndex, setDraggingBreakIndex] = useState<number | null>(null);
  const [breakDragStartY, setBreakDragStartY] = useState<number>(0);
  const [breakDragStartPosition, setBreakDragStartPosition] = useState<number>(0);

  // Calcular quebras de página
  useEffect(() => {
    const timer = setTimeout(() => {
      const previewHeight = previewRef.current?.scrollHeight || 0;
      const numPages = Math.ceil(previewHeight / PAGE_HEIGHT_PX);
      
      console.log('[OrderPreview] previewHeight:', previewHeight, 'PAGE_HEIGHT_PX:', PAGE_HEIGHT_PX, 'numPages:', numPages);
      
      if (numPages <= 1) {
        setPageBreaks([]);
        onPageBreaksChange?.([]);
        return;
      }
      
      const breaks: PageBreakInfo[] = [];
      for (let i = 1; i < numPages; i++) {
        const position = i * PAGE_HEIGHT_PX;
        breaks.push({
          originalPosition: position,
          adjustedPosition: position
        });
      }
      setPageBreaks(breaks);
      onPageBreaksChange?.(breaks);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedPatient, selectedHospital, clinicalJustification, secondaryProcedures, onPageBreaksChange]);

  // Handlers para arrastar marcadores
  const handleBreakDragStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setDraggingBreakIndex(index);
    setBreakDragStartY(e.clientY);
    setBreakDragStartPosition(pageBreaks[index]?.adjustedPosition || 0);
  }, [pageBreaks]);

  const handleBreakDrag = useCallback((e: MouseEvent) => {
    if (draggingBreakIndex === null) return;
    
    const deltaY = e.clientY - breakDragStartY;
    const newPosition = breakDragStartPosition + deltaY;
    const breakInfo = pageBreaks[draggingBreakIndex];
    
    if (!breakInfo) return;
    
    const previousBreakPosition = draggingBreakIndex > 0 
      ? pageBreaks[draggingBreakIndex - 1].adjustedPosition 
      : 0;
    const minPosition = previousBreakPosition + MIN_PAGE_CONTENT;
    const maxPosition = breakInfo.originalPosition;
    const clampedPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
    
    setPageBreaks(prev => {
      const updated = [...prev];
      updated[draggingBreakIndex] = {
        ...updated[draggingBreakIndex],
        adjustedPosition: clampedPosition,
      };
      onPageBreaksChange?.(updated);
      return updated;
    });
  }, [draggingBreakIndex, breakDragStartY, breakDragStartPosition, pageBreaks, onPageBreaksChange]);

  const handleBreakDragEnd = useCallback(() => {
    setDraggingBreakIndex(null);
  }, []);

  // Listeners globais para drag
  useEffect(() => {
    if (draggingBreakIndex !== null) {
      document.addEventListener('mousemove', handleBreakDrag);
      document.addEventListener('mouseup', handleBreakDragEnd);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleBreakDrag);
        document.removeEventListener('mouseup', handleBreakDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [draggingBreakIndex, handleBreakDrag, handleBreakDragEnd]);

  // Reset das quebras de página
  const resetPageBreaks = useCallback(() => {
    setPageBreaks(prev => {
      const updated = prev.map(b => ({
        ...b,
        adjustedPosition: b.originalPosition
      }));
      onPageBreaksChange?.(updated);
      return updated;
    });
  }, [onPageBreaksChange]);

  // Função para agrupar itens por procedimento/conduta
  const groupItemsByApproach = () => {
    const groups: Map<string, {
      procedureId: number | null;
      procedureName: string;
      approachId: number | null;
      approachName: string;
      cids: CidItemWithAssociation[];
      cbhpmProcedures: SecondaryProcedure[];
      opmeItems: OpmeItemWithAssociation[];
      suppliers: SupplierDetail[];
    }> = new Map();

    // Agrupar CIDs
    if (multipleCids && multipleCids.length > 0) {
      multipleCids.forEach((cidItem) => {
        const approach = cidItem.surgicalApproach || (cidItem.cid as any)?.surgicalApproach;
        const approachId = approach?.id || cidItem.sourceApproachId || (cidItem.cid as any)?.sourceApproachId || null;
        const approachName = approach?.name || (cidItem as any).sourceApproachName || (cidItem.cid as any)?.sourceApproachName || 'Itens Gerais';
        const procedure = cidItem.surgicalProcedure || (cidItem.cid as any)?.surgicalProcedure;
        const procedureId = procedure?.id || cidItem.sourceProcedureId || (cidItem.cid as any)?.sourceProcedureId || null;
        const procedureName = procedure?.name || (cidItem as any).sourceProcedureName || (cidItem.cid as any)?.sourceProcedureName || '';
        const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
        
        if (!groups.has(key)) {
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItems: [], suppliers: [] });
        }
        groups.get(key)!.cids.push(cidItem);
      });
    }

    // Agrupar procedimentos CBHPM
    if (secondaryProcedures && secondaryProcedures.length > 0) {
      secondaryProcedures.forEach((proc) => {
        const approach = proc.surgicalApproach || proc.procedure?.surgicalApproach;
        const approachId = approach?.id || proc.procedure?.sourceApproachId || null;
        const approachName = approach?.name || proc.procedure?.sourceApproachName || 'Itens Gerais';
        const procedure = proc.surgicalProcedure || proc.procedure?.surgicalProcedure;
        const procedureId = procedure?.id || proc.procedure?.sourceProcedureId || null;
        const procedureName = procedure?.name || proc.procedure?.sourceProcedureName || '';
        const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
        
        if (!groups.has(key)) {
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItems: [], suppliers: [] });
        }
        groups.get(key)!.cbhpmProcedures.push(proc);
      });
    }

    // Agrupar itens OPME
    if (selectedOpmeItems && selectedOpmeItems.length > 0) {
      selectedOpmeItems.forEach((opmeItem) => {
        const item = opmeItem.item || opmeItem;
        const approach = opmeItem.surgicalApproach || (item as any)?.surgicalApproach;
        const approachId = approach?.id || (item as any)?.sourceApproachId || null;
        const approachName = approach?.name || (item as any)?.sourceApproachName || 'Itens Gerais';
        const procedure = opmeItem.surgicalProcedure || (item as any)?.surgicalProcedure;
        const procedureId = procedure?.id || (item as any)?.sourceProcedureId || null;
        const procedureName = procedure?.name || (item as any)?.sourceProcedureName || '';
        const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
        
        if (!groups.has(key)) {
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItems: [], suppliers: [] });
        }
        groups.get(key)!.opmeItems.push(opmeItem);
      });
    }

    // Agrupar fornecedores
    if (supplierDetails && supplierDetails.length > 0) {
      supplierDetails.forEach((supplier) => {
        const approachId = supplier.sourceApproachId || null;
        const approachName = supplier.sourceApproachName || 'Itens Gerais';
        const procedureId = supplier.sourceProcedureId || null;
        const procedureName = supplier.sourceProcedureName || '';
        const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
        
        if (!groups.has(key)) {
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItems: [], suppliers: [] });
        }
        groups.get(key)!.suppliers.push(supplier);
      });
    }

    // Ordenar: itens específicos primeiro, 'general' no final
    const entries = Array.from(groups.entries());
    const generalEntry = entries.find(([key]) => key === 'general');
    const otherEntries = entries.filter(([key]) => key !== 'general');
    return generalEntry ? [...otherEntries, generalEntry] : otherEntries;
  };

  // Parser de notas por subtítulo
  const parseNotesBySubtitle = (notes: string | undefined) => {
    if (!notes) return { general: '', sections: new Map<string, string>() };
    
    const sections = new Map<string, string>();
    const lines = notes.split('\n');
    let currentKey: string | null = null;
    let currentContent: string[] = [];
    let generalContent: string[] = [];
    
    const saveContent = (key: string, content: string) => {
      if (!content) return;
      const existing = sections.get(key);
      if (existing) {
        sections.set(key, `${existing}\n\n${content}`);
      } else {
        sections.set(key, content);
      }
    };
    
    lines.forEach(line => {
      const subtitleWithIdsMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*\[PID:(\d+)\]\[AID:(\d+)\]\s*$/);
      const subtitleMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*$/);
      
      if (subtitleWithIdsMatch || subtitleMatch) {
        if (currentKey) {
          saveContent(currentKey, currentContent.join('\n').trim());
        } else if (currentContent.length > 0) {
          generalContent = [...generalContent, ...currentContent];
        }
        
        const procedureName = (subtitleWithIdsMatch || subtitleMatch)![1].trim();
        const approachName = (subtitleWithIdsMatch || subtitleMatch)![2].trim();
        currentKey = `name:${procedureName}-${approachName}`;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });
    
    if (currentKey) {
      saveContent(currentKey, currentContent.join('\n').trim());
    } else if (currentContent.length > 0) {
      generalContent = [...generalContent, ...currentContent];
    }
    
    return { general: generalContent.join('\n').trim(), sections };
  };

  // Helper para buscar nota
  const findNote = (
    sections: Map<string, string>,
    procedureName: string,
    approachName: string
  ): string | undefined => {
    const nameKey = `name:${procedureName}-${approachName}`;
    return sections.get(nameKey);
  };

  // Ordenar procedimentos por porte
  const parsePorteValue = (porte: string | null | undefined): number => {
    if (!porte) return 0;
    const match = porte.match(/^(\d+)([A-Za-z]?)$/);
    if (!match) return 0;
    const numero = parseInt(match[1], 10);
    const letra = match[2]?.toUpperCase() || 'A';
    const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    return (numero * 100) + valorLetra;
  };

  // Parser de notas gerais
  const parseGeneralNotes = (notes: string | undefined | null) => {
    if (!notes) return '';
    const lines = notes.split('\n');
    let hasSubtitle = false;
    const generalContent: string[] = [];
    
    lines.forEach(line => {
      const subtitleMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*$/);
      if (subtitleMatch) {
        hasSubtitle = true;
      } else if (!hasSubtitle) {
        generalContent.push(line);
      }
    });
    
    return generalContent.join('\n').trim();
  };

  // Dados calculados
  const groupedItems = groupItemsByApproach();
  const hasMultipleGroups = groupedItems.length > 1 || (groupedItems.length === 1 && groupedItems[0][0] !== 'general');
  const cbhpmNotes = parseNotesBySubtitle(cbhpmAdditionalNotes);
  const opmeNotes = parseNotesBySubtitle(opmeAdditionalNotes);
  const supplierNotes = parseNotesBySubtitle(supplierAdditionalNotes);
  const cbhpmGeneral = parseGeneralNotes(cbhpmAdditionalNotes);
  const opmeGeneral = parseGeneralNotes(opmeAdditionalNotes);
  const supplierGeneral = parseGeneralNotes(supplierAdditionalNotes);

  return (
    <div className="mb-6 text-foreground">
      <h3 className="text-lg font-medium text-foreground">
        Visualização do Pedido
      </h3>
      <p className="text-sm text-muted-foreground">
        Revise os dados do pedido antes de finalizar
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Prévia A4 (210 x 297 mm)
      </p>
      
      {/* Controles de quebra de página */}
      {pageBreaks.length > 0 && (
        <div className="flex items-center gap-2 mt-2 mb-2">
          <span className="text-xs text-muted-foreground">
            Arraste as linhas para ajustar as quebras de página
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetPageBreaks}
            className="text-xs h-6 px-2"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Resetar
          </Button>
        </div>
      )}

      {/* Container principal A4 */}
      <div className="flex justify-center mb-10 overflow-visible" ref={containerRef}>
        <div id="documento-completo" className="bg-white shadow-xl relative overflow-visible" style={{ width: '210mm', minHeight: '297mm' }}>
          
          {/* Marcadores de quebra de página arrastáveis */}
          {pageBreaks.map((breakInfo, index) => {
            const isAdjusted = breakInfo.adjustedPosition !== breakInfo.originalPosition;
            const isDragging = draggingBreakIndex === index;
            
            return (
              <div
                key={index}
                className="absolute left-0 right-0 z-50"
                style={{ 
                  top: `${breakInfo.adjustedPosition}px`,
                  pointerEvents: 'auto'
                }}
              >
                <div className="relative">
                  {/* Linha pontilhada */}
                  <div 
                    className={`border-t-2 border-dashed ${isAdjusted ? 'border-orange-500' : 'border-red-500'}`}
                    style={{ width: '100%' }}
                  />
                  
                  {/* Badge arrastável */}
                  <div 
                    className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs cursor-grab select-none transition-colors ${
                      isDragging 
                        ? 'bg-orange-600 cursor-grabbing scale-105' 
                        : isAdjusted 
                          ? 'bg-orange-500 hover:bg-orange-600' 
                          : 'bg-red-500 hover:bg-red-600'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleBreakDragStart(e, index);
                    }}
                    title="Arraste para ajustar a quebra de página"
                  >
                    <GripVertical className="h-3 w-3" />
                    <span className="whitespace-nowrap">
                      Quebra {index + 1}
                      {isAdjusted && ' (ajustada)'}
                    </span>
                    
                    {/* Botão de reset individual */}
                    {isAdjusted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPageBreaks(prev => {
                            const updated = [...prev];
                            updated[index] = {
                              ...updated[index],
                              adjustedPosition: updated[index].originalPosition,
                            };
                            onPageBreaksChange?.(updated);
                            return updated;
                          });
                        }}
                        className="ml-1 p-0.5 hover:bg-white/20 rounded"
                        title="Resetar para posição original"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Indicador de limite máximo */}
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
            ref={previewRef}
            className="relative z-0"
            style={{ 
              marginTop: '107px',
              marginBottom: '80px',
              marginLeft: '27px', 
              marginRight: '27px' 
            }}
          >
            <div id="documento-pedido" className="w-full bg-white text-black p-2 relative z-0">
              {/* Cabeçalho com logos */}
              <div className="mb-2">
                <div className="flex items-start justify-between">
                  {/* Logo do hospital */}
                  <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
                    {selectedHospital?.logoUrl ? (
                      <img 
                        src={selectedHospital.logoUrl} 
                        alt={`Logo do ${selectedHospital.name}`} 
                        className="max-h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        {selectedHospital?.name || 'Hospital'}
                      </div>
                    )}
                  </div>

                  {/* Logo do médico */}
                  <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
                    {user?.logoUrl && (
                      <img 
                        src={user.logoUrl} 
                        alt="Logo do Médico" 
                        className="max-h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Dados do Paciente */}
              {selectedPatient && (
                <div className="mb-5 p-2 bg-white rounded-lg">
                  <h3 className="text-sm font-semibold mb-1 border-b pb-1">Dados do Paciente</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-xs">
                      <p><span className="font-medium">Nome:</span> {selectedPatient.fullName}</p>
                      <p><span className="font-medium">Data de Nascimento:</span> {formatDateBR(selectedPatient.birthDate)}</p>
                      <p><span className="font-medium">Idade:</span> {new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} anos</p>
                    </div>
                    <div className="text-xs">
                      <p><span className="font-medium">Plano de Saúde:</span> {selectedPatient.insurance || ''}</p>
                      <p><span className="font-medium">Número da Carteirinha:</span> {selectedPatient.insuranceNumber || ''}</p>
                      <p><span className="font-medium">Tipo do Plano:</span> {selectedPatient.plan || ''}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Título do documento */}
              <div className="pb-1 mb-4">
                <h2 className="text-base font-bold text-center text-foreground">
                  SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
                </h2>
                
                {/* Justificativa clínica */}
                <div 
                  id="justification-preview-box"
                  className="mt-2 text-xs text-justify bg-white p-2 rounded-md" 
                  style={{ minHeight: '72px', height: 'auto' }}
                >
                  {clinicalJustification ? (
                    <MarkdownViewer content={clinicalJustification} className="prose-xs" />
                  ) : (
                    <p className="text-muted-foreground italic">Justificativa clínica será exibida aqui</p>
                  )}
                </div>
              </div>

              {/* Procedimentos e dados clínicos */}
              <div className="space-y-4 mt-10">
                <div className="pb-2">
                  <div className="space-y-2">

                    {/* Caráter e Lateralidade */}
                    <div className="flex text-xs">
                      <div className="w-1/2">
                        <p className="font-bold text-foreground">Caráter do Procedimento:</p>
                        <p className="text-muted-foreground pl-4">
                          {procedureType === 'eletiva' ? 'Eletivo' : 
                           procedureType === 'urgencia' ? 'Urgência' : 
                           procedureType === 'emergencia' ? 'Emergência' : ''}
                        </p>
                      </div>
                      <div className="w-1/2">
                        <p className="font-bold text-foreground">Lateralidade do Procedimento:</p>
                        <p className="text-muted-foreground pl-4">
                          {procedureLaterality === 'direito' ? 'Direito' :
                           procedureLaterality === 'esquerdo' ? 'Esquerdo' :
                           procedureLaterality === 'bilateral' ? 'Bilateral' :
                           procedureLaterality === 'nao_se_aplica' ? 'Não se aplica' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Grupos de itens */}
                    {groupedItems.map(([key, group], groupIndex) => (
                      <div key={key} className={`${groupIndex > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}>
                        {/* Subtítulo do grupo */}
                        {hasMultipleGroups && group.approachId && (
                          <div className="mb-3">
                            <p className="font-bold text-base text-medsync-blue">
                              {group.procedureName} → {group.approachName}
                            </p>
                          </div>
                        )}

                        {/* CIDs */}
                        {group.cids.length > 0 && (
                          <div className="mb-2">
                            <p className="font-bold text-xs text-foreground">Códigos CID-10:</p>
                            <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                              {group.cids.map((cidItem, index) => (
                                <p key={cidItem.cid?.id || index}>
                                  {cidItem.cid?.code} - {cidItem.cid?.description}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Procedimentos CBHPM */}
                        {group.cbhpmProcedures.length > 0 && (
                          <div className="mb-2">
                            <p className="font-bold text-xs text-foreground">Procedimentos Cirúrgicos Necessários:</p>
                            <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                              {(() => {
                                const sortedProcs = [...group.cbhpmProcedures].sort(
                                  (a, b) => parsePorteValue(b.procedure?.porte) - parsePorteValue(a.procedure?.porte)
                                );
                                return sortedProcs.map((proc, index) => (
                                  <p key={index}>
                                    {proc.quantity} x {proc.procedure?.code} - {proc.procedure?.name}
                                    {index === 0 && sortedProcs.length > 1 ? ' (Principal)' : ''}
                                  </p>
                                ));
                              })()}
                            </div>
                            {/* Observação CBHPM */}
                            {(() => {
                              const note = findNote(cbhpmNotes.sections, group.procedureName, group.approachName);
                              if (!note) return null;
                              return (
                                <div className="mt-1">
                                  <p className="font-bold text-xs text-foreground">Observações:</p>
                                  <div className="text-xs text-muted-foreground pl-4">
                                    <MarkdownViewer content={note} className="prose-xs" />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Materiais OPME */}
                        {group.opmeItems.length > 0 && (
                          <div className="mb-2">
                            <p className="font-bold text-xs text-foreground">Lista de Materiais Necessários:</p>
                            <div className="flex flex-col text-xs text-muted-foreground pl-4 gap-0.5">
                              {group.opmeItems.map((item, index) => (
                                <p key={index}>
                                  {item.quantity} x {item.technicalName || item.item?.technicalName || 'Material não especificado'}
                                </p>
                              ))}
                            </div>
                            {/* Observação OPME */}
                            {(() => {
                              const note = findNote(opmeNotes.sections, group.procedureName, group.approachName);
                              if (!note) return null;
                              return (
                                <div className="mt-1">
                                  <p className="font-bold text-xs text-foreground">Observações:</p>
                                  <div className="text-xs text-muted-foreground pl-4">
                                    <MarkdownViewer content={note} className="prose-xs" />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Fornecedores */}
                        {group.suppliers.length > 0 && (
                          <div className="mb-2">
                            <p className="font-bold text-xs text-foreground">Fornecedores:</p>
                            <div className="flex flex-col text-xs text-muted-foreground pl-4 gap-0.5">
                              {group.suppliers.map((supplier, index) => (
                                <p key={supplier.id || index}>
                                  {index + 1}. {supplier.tradeName || supplier.companyName}
                                </p>
                              ))}
                            </div>
                            {/* Observação Fornecedores */}
                            {(() => {
                              const note = findNote(supplierNotes.sections, group.procedureName, group.approachName);
                              if (!note) return null;
                              return (
                                <div className="mt-1">
                                  <p className="font-bold text-xs text-foreground">Observações:</p>
                                  <div className="text-xs text-muted-foreground pl-4">
                                    <MarkdownViewer content={note} className="prose-xs" />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Observações gerais */}
                    {cbhpmGeneral && (
                      <div className="mb-2">
                        <p className="font-bold text-xs text-foreground">Observações Gerais sobre Procedimentos:</p>
                        <div className="text-xs text-muted-foreground pl-4">
                          <MarkdownViewer content={cbhpmGeneral} className="prose-xs" />
                        </div>
                      </div>
                    )}
                    {opmeGeneral && (
                      <div className="mb-2">
                        <p className="font-bold text-xs text-foreground">Observações Gerais sobre Materiais:</p>
                        <div className="text-xs text-muted-foreground pl-4">
                          <MarkdownViewer content={opmeGeneral} className="prose-xs" />
                        </div>
                      </div>
                    )}
                    {supplierGeneral && (
                      <div className="mb-2">
                        <p className="font-bold text-xs text-foreground">Observações Gerais sobre Fornecedores:</p>
                        <div className="text-xs text-muted-foreground pl-4">
                          <MarkdownViewer content={supplierGeneral} className="prose-xs" />
                        </div>
                      </div>
                    )}

                    {/* Seção de assinatura */}
                    <div className="mt-8 mb-4">
                      {/* Data */}
                      <div className="text-right mb-6">
                        <p className="text-xs text-muted-foreground">
                          {selectedHospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {/* Assinatura do médico */}
                      <div className="flex justify-center relative mb-0">
                        {user?.signatureUrl && (
                          <img 
                            src={user.signatureUrl} 
                            alt="Assinatura do Médico" 
                            className="object-contain relative z-0"
                            style={{ maxWidth: '240px', maxHeight: '120px', marginBottom: '-10px' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPreview;
