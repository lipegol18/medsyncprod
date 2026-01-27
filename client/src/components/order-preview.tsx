import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, RotateCcw } from 'lucide-react';
import { MarkdownViewer } from '@/components/markdown-editor';
import MedSyncLogo from '../assets/medsync-logo-new.svg';

export interface PageBreakInfo {
  originalPosition: number;
  adjustedPosition: number;
}

const PAGE_HEIGHT_PX = 962;
const MIN_PAGE_CONTENT = 200;

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

interface OpmeItemWithAssociation {
  item?: {
    id: number;
    technicalName: string;
    commercialName?: string | null;
    anvisaCode?: string | null;
    anvisaRegistrationNumber?: string | null;
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

interface Patient {
  id: number;
  fullName: string;
  birthDate: string;
  cpf?: string | null;
  insurance?: string | null;
  insuranceNumber?: string | null;
  plan?: string | null;
}

interface Hospital {
  id: number;
  name: string;
  logoUrl?: string | null;
}

interface User {
  id: number;
  name?: string;
  crm?: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatureNote?: string | null;
}

export interface OrderPreviewProps {
  selectedPatient: Patient | null;
  selectedHospital: Hospital | null;
  user: User | null;
  clinicalJustification: string;
  procedureType: string;
  procedureLaterality: string;
  multipleCids: CidItemWithAssociation[];
  secondaryProcedures: SecondaryProcedure[];
  selectedOpmeItems: OpmeItemWithAssociation[];
  supplierDetails: SupplierDetail[];
  cbhpmAdditionalNotes?: string;
  opmeAdditionalNotes?: string;
  supplierAdditionalNotes?: string;
  onPageBreaksChange?: (breaks: PageBreakInfo[]) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  previewRef?: React.RefObject<HTMLDivElement>;
}

const formatDateBR = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const calculateAge = (birthDate: string | null | undefined): string => {
  if (!birthDate) return '';
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} anos`;
  } catch {
    return '';
  }
};

const parsePorteValue = (porte: any): number => {
  if (!porte || typeof porte !== 'string') return 0;
  const match = porte.match(/^(\d+)([A-Za-z]?)$/);
  if (!match) return 0;
  const numero = parseInt(match[1], 10);
  const letra = match[2]?.toUpperCase() || 'A';
  const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
  return (numero * 100) + valorLetra;
};

const parseNotesBySubtitle = (notes: string | undefined | null) => {
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
        const content = currentContent.join('\n').trim();
        saveContent(currentKey, content);
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
    const content = currentContent.join('\n').trim();
    saveContent(currentKey, content);
  } else if (currentContent.length > 0) {
    generalContent = [...generalContent, ...currentContent];
  }
  
  return { general: generalContent.join('\n').trim(), sections };
};

const findNote = (
  sections: Map<string, string>,
  procedureName: string,
  approachName: string
): string | undefined => {
  const nameKey = `name:${procedureName}-${approachName}`;
  return sections.get(nameKey);
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
}: OrderPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [pageBreaks, setPageBreaks] = useState<PageBreakInfo[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [totalHeight, setTotalHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setTotalHeight(height);
      
      // Encontrar todos os blocos pelo atributo data-block-type
      const blocks = contentRef.current.querySelectorAll('[data-block-type]');
      const blockPositions: { type: string; top: number; bottom: number; height: number }[] = [];
      
      blocks.forEach((block) => {
        const rect = block.getBoundingClientRect();
        const containerRect = contentRef.current!.getBoundingClientRect();
        const top = rect.top - containerRect.top;
        const bottom = rect.bottom - containerRect.top;
        blockPositions.push({
          type: block.getAttribute('data-block-type') || 'unknown',
          top,
          bottom,
          height: bottom - top
        });
      });
      
      const numPages = Math.ceil(height / PAGE_HEIGHT_PX);
      const breaks: PageBreakInfo[] = [];
      
      for (let i = 1; i < numPages; i++) {
        let idealPos = i * PAGE_HEIGHT_PX;
        
        // Verificar se a quebra cairia no meio de algum bloco
        const blockAtPosition = blockPositions.find(
          block => block.top < idealPos && block.bottom > idealPos
        );
        
        if (blockAtPosition) {
          // Se o bloco for pequeno o suficiente para caber na página anterior, mover para antes
          const spaceOnPrevPage = idealPos - (breaks[i - 2]?.adjustedPosition || 0);
          const blockFitsOnPrevPage = blockAtPosition.height < spaceOnPrevPage - MIN_PAGE_CONTENT;
          
          if (blockAtPosition.top > MIN_PAGE_CONTENT && !blockFitsOnPrevPage) {
            // Mover a quebra para antes do bloco
            idealPos = blockAtPosition.top - 5; // 5px de margem
          } else if (blockAtPosition.bottom < height - MIN_PAGE_CONTENT) {
            // Se o bloco é muito grande, mover para depois dele
            idealPos = blockAtPosition.bottom + 5;
          }
        }
        
        // Garantir espaçamento mínimo entre quebras
        const prevBreakPos = breaks[i - 2]?.adjustedPosition || 0;
        if (idealPos - prevBreakPos < MIN_PAGE_CONTENT) {
          idealPos = prevBreakPos + MIN_PAGE_CONTENT;
        }
        
        breaks.push({ originalPosition: i * PAGE_HEIGHT_PX, adjustedPosition: idealPos });
      }
      
      setPageBreaks(breaks);
    }
  }, [clinicalJustification, multipleCids, secondaryProcedures, selectedOpmeItems, supplierDetails]);

  useEffect(() => {
    if (onPageBreaksChange) {
      onPageBreaksChange(pageBreaks);
    }
  }, [pageBreaks, onPageBreaksChange]);

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
  }, []);

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop;
      let newY = e.clientY - rect.top + scrollTop;
      
      const prevBreak = draggingIndex > 0 ? pageBreaks[draggingIndex - 1].adjustedPosition : 0;
      const nextBreak = draggingIndex < pageBreaks.length - 1 
        ? pageBreaks[draggingIndex + 1].adjustedPosition 
        : totalHeight;
      
      newY = Math.max(prevBreak + MIN_PAGE_CONTENT, Math.min(nextBreak - MIN_PAGE_CONTENT, newY));
      
      setPageBreaks(prev => prev.map((b, i) => 
        i === draggingIndex ? { ...b, adjustedPosition: newY } : b
      ));
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, pageBreaks, totalHeight]);

  const resetPageBreaks = () => {
    setPageBreaks(prev => prev.map(b => ({ ...b, adjustedPosition: b.originalPosition })));
  };

  const hasAdjustedBreaks = pageBreaks.some(b => b.adjustedPosition !== b.originalPosition);

  const cbhpmNotes = parseNotesBySubtitle(cbhpmAdditionalNotes);
  const opmeNotes = parseNotesBySubtitle(opmeAdditionalNotes);
  const supplierNotes = parseNotesBySubtitle(supplierAdditionalNotes);

  const groupItemsByApproach = () => {
    const groups: Map<string, {
      procedureId: number | null;
      procedureName: string;
      approachId: number | null;
      approachName: string;
      cids: CidItemWithAssociation[];
      cbhpmProcedures: SecondaryProcedure[];
      opmeItemsList: OpmeItemWithAssociation[];
      suppliers: SupplierDetail[];
    }> = new Map();

    if (multipleCids && multipleCids.length > 0) {
      multipleCids.forEach((cidItem) => {
        const cid = cidItem.cid || cidItem;
        const approach = cidItem.surgicalApproach || (cid as any)?.surgicalApproach;
        const approachId = approach?.id || cidItem.sourceApproachId || (cid as any)?.sourceApproachId || null;
        const approachName = approach?.name || (cidItem as any).sourceApproachName || (cid as any)?.sourceApproachName || 'Itens Gerais';
        const procedure = cidItem.surgicalProcedure || (cid as any)?.surgicalProcedure;
        const procedureId = procedure?.id || cidItem.sourceProcedureId || (cid as any)?.sourceProcedureId || null;
        const procedureName = procedure?.name || (cidItem as any).sourceProcedureName || (cid as any)?.sourceProcedureName || '';
        const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
        
        if (!groups.has(key)) {
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItemsList: [], suppliers: [] });
        }
        groups.get(key)!.cids.push(cidItem);
      });
    }

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
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItemsList: [], suppliers: [] });
        }
        groups.get(key)!.cbhpmProcedures.push(proc);
      });
    }

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
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItemsList: [], suppliers: [] });
        }
        groups.get(key)!.opmeItemsList.push(opmeItem);
      });
    }

    if (supplierDetails && supplierDetails.length > 0) {
      supplierDetails.forEach((supplier) => {
        const approachId = supplier.sourceApproachId || null;
        const approachName = supplier.sourceApproachName || 'Itens Gerais';
        const procedureId = supplier.sourceProcedureId || null;
        const procedureName = supplier.sourceProcedureName || '';
        const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
        
        if (!groups.has(key)) {
          groups.set(key, { procedureId, procedureName, approachId, approachName, cids: [], cbhpmProcedures: [], opmeItemsList: [], suppliers: [] });
        }
        groups.get(key)!.suppliers.push(supplier);
      });
    }

    const entries = Array.from(groups.entries());
    const generalEntry = entries.find(([key]) => key === 'general');
    const otherEntries = entries.filter(([key]) => key !== 'general');
    return generalEntry ? [...otherEntries, generalEntry] : otherEntries;
  };

  const groupedItems = groupItemsByApproach();
  const hasMultipleGroups = groupedItems.length > 1 || (groupedItems.length === 1 && groupedItems[0][0] !== 'general');

  const renderCidsSection = (cids: CidItemWithAssociation[]) => (
    <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
      <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        Códigos CID-10:
      </p>
      <div style={{ paddingLeft: '15px' }}>
        {cids.map((cidItem, index) => {
          const cid = cidItem.cid || cidItem;
          return (
            <p key={index} style={{ fontSize: '9pt', color: '#1f2937', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {cid?.code} - {cid?.description}
            </p>
          );
        })}
      </div>
    </div>
  );

  const renderProceduresSection = (procs: SecondaryProcedure[], procedureName: string, approachName: string) => {
    const cbhpmNote = findNote(cbhpmNotes.sections, procedureName, approachName);
    const sortedProcs = [...procs].sort((a, b) => parsePorteValue(b.procedure?.porte) - parsePorteValue(a.procedure?.porte));
    
    return (
      <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
        <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Procedimentos Cirúrgicos Necessários:
        </p>
        <div style={{ paddingLeft: '15px' }}>
          {sortedProcs.map((proc, index) => (
            <p key={index} style={{ fontSize: '9pt', color: '#1f2937', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {proc.quantity} x {proc.procedure?.code} - {proc.procedure?.name}
              {index === 0 && sortedProcs.length > 1 ? ' (Principal)' : ''}
            </p>
          ))}
        </div>
        {cbhpmNote && (
          <div style={{ marginTop: '4px' }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '2px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Observações:
            </p>
            <div style={{ paddingLeft: '15px', fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <MarkdownViewer content={cbhpmNote} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOpmeSection = (opmeList: OpmeItemWithAssociation[], procedureName: string, approachName: string) => {
    const opmeNote = findNote(opmeNotes.sections, procedureName, approachName);
    
    return (
      <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
        <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Lista de Materiais Necessários:
        </p>
        <div style={{ paddingLeft: '15px' }}>
          {opmeList.map((opmeItem, index) => {
            const item = opmeItem.item || opmeItem;
            return (
              <p key={index} style={{ fontSize: '9pt', color: '#1f2937', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {opmeItem.quantity} x {(item as any).technicalName || (item as any).commercialName || 'Material não especificado'}
                {(item as any).anvisaRegistrationNumber && ` (ANVISA: ${(item as any).anvisaRegistrationNumber})`}
              </p>
            );
          })}
        </div>
        {opmeNote && (
          <div style={{ marginTop: '4px' }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '2px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Observações:
            </p>
            <div style={{ paddingLeft: '15px', fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <MarkdownViewer content={opmeNote} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSuppliersSection = (suppliers: SupplierDetail[], procedureName: string, approachName: string) => {
    const supplierNote = findNote(supplierNotes.sections, procedureName, approachName);
    
    return (
      <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
        <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Fornecedores:
        </p>
        <div style={{ paddingLeft: '15px' }}>
          {suppliers.map((supplier, index) => (
            <p key={index} style={{ fontSize: '9pt', color: '#1f2937', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {index + 1}. {supplier.tradeName || supplier.companyName}
            </p>
          ))}
        </div>
        {supplierNote && (
          <div style={{ marginTop: '4px' }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '2px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Observações:
            </p>
            <div style={{ paddingLeft: '15px', fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <MarkdownViewer content={supplierNote} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Instrução e botão de reset */}
      {pageBreaks.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-2">
          <p className="text-sm text-gray-500 italic">
            Arraste as linhas para ajustar as quebras de página
          </p>
          {hasAdjustedBreaks && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetPageBreaks}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Resetar
            </Button>
          )}
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow-lg overflow-auto max-h-[800px] relative"
        style={{ 
          width: '210mm',
          margin: '0 auto',
          fontFamily: 'Helvetica, Arial, sans-serif'
        }}
      >
        {/* Linhas de quebra de página arrastáveis */}
        {pageBreaks.map((pageBreak, index) => (
          <div
            key={index}
            className={`absolute left-0 right-0 z-20 cursor-ns-resize group transition-colors ${
              draggingIndex === index 
                ? 'bg-blue-100' 
                : pageBreak.adjustedPosition !== pageBreak.originalPosition 
                  ? 'hover:bg-amber-50' 
                  : 'hover:bg-gray-50'
            }`}
            style={{
              top: `${pageBreak.adjustedPosition}px`,
              height: '24px',
              marginTop: '-12px',
            }}
            onMouseDown={(e) => handleMouseDown(index, e)}
          >
            <div 
              className={`absolute left-0 right-0 top-1/2 border-t-2 border-dashed transition-colors ${
                draggingIndex === index 
                  ? 'border-blue-500' 
                  : pageBreak.adjustedPosition !== pageBreak.originalPosition 
                    ? 'border-amber-500' 
                    : 'border-gray-400'
              }`}
            />
            <div 
              className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                draggingIndex === index 
                  ? 'bg-blue-500 text-white' 
                  : pageBreak.adjustedPosition !== pageBreak.originalPosition 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-500 text-white'
              }`}
            >
              <GripVertical className="h-3 w-3" />
              Página {index + 1}
            </div>
          </div>
        ))}
        
        <div ref={contentRef} style={{ padding: '20px 20px 15px 20px' }}>
        {/* BLOCO 1: HEADER - Logos (hospital esquerda, médico direita) */}
        <div 
          data-block-type="header"
          data-block-index="0"
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          <div style={{ width: '80px', height: '60px' }}>
            {selectedHospital?.logoUrl && (
              <img 
                src={selectedHospital.logoUrl} 
                alt="Logo Hospital" 
                style={{ width: '80px', height: '60px', objectFit: 'contain' }}
              />
            )}
          </div>
          <div style={{ width: '160px', height: '120px', display: 'flex', justifyContent: 'flex-end' }}>
            {user?.logoUrl && (
              <img 
                src={user.logoUrl} 
                alt="Logo Médico" 
                style={{ width: '160px', height: '120px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>

        {/* BLOCO 2: DADOS DO PACIENTE */}
        {selectedPatient && (
          <div 
            data-block-type="patient"
            data-block-index="1"
            style={{ 
              backgroundColor: '#f8fafc', 
              padding: '12px', 
              marginBottom: '15px', 
              borderRadius: '4px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12pt', fontWeight: 'bold', color: '#1f2937', marginBottom: '5px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Dados do Paciente
              </p>
              <div style={{ borderBottom: '1px solid #d1d5db', marginBottom: '10px' }} />
            </div>
            
            <p style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {selectedPatient.fullName}
            </p>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <strong>CPF:</strong> {formatCPF(selectedPatient.cpf)}
                </p>
                <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <strong>Data de Nascimento:</strong> {formatDateBR(selectedPatient.birthDate)}
                </p>
                <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <strong>Idade:</strong> {calculateAge(selectedPatient.birthDate)}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <strong>Plano de Saúde:</strong> {selectedPatient.insurance || ''}
                </p>
                <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <strong>Número da Carteirinha:</strong> {selectedPatient.insuranceNumber || ''}
                </p>
                <p style={{ fontSize: '9pt', color: '#334155', marginBottom: '2px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <strong>Tipo do Plano:</strong> {selectedPatient.plan || ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BLOCO 3: TÍTULO DO DOCUMENTO */}
        <div
          data-block-type="title"
          data-block-index="2"
        >
          <h1 style={{ 
            fontSize: '13pt', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            color: '#1e3a8a', 
            marginBottom: '10px',
            textTransform: 'uppercase',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }}>
            SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
          </h1>
        </div>

        {/* BLOCO 4: JUSTIFICATIVA CLÍNICA */}
        <div 
          data-block-type="justification"
          data-block-index="3"
          style={{ marginBottom: '15px', paddingLeft: '8px', paddingRight: '8px' }}
        >
          {clinicalJustification ? (
            <div style={{ fontSize: '9pt', color: '#000000', textAlign: 'justify', lineHeight: '1.4', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <MarkdownViewer content={clinicalJustification} />
            </div>
          ) : (
            <p style={{ fontSize: '9pt', color: '#6b7280', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Justificativa clínica será exibida aqui
            </p>
          )}
        </div>

        {/* BLOCO 5: CARÁTER E LATERALIDADE */}
        <div 
          data-block-type="procedure-info"
          data-block-index="4"
          style={{ display: 'flex', gap: '20px', marginBottom: '12px', paddingLeft: '8px' }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Caráter do Procedimento:
            </p>
            <p style={{ fontSize: '9pt', color: '#1f2937', paddingLeft: '15px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {procedureType === 'eletiva' ? 'Eletivo' : 
               procedureType === 'urgencia' ? 'Urgência' : 
               procedureType === 'emergencia' ? 'Emergência' : ''}
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Lateralidade do Procedimento:
            </p>
            <p style={{ fontSize: '9pt', color: '#1f2937', paddingLeft: '15px', lineHeight: '1.3', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {procedureLaterality === 'direito' ? 'Direito' :
               procedureLaterality === 'esquerdo' ? 'Esquerdo' :
               procedureLaterality === 'bilateral' ? 'Bilateral' :
               procedureLaterality === 'nao_se_aplica' ? 'Não se aplica' : ''}
            </p>
          </div>
        </div>

        {/* BLOCO 6+: GRUPOS POR PROCEDIMENTO/CONDUTA */}
        {groupedItems.map(([key, group], groupIndex) => {
          const hasCids = group.cids.length > 0;
          const hasProcedures = group.cbhpmProcedures.length > 0;
          const hasOpme = group.opmeItemsList.length > 0;
          const hasSuppliers = group.suppliers.length > 0;
          const showHeader = hasMultipleGroups && group.approachId;

          return (
            <div 
              key={key}
              data-block-type="procedure-group"
              data-block-index={5 + groupIndex}
              style={groupIndex > 0 ? { marginTop: '10px', paddingTop: '8px', borderTop: '0.5px solid #e5e7eb' } : {}}
            >
              {showHeader && (
                <div style={{ marginBottom: '6px' }}>
                  <p style={{ fontSize: '12pt', fontWeight: 'bold', color: '#2ca8e0', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                    {group.procedureName} → {group.approachName}
                  </p>
                </div>
              )}

              {hasCids && renderCidsSection(group.cids)}
              {hasProcedures && renderProceduresSection(group.cbhpmProcedures, group.procedureName, group.approachName)}
              {hasOpme && renderOpmeSection(group.opmeItemsList, group.procedureName, group.approachName)}
              {hasSuppliers && renderSuppliersSection(group.suppliers, group.procedureName, group.approachName)}
            </div>
          );
        })}

        {/* BLOCO: OBSERVAÇÕES GERAIS */}
        {(cbhpmNotes.general || opmeNotes.general || supplierNotes.general) && (
          <div 
            data-block-type="general-notes"
            data-block-index={5 + groupedItems.length}
            style={{ marginTop: '15px' }}
          >
            {cbhpmNotes.general && (
              <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
                <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  Observações Gerais sobre Procedimentos:
                </p>
                <div style={{ paddingLeft: '15px', fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <MarkdownViewer content={cbhpmNotes.general} />
                </div>
              </div>
            )}
            {opmeNotes.general && (
              <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
                <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  Observações Gerais sobre Materiais:
                </p>
                <div style={{ paddingLeft: '15px', fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <MarkdownViewer content={opmeNotes.general} />
                </div>
              </div>
            )}
            {supplierNotes.general && (
              <div style={{ marginBottom: '12px', paddingLeft: '8px' }}>
                <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#374151', marginBottom: '4px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  Observações Gerais sobre Fornecedores:
                </p>
                <div style={{ paddingLeft: '15px', fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  <MarkdownViewer content={supplierNotes.general} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* BLOCO FINAL: SEÇÃO DE ASSINATURA */}
        <div 
          data-block-type="signature"
          data-block-index={6 + groupedItems.length}
          style={{ marginTop: '30px', marginBottom: '15px' }}
        >
          {/* Data */}
          <div style={{ textAlign: 'right', marginBottom: '25px' }}>
            <p style={{ fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {selectedHospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {formatDateBR(new Date().toISOString())}
            </p>
          </div>

          {/* Espaço para assinatura */}
          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '-15px' }}>
            {user?.signatureUrl && (
              <img 
                src={user.signatureUrl} 
                alt="Assinatura" 
                style={{ width: '240px', height: '120px', objectFit: 'contain', marginBottom: '-20px' }}
              />
            )}
          </div>

          {/* Dados do médico */}
          <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '0' }}>
            <div style={{ borderTop: '1px solid #6b7280', width: '150px', margin: '0 auto 4px' }} />
            <p style={{ fontSize: '9pt', fontWeight: 'bold', color: '#1f2937', marginBottom: '2px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {user?.name?.toUpperCase() || 'NOME DO MÉDICO'}
            </p>
            <p style={{ fontSize: '9pt', color: '#1f2937', marginBottom: '2px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              ORTOPEDIA E TRAUMATOLOGIA
            </p>
            <p style={{ fontSize: '9pt', color: '#1f2937', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              CRM {user?.crm || 'XXXX'}
            </p>
          </div>

          {/* Rodapé */}
          <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '4px', textAlign: 'center' }}>
            <p style={{ fontSize: '9pt', color: '#6b7280', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Documento gerado por MedSync v2.5.3
            </p>
          </div>
        </div>
        </div>

        {/* FOOTER FIXO */}
        <div style={{ 
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e0e0e0',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ fontSize: '8pt', color: '#6b7280', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Pedido # - Gerado em {formatDateBR(new Date().toISOString())}
          </p>
          <p style={{ fontSize: '8pt', color: '#6b7280', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Prévia do documento
          </p>
        </div>
      </div>
    </div>
  );
}

export default OrderPreview;
