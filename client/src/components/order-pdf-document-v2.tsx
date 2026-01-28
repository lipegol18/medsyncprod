import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

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

export interface OrderPDFDocumentV2Props {
  orderId?: number;
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
  forcedPageBreaks?: string[];
}

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
  ]
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 95,
    paddingBottom: 55,
    paddingHorizontal: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
  },
  fixedHeader: {
    position: 'absolute',
    top: 15,
    left: 20,
    right: 20,
    height: 80,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hospitalLogo: {
    width: 80,
    height: 60,
    objectFit: 'contain',
  },
  doctorLogo: {
    width: 192,
    height: 144,
    objectFit: 'contain',
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    height: 40,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
  },
  pageNumber: {
    fontSize: 8,
    color: '#6b7280',
  },
  patientSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  patientTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    color: '#1f2937',
  },
  patientGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  patientColumn: {
    flex: 1,
  },
  patientRow: {
    marginBottom: 2,
  },
  patientLabel: {
    fontWeight: 'bold',
    color: '#334155',
  },
  patientValue: {
    color: '#334155',
  },
  mainTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#1e3a8a',
    marginBottom: 10,
    paddingBottom: 5,
  },
  justificationText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.4,
    textAlign: 'justify',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  procedureInfoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 20,
    paddingHorizontal: 5,
  },
  procedureInfoColumn: {
    flex: 1,
  },
  procedureInfoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  procedureInfoValue: {
    fontSize: 9,
    color: '#1f2937',
    paddingLeft: 16,
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2ca8e0',
    marginBottom: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
  },
  groupHeaderFirst: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2ca8e0',
    marginBottom: 8,
  },
  sectionContainer: {
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  sectionContent: {
    paddingLeft: 16,
  },
  sectionItem: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  observationTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 4,
  },
  observationText: {
    fontSize: 9,
    color: '#1f2937',
    lineHeight: 1.4,
    paddingLeft: 16,
  },
  signatureSection: {
    marginTop: 30,
  },
  dateText: {
    fontSize: 9,
    color: '#1f2937',
    textAlign: 'right',
    marginBottom: 25,
  },
  signatureContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  signatureImage: {
    width: 240,
    height: 120,
    objectFit: 'contain',
    marginBottom: -20,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#6b7280',
    width: 150,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
    textAlign: 'center',
  },
  doctorInfo: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
});

const formatDateBR = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

const parsePorteValue = (porte: string | null | undefined): number => {
  if (!porte) return 0;
  const match = porte.match(/^(\d+)([A-Za-z]?)$/);
  if (!match) return 0;
  const numero = parseInt(match[1], 10);
  const letra = match[2]?.toUpperCase() || 'A';
  return (numero * 100) + (letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
};

const parseMarkdownToPdf = (text: string): { type: 'text' | 'listItem'; segments: { text: string; bold?: boolean; italic?: boolean }[] }[] => {
  const lines = text.split('\n');
  return lines.filter(line => line.trim()).map(line => {
    const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ');
    const cleanLine = isListItem ? line.trim().replace(/^[-•*]\s*/, '') : line;
    const segments: { text: string; bold?: boolean; italic?: boolean }[] = [];
    const boldItalicRegex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match;
    while ((match = boldItalicRegex.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: cleanLine.slice(lastIndex, match.index) });
      }
      if (match[1]) segments.push({ text: match[1], bold: true, italic: true });
      else if (match[2]) segments.push({ text: match[2], bold: true });
      else if (match[3]) segments.push({ text: match[3], italic: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < cleanLine.length) {
      segments.push({ text: cleanLine.slice(lastIndex) });
    }
    if (segments.length === 0) segments.push({ text: cleanLine });
    return { type: isListItem ? 'listItem' : 'text', segments };
  });
};

export function OrderPDFDocumentV2({
  orderId,
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
  forcedPageBreaks = [],
}: OrderPDFDocumentV2Props) {

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

    const entries = Array.from(groups.entries());
    const generalEntry = entries.find(([key]) => key === 'general');
    const otherEntries = entries.filter(([key]) => key !== 'general');
    return generalEntry ? [...otherEntries, generalEntry] : otherEntries;
  };

  const parseNotesBySubtitle = (notes: string | undefined | null) => {
    const sections = new Map<string, string>();
    let general = '';
    if (!notes) return { sections, general };
    
    const lines = notes.split('\n');
    let currentKey: string | null = null;
    let currentContent: string[] = [];
    
    lines.forEach(line => {
      const subtitleMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*$/);
      if (subtitleMatch) {
        if (currentKey && currentContent.length > 0) {
          sections.set(currentKey, currentContent.join('\n').trim());
        } else if (!currentKey && currentContent.length > 0) {
          general = currentContent.join('\n').trim();
        }
        currentKey = `name:${subtitleMatch[1].trim()}-${subtitleMatch[2].trim()}`;
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line);
      }
    });
    
    if (currentKey && currentContent.length > 0) {
      sections.set(currentKey, currentContent.join('\n').trim());
    } else if (!currentKey && currentContent.length > 0) {
      general = currentContent.join('\n').trim();
    }
    
    return { sections, general };
  };

  const groupedItems = groupItemsByApproach();
  const hasMultipleGroups = groupedItems.length > 1 || (groupedItems.length === 1 && groupedItems[0][0] !== 'general');
  const cbhpmNotes = parseNotesBySubtitle(cbhpmAdditionalNotes);
  const opmeNotes = parseNotesBySubtitle(opmeAdditionalNotes);
  const supplierNotes = parseNotesBySubtitle(supplierAdditionalNotes);
  const forcedBreaksSet = new Set(forcedPageBreaks);

  const shouldBreakBefore = (blockId: string) => forcedBreaksSet.has(blockId);

  const getProcedureTypeLabel = () => {
    if (procedureType === 'eletiva') return 'Eletivo';
    if (procedureType === 'urgencia') return 'Urgência';
    if (procedureType === 'emergencia') return 'Emergência';
    return '';
  };

  const getLateralityLabel = () => {
    if (procedureLaterality === 'direito') return 'Direito';
    if (procedureLaterality === 'esquerdo') return 'Esquerdo';
    if (procedureLaterality === 'bilateral') return 'Bilateral';
    if (procedureLaterality === 'nao_se_aplica') return 'Não se aplica';
    return '';
  };

  const PageHeader = () => (
    <View style={styles.fixedHeader} fixed>
      {selectedHospital?.logoUrl ? (
        <Image style={styles.hospitalLogo} src={selectedHospital.logoUrl} />
      ) : (
        <View style={{ width: 80 }} />
      )}
      {user?.logoUrl ? (
        <Image style={styles.doctorLogo} src={user.logoUrl} />
      ) : (
        <View style={{ width: 160 }} />
      )}
    </View>
  );

  const PageFooter = () => (
    <View style={styles.fixedFooter} fixed>
      <Text style={styles.footerText}>
        Pedido #{orderId} - Gerado em {new Date().toLocaleDateString('pt-BR')}
      </Text>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  );

  const renderObservation = (note: string | undefined) => {
    if (!note) return null;
    const parsed = parseMarkdownToPdf(note);
    return (
      <View style={{ marginTop: 4 }}>
        <Text style={styles.observationTitle}>Observações:</Text>
        <View style={{ paddingLeft: 16 }}>
          {parsed.map((line, idx) => (
            <Text key={idx} style={styles.sectionItem}>
              {line.type === 'listItem' ? '• ' : ''}
              {line.segments.map((seg, sIdx) => {
                if (seg.bold && seg.italic) return <Text key={sIdx} style={[styles.bold, styles.italic]}>{seg.text}</Text>;
                if (seg.bold) return <Text key={sIdx} style={styles.bold}>{seg.text}</Text>;
                if (seg.italic) return <Text key={sIdx} style={styles.italic}>{seg.text}</Text>;
                return <Text key={sIdx}>{seg.text}</Text>;
              })}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <PageFooter />

        {selectedPatient && (
          <View style={styles.patientSection} wrap={false}>
            <Text style={styles.patientTitle}>Dados do Paciente</Text>
            <View style={styles.patientGrid}>
              <View style={styles.patientColumn}>
                <View style={styles.patientRow}>
                  <Text><Text style={styles.patientLabel}>Nome: </Text><Text style={styles.patientValue}>{selectedPatient.fullName}</Text></Text>
                </View>
                <View style={styles.patientRow}>
                  <Text><Text style={styles.patientLabel}>Data de Nascimento: </Text><Text style={styles.patientValue}>{formatDateBR(selectedPatient.birthDate)}</Text></Text>
                </View>
                <View style={styles.patientRow}>
                  <Text><Text style={styles.patientLabel}>Idade: </Text><Text style={styles.patientValue}>{new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} anos</Text></Text>
                </View>
              </View>
              <View style={styles.patientColumn}>
                <View style={styles.patientRow}>
                  <Text><Text style={styles.patientLabel}>Plano de Saúde: </Text><Text style={styles.patientValue}>{selectedPatient.insurance || ''}</Text></Text>
                </View>
                <View style={styles.patientRow}>
                  <Text><Text style={styles.patientLabel}>Número da Carteirinha: </Text><Text style={styles.patientValue}>{selectedPatient.insuranceNumber || ''}</Text></Text>
                </View>
                <View style={styles.patientRow}>
                  <Text><Text style={styles.patientLabel}>Tipo do Plano: </Text><Text style={styles.patientValue}>{selectedPatient.plan || ''}</Text></Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.mainTitle} break={shouldBreakBefore('title')}>
          SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
        </Text>

        {clinicalJustification && (() => {
          const referencesPattern = /^(REFERÊNCIAS BIBLIOGRÁFICAS|REFERÊNCIAS|REFERENCIAS|BIBLIOGRAFIA|REFERENCES):\s*$/im;
          const parts = clinicalJustification.split(referencesPattern);
          const mainText = parts[0] || "";
          const referencesSection = parts.length > 2 ? parts[2] : (parts.length > 1 ? parts[1] : "");
          const hasReferences = referencesPattern.test(clinicalJustification);
          
          const paragraphs = mainText
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
          
          return (
            <>
              <Text 
                style={{ fontSize: 10, fontWeight: 'bold', color: '#374151', marginBottom: 6 }}
                break={shouldBreakBefore('justification-header')}
              >
                INDICAÇÃO CLÍNICA:
              </Text>
              
              {paragraphs.map((paragraph, index) => (
                <View 
                  key={index} 
                  style={{ marginBottom: 8 }}
                  break={shouldBreakBefore(`justification-paragraph-${index}`)}
                >
                  {parseMarkdownToPdf(paragraph).map((line, idx) => (
                    <Text key={idx} style={styles.justificationText}>
                      {line.type === 'listItem' ? '• ' : ''}
                      {line.segments.map((seg, sIdx) => {
                        if (seg.bold && seg.italic) return <Text key={sIdx} style={[styles.bold, styles.italic]}>{seg.text}</Text>;
                        if (seg.bold) return <Text key={sIdx} style={styles.bold}>{seg.text}</Text>;
                        if (seg.italic) return <Text key={sIdx} style={styles.italic}>{seg.text}</Text>;
                        return <Text key={sIdx}>{seg.text}</Text>;
                      })}
                    </Text>
                  ))}
                </View>
              ))}
              
              {hasReferences && referencesSection.trim() && (
                <View 
                  style={{ marginBottom: 8 }}
                  break={shouldBreakBefore('justification-references')}
                >
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#374151', marginBottom: 4 }}>
                    REFERÊNCIAS BIBLIOGRÁFICAS:
                  </Text>
                  {referencesSection.split('\n').filter(l => l.trim()).map((ref, idx) => (
                    <Text key={idx} style={{ fontSize: 8, color: '#4b5563', marginBottom: 2, paddingLeft: 10 }}>
                      {ref.trim()}
                    </Text>
                  ))}
                </View>
              )}
            </>
          );
        })()}

        <View style={styles.procedureInfoRow} break={shouldBreakBefore('procedure-info')}>
          <View style={styles.procedureInfoColumn}>
            <Text style={styles.procedureInfoLabel}>Caráter do Procedimento:</Text>
            <Text style={styles.procedureInfoValue}>{getProcedureTypeLabel()}</Text>
          </View>
          <View style={styles.procedureInfoColumn}>
            <Text style={styles.procedureInfoLabel}>Lateralidade do Procedimento:</Text>
            <Text style={styles.procedureInfoValue}>{getLateralityLabel()}</Text>
          </View>
        </View>

        {groupedItems.map(([key, group], groupIndex) => {
          const cbhpmNote = cbhpmNotes.sections.get(`name:${group.procedureName}-${group.approachName}`);
          const opmeNote = opmeNotes.sections.get(`name:${group.procedureName}-${group.approachName}`);
          const supplierNote = supplierNotes.sections.get(`name:${group.procedureName}-${group.approachName}`);
          const sortedProcs = [...group.cbhpmProcedures].sort(
            (a, b) => parsePorteValue(b.procedure?.porte) - parsePorteValue(a.procedure?.porte)
          );

          return (
            <View key={key}>
              {hasMultipleGroups && group.approachId && (
                <Text 
                  style={groupIndex > 0 ? styles.groupHeader : styles.groupHeaderFirst}
                  break={shouldBreakBefore(`group-header-${key}`)}
                >
                  {group.procedureName} → {group.approachName}
                </Text>
              )}

              {group.cids.length > 0 && (
                <View style={styles.sectionContainer} wrap={false} break={shouldBreakBefore(`cids-${key}`)}>
                  <Text style={styles.sectionTitle}>Códigos CID-10:</Text>
                  <View style={styles.sectionContent}>
                    {group.cids.map((cidItem, idx) => (
                      <Text key={idx} style={styles.sectionItem}>
                        {cidItem.cid?.code} - {cidItem.cid?.description}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {sortedProcs.length > 0 && (
                <View style={styles.sectionContainer} wrap={false} break={shouldBreakBefore(`cbhpm-${key}`)}>
                  <Text style={styles.sectionTitle}>Procedimentos Cirúrgicos Necessários:</Text>
                  <View style={styles.sectionContent}>
                    {sortedProcs.map((proc, idx) => (
                      <Text key={idx} style={styles.sectionItem}>
                        {proc.quantity} x {proc.procedure?.code} - {proc.procedure?.name}
                        {idx === 0 && sortedProcs.length > 1 ? ' (Principal)' : ''}
                      </Text>
                    ))}
                  </View>
                  {renderObservation(cbhpmNote)}
                </View>
              )}

              {group.opmeItems.length > 0 && (
                <View style={styles.sectionContainer} wrap={false} break={shouldBreakBefore(`opme-${key}`)}>
                  <Text style={styles.sectionTitle}>Lista de Materiais Necessários:</Text>
                  <View style={styles.sectionContent}>
                    {group.opmeItems.map((item, idx) => (
                      <Text key={idx} style={styles.sectionItem}>
                        {item.quantity} x {item.technicalName || item.item?.technicalName || 'Material não especificado'}
                      </Text>
                    ))}
                  </View>
                  {renderObservation(opmeNote)}
                </View>
              )}

              {group.suppliers.length > 0 && (
                <View style={styles.sectionContainer} wrap={false} break={shouldBreakBefore(`suppliers-${key}`)}>
                  <Text style={styles.sectionTitle}>Fornecedores:</Text>
                  <View style={styles.sectionContent}>
                    {group.suppliers.map((supplier, idx) => (
                      <Text key={idx} style={styles.sectionItem}>
                        {idx + 1}. {supplier.tradeName || supplier.companyName}
                      </Text>
                    ))}
                  </View>
                  {renderObservation(supplierNote)}
                </View>
              )}
            </View>
          );
        })}

        {(cbhpmNotes.general || opmeNotes.general || supplierNotes.general) && (
          <View style={styles.sectionContainer} break={shouldBreakBefore('general-notes')}>
            {cbhpmNotes.general && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Observações Gerais sobre Procedimentos:</Text>
                {renderObservation(cbhpmNotes.general)}
              </View>
            )}
            {opmeNotes.general && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Observações Gerais sobre Materiais:</Text>
                {renderObservation(opmeNotes.general)}
              </View>
            )}
            {supplierNotes.general && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Observações Gerais sobre Fornecedores:</Text>
                {renderObservation(supplierNotes.general)}
              </View>
            )}
          </View>
        )}

        <View style={styles.signatureSection} wrap={false} break={shouldBreakBefore('signature')}>
          <Text style={styles.dateText}>
            {selectedHospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
          </Text>
          <View style={styles.signatureContainer}>
            {user?.signatureUrl && (
              <Image style={styles.signatureImage} src={user.signatureUrl} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.doctorName}>{user?.name?.toUpperCase()}</Text>
            {user?.signatureNote ? (
              user.signatureNote.split('\n').map((line, idx) => (
                <Text key={idx} style={styles.doctorInfo}>{line}</Text>
              ))
            ) : (
              <Text style={styles.doctorInfo}>ORTOPEDIA E TRAUMATOLOGIA</Text>
            )}
            <Text style={styles.doctorInfo}>CRM {user?.crm}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
