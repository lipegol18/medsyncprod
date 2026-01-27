import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface MarkdownSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

interface MarkdownLine {
  type: 'paragraph' | 'heading' | 'listItem' | 'numberedListItem' | 'horizontalRule';
  segments: MarkdownSegment[];
  level?: number;
  number?: number;
}

export function parseMarkdownToPdf(markdown: string): MarkdownLine[] {
  if (!markdown) return [];
  
  const lines = markdown.split('\n');
  const result: MarkdownLine[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      result.push({ type: 'horizontalRule', segments: [] });
      continue;
    }
    
    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      result.push({ 
        type: 'heading', 
        level, 
        segments: parseInlineFormatting(content) 
      });
      continue;
    }
    
    const bulletListMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (bulletListMatch) {
      const content = bulletListMatch[1];
      result.push({ 
        type: 'listItem', 
        segments: parseInlineFormatting(content) 
      });
      continue;
    }
    
    const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedListMatch) {
      const num = parseInt(numberedListMatch[1], 10);
      const content = numberedListMatch[2];
      result.push({ 
        type: 'numberedListItem', 
        number: num,
        segments: parseInlineFormatting(content) 
      });
      continue;
    }
    
    result.push({ 
      type: 'paragraph', 
      segments: parseInlineFormatting(trimmedLine) 
    });
  }
  
  return result;
}

function parseInlineFormatting(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  
  let remaining = text;
  
  while (remaining.length > 0) {
    const boldItalic3Match = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (boldItalic3Match) {
      segments.push({ text: boldItalic3Match[1], bold: true, italic: true });
      remaining = remaining.slice(boldItalic3Match[0].length);
      continue;
    }
    
    const boldItalic3UnderMatch = remaining.match(/^___(.+?)___/);
    if (boldItalic3UnderMatch) {
      segments.push({ text: boldItalic3UnderMatch[1], bold: true, italic: true });
      remaining = remaining.slice(boldItalic3UnderMatch[0].length);
      continue;
    }
    
    const boldWithNestedItalicMatch = remaining.match(/^\*\*([^*]*?)_([^_]+?)_([^*]*?)\*\*/);
    if (boldWithNestedItalicMatch) {
      const before = boldWithNestedItalicMatch[1];
      const italicContent = boldWithNestedItalicMatch[2];
      const after = boldWithNestedItalicMatch[3];
      
      if (before) {
        segments.push({ text: before, bold: true });
      }
      segments.push({ text: italicContent, bold: true, italic: true });
      if (after) {
        segments.push({ text: after, bold: true });
      }
      remaining = remaining.slice(boldWithNestedItalicMatch[0].length);
      continue;
    }
    
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      segments.push({ text: boldMatch[1], bold: true });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    
    const boldUnderMatch = remaining.match(/^__(.+?)__/);
    if (boldUnderMatch) {
      segments.push({ text: boldUnderMatch[1], bold: true });
      remaining = remaining.slice(boldUnderMatch[0].length);
      continue;
    }
    
    const italicMatch = remaining.match(/^_([^_]+?)_/);
    if (italicMatch) {
      segments.push({ text: italicMatch[1], italic: true });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    
    const italicAsteriskMatch = remaining.match(/^\*([^*]+?)\*/);
    if (italicAsteriskMatch) {
      segments.push({ text: italicAsteriskMatch[1], italic: true });
      remaining = remaining.slice(italicAsteriskMatch[0].length);
      continue;
    }
    
    const nextSpecial = remaining.search(/\*\*\*|___|\*\*|__|\*|_/);
    if (nextSpecial === -1) {
      segments.push({ text: remaining });
      break;
    } else if (nextSpecial === 0) {
      segments.push({ text: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      segments.push({ text: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }
  
  if (segments.length === 0) {
    segments.push({ text });
  }
  
  return segments;
}

// Estilos para o PDF com suporte a múltiplas páginas
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingTop: 80, // Espaço para cabeçalho fixo
    paddingBottom: 60, // Espaço para rodapé fixo
    paddingHorizontal: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  // Cabeçalho fixo em todas as páginas
  fixedHeader: {
    position: 'absolute',
    top: 15,
    left: 20,
    right: 20,
    height: 80,
    backgroundColor: '#ffffff',
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  headerLogoLeft: {
    width: 80,
    height: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerLogoRight: {
    width: 160,
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hospitalLogo: {
    width: 80,
    height: 60,
    objectFit: 'contain',
  },
  doctorLogo: {
    width: 160,
    height: 120,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 80,
    height: 60,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  logoPlaceholderText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Rodapé fixo em todas as páginas
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
  logoContainer: {
    width: 100,
    height: 50,
    marginRight: 15,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2563eb',
    textAlign: 'center',
  },
  hospitalDetails: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.2,
    textAlign: 'center',
  },
  // Seção do paciente com título interno
  patientSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // Título da seção de dados do paciente (dentro da caixa)
  patientTitleSection: {
    marginBottom: 10,
  },
  patientTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  patientTitleLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginBottom: 10,
  },
  patientHeader: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },

  patientDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  patientColumn: {
    flex: 1,
  },
  patientInfoText: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  boldItalic: {
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  mdParagraph: {
    fontSize: 9,
    color: '#000000',
    textAlign: 'justify',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  mdHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 4,
    marginTop: 6,
  },
  mdListItem: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.4,
    marginBottom: 2,
    flexDirection: 'row',
  },
  mdBullet: {
    width: 12,
    fontSize: 9,
    color: '#000000',
  },
  mdListContent: {
    flex: 1,
  },
  mdHorizontalRule: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginVertical: 6,
  },
  // Título do documento (igual à prévia)
  documentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e3a8a',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  // Caixa de justificativa - SEM borda para permitir quebra de página natural
  justificationBox: {
    marginBottom: 15,
    paddingHorizontal: 8,
  },
  justificationText: {
    fontSize: 9,
    color: '#000000',
    textAlign: 'justify',
    lineHeight: 1.4,
  },
  // Seções clínicas (igual à prévia)
  clinicalSection: {
    marginBottom: 12,
    paddingLeft: 8, // Mesma indentação da justificativa
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  clinicalContent: {
    paddingLeft: 15,
    gap: 2,
  },
  clinicalText: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  autoAddedText: {
    fontSize: 8,
    color: '#059669',
    fontWeight: 'bold',
  },
  primaryText: {
    fontSize: 8,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  // Informações do procedimento (igual à prévia)
  procedureInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 20,
    paddingLeft: 8, // Mesma indentação da justificativa
  },
  procedureInfoColumn: {
    flex: 1,
  },
  procedureInfoText: {
    fontSize: 9,
    color: '#1f2937',
    paddingLeft: 15,
    lineHeight: 1.3,
  },
  // Seção de assinatura (igual à prévia)
  signatureSection: {
    marginTop: 30,
    marginBottom: 15,
  },
  dateSection: {
    alignItems: 'flex-end',
    marginBottom: 25,
  },
  dateText: {
    fontSize: 9,
    color: '#1f2937',
  },
  signatureSpace: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -15,
    zIndex: 2,
  },
  signaturePlaceholder: {
    fontSize: 9,
    color: '#6b7280',
  },
  signatureImage: {
    width: 240,
    height: 120,
    objectFit: 'contain',
    marginBottom: -20,
  },
  doctorInfo: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 0,
    zIndex: 1,
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
  },
  doctorSpecialty: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 2,
  },
  doctorCrm: {
    fontSize: 9,
    color: '#1f2937',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 4,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#6b7280',
  },
  // Seções que quebram automaticamente
  section: {
    marginBottom: 15,
    break: false, // Evita quebra desnecessária dentro da seção
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
    textTransform: 'uppercase',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.3,
  },
  // Justificativa com quebra automática
  justification: {
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: 'justify',
    color: '#000000',
    orphans: 3, // Mínimo de linhas no final da página
    widows: 3,  // Mínimo de linhas no início da página
  },
  // Tabelas com quebra automática
  table: {
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 8,
    break: false, // Evita quebra no meio da linha
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    paddingRight: 5,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    paddingRight: 5,
    color: '#374151',
  },
  pageNumber: {
    fontSize: 8,
    color: '#6b7280',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
  // Força quebra de página quando necessário
  pageBreak: {
    break: true,
  },
});

interface PageBreakConfig {
  sectionIndex?: number;
  justificationLineIndex?: number;
}

interface OrderPDFDocumentProps {
  orderData: any;
  patientData: any;
  hospitalData: any;
  procedureData: any;
  cidData: any;
  secondaryProcedures?: any[];
  opmeItems?: any[];
  suppliers?: any[];
  attachments?: any[];
  pageBreakPositions?: number[];
  pageBreakConfigs?: PageBreakConfig[];
  forcedPageBreaks?: string[]; // IDs dos blocos que devem iniciar nova página
}

export const OrderPDFDocument: React.FC<OrderPDFDocumentProps> = ({
  orderData,
  patientData,
  hospitalData,
  procedureData,
  cidData,
  secondaryProcedures = [],
  opmeItems = [],
  suppliers = [],
  attachments = [],
  pageBreakPositions = [],
  pageBreakConfigs = [],
  forcedPageBreaks = [],
}) => {
  const hasManualBreaks = pageBreakPositions.length > 0 || pageBreakConfigs.length > 0 || forcedPageBreaks.length > 0;
  
  const shouldBreakBefore = (sectionIndex: number): boolean => {
    if (pageBreakPositions.includes(sectionIndex)) return true;
    return pageBreakConfigs.some(c => c.sectionIndex === sectionIndex);
  };
  
  // Verificar se um bloco deve iniciar nova página baseado no ID
  const shouldBreakBeforeBlock = (blockId: string): boolean => {
    return forcedPageBreaks.includes(blockId);
  };
  
  const shouldBreakBeforeJustificationLine = (lineIndex: number): boolean => {
    return pageBreakConfigs.some(c => c.justificationLineIndex === lineIndex);
  };
  // Formatar data
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Formatar CPF
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Componente de cabeçalho reutilizável
  const PageHeader = () => (
    <View style={styles.fixedHeader} fixed>
      <View style={styles.headerRow}>
        {/* Logo do Hospital - Canto superior esquerdo */}
        <View style={styles.headerLogoLeft}>
          {hospitalData?.logoUrl && (
            <Image style={styles.hospitalLogo} src={hospitalData.logoUrl} />
          )}
        </View>

        {/* Espaço central vazio */}
        <View style={styles.headerCenter}>
          {/* Espaço vazio no centro */}
        </View>

        {/* Logo do Médico - Canto superior direito */}
        <View style={styles.headerLogoRight}>
          {orderData?.doctorLogoUrl && (
            <Image style={styles.doctorLogo} src={orderData.doctorLogoUrl} />
          )}
        </View>
      </View>
    </View>
  );

  // Componente de rodapé reutilizável
  const PageFooter = () => (
    <View style={styles.fixedFooter} fixed>
      <Text style={styles.footerText}>
        Pedido #{orderData?.id} - Gerado em {new Date().toLocaleDateString('pt-BR')}
      </Text>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PageHeader />
        <PageFooter />

        {/* Seção de Dados do Paciente - Bloco patient-data */}
        {patientData && (
          <View style={styles.patientSection} break={shouldBreakBefore(0) || shouldBreakBeforeBlock('patient-data')}>
            {/* Título "Dados do Paciente" com linha separatória dentro da caixa */}
            <View style={styles.patientTitleSection}>
              <Text style={styles.patientTitle}>Dados do Paciente</Text>
              <View style={styles.patientTitleLine} />
            </View>
            
            {/* Nome do paciente com fonte menor */}
            <View style={styles.patientHeader}>
              <Text style={styles.patientName}>{patientData.fullName}</Text>
            </View>
            
            {/* Informações organizadas em duas colunas */}
            <View style={styles.patientDetails}>
              <View style={styles.patientColumn}>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>CPF:</Text> {patientData.cpf ? formatCPF(patientData.cpf) : ''}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Data de Nascimento:</Text> {patientData.birthDate ? formatDate(patientData.birthDate) : ''}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Idade:</Text> {patientData.birthDate ? `${new Date().getFullYear() - new Date(patientData.birthDate).getFullYear()} anos` : ''}
                </Text>
              </View>
              <View style={styles.patientColumn}>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Plano de Saúde:</Text> {patientData.insurance || ''}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Número da Carteirinha:</Text> {patientData.insuranceNumber || ''}
                </Text>
                <Text style={styles.patientInfoText}>
                  <Text style={styles.bold}>Tipo do Plano:</Text> {patientData.plan || ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Título do documento - Bloco title */}
        <Text style={styles.documentTitle} break={shouldBreakBefore(1) || shouldBreakBeforeBlock('title')}>
          SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
        </Text>

        {/* Justificativa clínica com suporte a Markdown - Bloco justification */}
        <View style={styles.justificationBox} wrap={true} break={shouldBreakBefore(2) || shouldBreakBeforeBlock('justification')}>
          {orderData?.clinicalJustification ? (
            parseMarkdownToPdf(orderData.clinicalJustification).map((line, lineIndex) => {
              const shouldBreakHere = shouldBreakBeforeJustificationLine(lineIndex);
              
              const renderLineContent = () => {
                if (line.type === 'horizontalRule') {
                  return <View style={styles.mdHorizontalRule} />;
                }
                
                if (line.type === 'heading') {
                  return (
                    <Text style={styles.mdHeading}>
                      {line.segments.map((seg, segIndex) => {
                        if (seg.bold && seg.italic) {
                          return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                        }
                        if (seg.bold) {
                          return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                        }
                        if (seg.italic) {
                          return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                        }
                        return <Text key={segIndex}>{seg.text}</Text>;
                      })}
                    </Text>
                  );
                }
                
                if (line.type === 'listItem') {
                  return (
                    <View style={styles.mdListItem}>
                      <Text style={styles.mdBullet}>•</Text>
                      <Text style={styles.mdListContent}>
                        {line.segments.map((seg, segIndex) => {
                          if (seg.bold && seg.italic) {
                            return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                          }
                          if (seg.bold) {
                            return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                          }
                          if (seg.italic) {
                            return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                          }
                          return <Text key={segIndex}>{seg.text}</Text>;
                        })}
                      </Text>
                    </View>
                  );
                }
                
                if (line.type === 'numberedListItem') {
                  return (
                    <View style={styles.mdListItem}>
                      <Text style={styles.mdBullet}>{line.number}.</Text>
                      <Text style={styles.mdListContent}>
                        {line.segments.map((seg, segIndex) => {
                          if (seg.bold && seg.italic) {
                            return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                          }
                          if (seg.bold) {
                            return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                          }
                          if (seg.italic) {
                            return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                          }
                          return <Text key={segIndex}>{seg.text}</Text>;
                        })}
                      </Text>
                    </View>
                  );
                }
                
                return (
                  <Text style={styles.mdParagraph}>
                    {line.segments.map((seg, segIndex) => {
                      if (seg.bold && seg.italic) {
                        return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                      }
                      if (seg.bold) {
                        return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                      }
                      if (seg.italic) {
                        return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                      }
                      return <Text key={segIndex}>{seg.text}</Text>;
                    })}
                  </Text>
                );
              };
              
              return (
                <View key={lineIndex} break={shouldBreakHere}>
                  {renderLineContent()}
                </View>
              );
            })
          ) : (
            <Text style={styles.justificationText}>Justificativa clínica será exibida aqui</Text>
          )}
        </View>

        {/* Informações do procedimento - Bloco procedure-info */}
        <View style={styles.procedureInfoRow} wrap={false} break={shouldBreakBefore(3) || shouldBreakBeforeBlock('procedure-info')}>
          <View style={styles.procedureInfoColumn}>
            <Text style={styles.sectionHeader}>Caráter do Procedimento:</Text>
            <Text style={styles.procedureInfoText}>
              {orderData?.procedureType === 'eletiva' ? 'Eletivo' : 
               orderData?.procedureType === 'urgencia' ? 'Urgência' : 
               orderData?.procedureType === 'emergencia' ? 'Emergência' : ''}
            </Text>
          </View>
          <View style={styles.procedureInfoColumn}>
            <Text style={styles.sectionHeader}>Lateralidade do Procedimento:</Text>
            <Text style={styles.procedureInfoText}>
              {orderData?.procedureLaterality === 'direito' ? 'Direito' :
               orderData?.procedureLaterality === 'esquerdo' ? 'Esquerdo' :
               orderData?.procedureLaterality === 'bilateral' ? 'Bilateral' :
               orderData?.procedureLaterality === 'nao_se_aplica' ? 'Não se aplica' : ''}
            </Text>
          </View>
        </View>

        {/* Agrupamento por Procedimento/Conduta */}
        {(() => {
          const parsePorteValue = (porte: any) => {
            if (!porte || typeof porte !== 'string') return 0;
            const match = porte.match(/^(\d+)([A-Za-z]?)$/);
            if (!match) return 0;
            const numero = parseInt(match[1], 10);
            const letra = match[2]?.toUpperCase() || 'A';
            const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
            return (numero * 100) + valorLetra;
          };

          // 📝 Função para parsear notas por subtítulos de conduta
          // Formato atual: ### [Procedimento] → [Conduta]
          // Formato legado (compatibilidade): ### [Procedimento] → [Conduta] [PID:x][AID:y]
          // IMPORTANTE: Ambos os formatos são normalizados para chave baseada em nomes
          // Se houver múltiplas seções com a mesma chave, o conteúdo é mesclado
          const parseNotesBySubtitle = (notes: string | undefined | null) => {
            if (!notes) return { general: '', sections: new Map<string, string>() };
            
            const sections = new Map<string, string>();
            const lines = notes.split('\n');
            let currentKey: string | null = null;
            let currentContent: string[] = [];
            let generalContent: string[] = [];
            
            // Função auxiliar para salvar conteúdo (com merge se chave já existe)
            const saveContent = (key: string, content: string) => {
              if (!content) return;
              const existing = sections.get(key);
              if (existing) {
                // Merge: concatenar conteúdo existente com novo
                sections.set(key, `${existing}\n\n${content}`);
              } else {
                sections.set(key, content);
              }
            };
            
            lines.forEach(line => {
              // Detectar subtítulo - suporta formato atual e legado
              // Atual: ### [Procedimento] → [Conduta]
              // Legado: ### [Procedimento] → [Conduta] [PID:x][AID:y]
              const subtitleWithIdsMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*\[PID:(\d+)\]\[AID:(\d+)\]\s*$/);
              const subtitleMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*$/);
              
              if (subtitleWithIdsMatch || subtitleMatch) {
                // Salvar conteúdo anterior
                if (currentKey) {
                  const content = currentContent.join('\n').trim();
                  saveContent(currentKey, content);
                } else if (currentContent.length > 0) {
                  generalContent = [...generalContent, ...currentContent];
                }
                
                // Extrair nomes do procedimento e conduta (ambos os formatos)
                const procedureName = (subtitleWithIdsMatch || subtitleMatch)![1].trim();
                const approachName = (subtitleWithIdsMatch || subtitleMatch)![2].trim();
                
                // Sempre usar chave baseada em nomes (canônica)
                currentKey = `name:${procedureName}-${approachName}`;
                currentContent = [];
              } else {
                currentContent.push(line);
              }
            });
            
            // Salvar última seção
            if (currentKey) {
              const content = currentContent.join('\n').trim();
              saveContent(currentKey, content);
            } else if (currentContent.length > 0) {
              generalContent = [...generalContent, ...currentContent];
            }
            
            return { general: generalContent.join('\n').trim(), sections };
          };

          // Parsear as 3 caixas de notas
          const cbhpmNotes = parseNotesBySubtitle(orderData?.cbhpmAdditionalNotes);
          const opmeNotes = parseNotesBySubtitle(orderData?.opmeAdditionalNotes);
          const supplierNotes = parseNotesBySubtitle(orderData?.supplierAdditionalNotes);

          // Função helper para buscar nota por nome (chave única)
          // Todas as seções são normalizadas para chave baseada em nomes
          const findNote = (
            sections: Map<string, string>,
            procedureId: number | null,
            approachId: number | null,
            procedureName: string,
            approachName: string
          ): string | undefined => {
            // Busca por nome (chave canônica)
            const nameKey = `name:${procedureName}-${approachName}`;
            return sections.get(nameKey);
          };

          const groupItemsByApproach = () => {
            const groups: Map<string, {
              procedureId: number | null;
              procedureName: string;
              approachId: number | null;
              approachName: string;
              cids: any[];
              cbhpmProcedures: any[];
              opmeItemsList: any[];
              suppliers: any[];
            }> = new Map();

            if (cidData && Array.isArray(cidData) && cidData.length > 0) {
              cidData.forEach((cidItem: any) => {
                const cid = cidItem.cid || cidItem;
                // Priorizar surgicalApproach (objeto), depois sourceApproachId (ID direto na raiz ou em cid)
                const approach = cidItem.surgicalApproach || cid?.surgicalApproach;
                const approachId = approach?.id || cidItem.sourceApproachId || cid?.sourceApproachId || null;
                const approachName = approach?.name || cidItem.sourceApproachName || cid?.sourceApproachName || 'Itens Gerais';
                // Buscar procedimento cirúrgico (objeto ou ID direto)
                const procedure = cidItem.surgicalProcedure || cid?.surgicalProcedure;
                const procedureId = procedure?.id || cidItem.sourceProcedureId || cid?.sourceProcedureId || null;
                const procedureName = procedure?.name || cidItem.sourceProcedureName || cid?.sourceProcedureName || '';
                // Chave baseada em IDs para unicidade
                const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
                
                if (!groups.has(key)) {
                  groups.set(key, {
                    procedureId,
                    procedureName,
                    approachId,
                    approachName,
                    cids: [],
                    cbhpmProcedures: [],
                    opmeItemsList: [],
                    suppliers: []
                  });
                }
                groups.get(key)!.cids.push(cidItem);
              });
            }

            if (secondaryProcedures && secondaryProcedures.length > 0) {
              secondaryProcedures.forEach((proc: any) => {
                // Priorizar surgicalApproach (dados do backend), depois sourceApproachId (dados manuais)
                const approach = proc.surgicalApproach || proc.procedure?.surgicalApproach;
                const approachId = approach?.id || proc.procedure?.sourceApproachId || null;
                const approachName = approach?.name || proc.procedure?.sourceApproachName || 'Itens Gerais';
                // Buscar procedimento cirúrgico
                const procedure = proc.surgicalProcedure || proc.procedure?.surgicalProcedure;
                const procedureId = procedure?.id || proc.procedure?.sourceProcedureId || null;
                const procedureName = procedure?.name || proc.procedure?.sourceProcedureName || '';
                // Chave baseada em IDs para unicidade
                const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
                
                if (!groups.has(key)) {
                  groups.set(key, {
                    procedureId,
                    procedureName,
                    approachId,
                    approachName,
                    cids: [],
                    cbhpmProcedures: [],
                    opmeItemsList: [],
                    suppliers: []
                  });
                }
                groups.get(key)!.cbhpmProcedures.push(proc);
              });
            }

            if (opmeItems && opmeItems.length > 0) {
              opmeItems.forEach((opmeItem: any) => {
                const item = opmeItem.item || opmeItem;
                // Priorizar surgicalApproach (dados do backend), depois sourceApproachId (dados manuais)
                const approach = opmeItem.surgicalApproach || item?.surgicalApproach;
                const approachId = approach?.id || item?.sourceApproachId || null;
                const approachName = approach?.name || item?.sourceApproachName || 'Itens Gerais';
                // Buscar procedimento cirúrgico
                const procedure = opmeItem.surgicalProcedure || item?.surgicalProcedure;
                const procedureId = procedure?.id || item?.sourceProcedureId || null;
                const procedureName = procedure?.name || item?.sourceProcedureName || '';
                // Chave baseada em IDs para unicidade
                const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
                
                if (!groups.has(key)) {
                  groups.set(key, {
                    procedureId,
                    procedureName,
                    approachId,
                    approachName,
                    cids: [],
                    cbhpmProcedures: [],
                    opmeItemsList: [],
                    suppliers: []
                  });
                }
                groups.get(key)!.opmeItemsList.push(opmeItem);
              });
            }

            // Agrupar fornecedores por conduta (usar mesma lógica do preview)
            if (suppliers && suppliers.length > 0) {
              suppliers.forEach((supplier: any) => {
                const approachId = supplier.sourceApproachId || null;
                const approachName = supplier.sourceApproachName || 'Itens Gerais';
                const procedureId = supplier.sourceProcedureId || null;
                const procedureName = supplier.sourceProcedureName || '';
                // Chave baseada em IDs para unicidade
                const key = (procedureId && approachId) ? `${procedureId}|${approachId}` : 'general';
                
                if (!groups.has(key)) {
                  groups.set(key, {
                    procedureId,
                    procedureName,
                    approachId,
                    approachName,
                    cids: [],
                    cbhpmProcedures: [],
                    opmeItemsList: [],
                    suppliers: []
                  });
                }
                groups.get(key)!.suppliers.push(supplier);
              });
            }

            // Converter para array - PRESERVAR ORDEM DE ADIÇÃO DOS BLOCOS
            // Apenas colocar 'general' (itens sem conduta) no final
            const entries = Array.from(groups.entries());
            const generalEntry = entries.find(([key]) => key === 'general');
            const otherEntries = entries.filter(([key]) => key !== 'general');
            
            // Retorna outros na ordem original de adição, com 'general' no final
            return generalEntry ? [...otherEntries, generalEntry] : otherEntries;
          };

          const groupedItems = groupItemsByApproach();
          const hasMultipleGroups = groupedItems.length > 1 || (groupedItems.length === 1 && groupedItems[0][0] !== 'general');

          return groupedItems.map(([key, group], groupIndex) => {
            const hasCids = group.cids.length > 0;
            const hasProcedures = group.cbhpmProcedures.length > 0;
            const hasOpme = group.opmeItemsList.length > 0;
            const hasSuppliers = group.suppliers.length > 0;
            const showHeader = hasMultipleGroups && group.approachId;
            const groupSectionIndex = 4 + groupIndex;

            const renderCidsSection = () => (
              <View style={styles.clinicalSection}>
                <Text style={styles.sectionHeader}>Códigos CID-10:</Text>
                <View style={styles.clinicalContent}>
                  {group.cids.map((cidItem, index) => {
                    const cid = cidItem.cid || cidItem;
                    const code = cid?.code;
                    const description = cid?.description;
                    return (
                      <Text key={index} style={styles.clinicalText}>
                        {code} - {description}
                      </Text>
                    );
                  })}
                </View>
              </View>
            );

            const renderProceduresSection = (isFirst: boolean) => {
              const cbhpmNote = findNote(cbhpmNotes.sections, group.procedureId, group.approachId, group.procedureName, group.approachName);
              
              return (
                <View style={styles.clinicalSection} wrap={false} minPresenceAhead={isFirst ? undefined : 180}>
                  <Text style={styles.sectionHeader}>Procedimentos Cirúrgicos Necessários:</Text>
                  <View style={styles.clinicalContent}>
                    {(() => {
                      const sortedProcs = [...group.cbhpmProcedures].sort(
                        (a, b) => parsePorteValue(b.procedure?.porte) - parsePorteValue(a.procedure?.porte)
                      );
                      return sortedProcs.map((proc, index) => (
                        <Text key={index} style={styles.clinicalText}>
                          {proc.quantity} x {proc.procedure?.code} - {proc.procedure?.name}
                          {index === 0 && sortedProcs.length > 1 ? ' (Principal)' : ''}
                        </Text>
                      ));
                    })()}
                  </View>
                  {cbhpmNote && (
                    <View style={{ marginTop: 2 }}>
                      <Text style={styles.sectionHeader}>Observações:</Text>
                      <View style={styles.clinicalContent}>
                        {parseMarkdownToPdf(cbhpmNote).map((line, lineIndex) => {
                          if (line.type === 'listItem') {
                            return (
                              <View key={lineIndex} style={styles.mdListItem}>
                                <Text style={styles.mdBullet}>•</Text>
                                <Text style={styles.clinicalText}>
                                  {line.segments.map((seg, segIndex) => {
                                    if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                                    if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                                    if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                                    return <Text key={segIndex}>{seg.text}</Text>;
                                  })}
                                </Text>
                              </View>
                            );
                          }
                          return (
                            <Text key={lineIndex} style={styles.clinicalText}>
                              {line.segments.map((seg, segIndex) => {
                                if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                                if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                                if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                                return <Text key={segIndex}>{seg.text}</Text>;
                              })}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            };

            const renderOpmeSection = (isFirst: boolean) => {
              const opmeNote = findNote(opmeNotes.sections, group.procedureId, group.approachId, group.procedureName, group.approachName);
              
              return (
                <View style={styles.clinicalSection} wrap={false} minPresenceAhead={isFirst ? undefined : 180}>
                  <Text style={styles.sectionHeader}>Lista de Materiais Necessários:</Text>
                  <View style={styles.clinicalContent}>
                    {group.opmeItemsList.map((opmeItem, index) => {
                      const item = opmeItem.item || opmeItem;
                      const quantity = opmeItem.quantity || orderData?.opmeItemQuantities?.[index] || 1;
                      return (
                        <Text key={index} style={styles.clinicalText}>
                          {quantity} x {item.technicalName || item.commercialName || item.name || 'Material não especificado'}
                          {item.anvisaRegistrationNumber && ` (ANVISA: ${item.anvisaRegistrationNumber})`}
                        </Text>
                      );
                    })}
                  </View>
                  {opmeNote && (
                    <View style={{ marginTop: 2 }}>
                      <Text style={styles.sectionHeader}>Observações:</Text>
                      <View style={styles.clinicalContent}>
                        {parseMarkdownToPdf(opmeNote).map((line, lineIndex) => {
                          if (line.type === 'listItem') {
                            return (
                              <View key={lineIndex} style={styles.mdListItem}>
                                <Text style={styles.mdBullet}>•</Text>
                                <Text style={styles.clinicalText}>
                                  {line.segments.map((seg, segIndex) => {
                                    if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                                    if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                                    if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                                    return <Text key={segIndex}>{seg.text}</Text>;
                                  })}
                                </Text>
                              </View>
                            );
                          }
                          return (
                            <Text key={lineIndex} style={styles.clinicalText}>
                              {line.segments.map((seg, segIndex) => {
                                if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                                if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                                if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                                return <Text key={segIndex}>{seg.text}</Text>;
                              })}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            };

            const renderSuppliersSection = (isFirst: boolean) => {
              const supplierNote = findNote(supplierNotes.sections, group.procedureId, group.approachId, group.procedureName, group.approachName);
              
              return (
                <View style={styles.clinicalSection} wrap={false} minPresenceAhead={isFirst ? undefined : 180}>
                  <Text style={styles.sectionHeader}>Fornecedores:</Text>
                  <View style={styles.clinicalContent}>
                    {group.suppliers.map((supplier, index) => {
                      const supplierName = supplier.tradeName || supplier.companyName || supplier.supplierName || supplier.name || 'Fornecedor não especificado';
                      const manufacturerName = supplier.manufacturerName;
                      return (
                        <Text key={index} style={styles.clinicalText}>
                          {index + 1}. {supplierName}
                          {manufacturerName && ` (${manufacturerName})`}
                        </Text>
                      );
                    })}
                  </View>
                  {supplierNote && (
                    <View style={{ marginTop: 2 }}>
                      <Text style={styles.sectionHeader}>Observações:</Text>
                      <View style={styles.clinicalContent}>
                        {parseMarkdownToPdf(supplierNote).map((line, lineIndex) => {
                          if (line.type === 'listItem') {
                            return (
                              <View key={lineIndex} style={styles.mdListItem}>
                                <Text style={styles.mdBullet}>•</Text>
                                <Text style={styles.clinicalText}>
                                  {line.segments.map((seg, segIndex) => {
                                    if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                                    if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                                    if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                                    return <Text key={segIndex}>{seg.text}</Text>;
                                  })}
                                </Text>
                              </View>
                            );
                          }
                          return (
                            <Text key={lineIndex} style={styles.clinicalText}>
                              {line.segments.map((seg, segIndex) => {
                                if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                                if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                                if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                                return <Text key={segIndex}>{seg.text}</Text>;
                              })}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            };

            // Gerar ID do bloco para quebra forçada (compatível com preview V2)
            // Preview V2 usa key no formato "${procedureId}|${approachId}" ou "general"
            // Verificar quebras forçadas por tipo de seção dentro do grupo
            const groupHeaderBlockId = `group-header-${key}`;
            const cidsBlockId = `cids-${key}`;
            const cbhpmBlockId = `cbhpm-${key}`;
            const opmeBlockId = `opme-${key}`;
            const suppliersBlockId = `suppliers-${key}`;
            
            // Verificar se algum bloco do grupo tem quebra forçada (o primeiro a aparecer indica quebra no grupo)
            const shouldBreakGroup = shouldBreakBeforeBlock(groupHeaderBlockId) || shouldBreakBeforeBlock(cidsBlockId);
            
            return (
              <View key={key} style={groupIndex > 0 ? { marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#e5e7eb' } : {}} break={shouldBreakBefore(groupSectionIndex) || shouldBreakGroup}>
                {/* Agrupa título + primeira seção para não ficarem separados em páginas diferentes */}
                {showHeader && hasCids && (
                  <View wrap={false} minPresenceAhead={180}>
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2ca8e0' }}>
                        {group.procedureName} → {group.approachName}
                      </Text>
                    </View>
                    {renderCidsSection()}
                  </View>
                )}

                {/* Título sem CIDs - agrupa com próxima seção disponível */}
                {showHeader && !hasCids && hasProcedures && (
                  <View wrap={false} minPresenceAhead={180}>
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2ca8e0' }}>
                        {group.procedureName} → {group.approachName}
                      </Text>
                    </View>
                    {renderProceduresSection(true)}
                  </View>
                )}

                {showHeader && !hasCids && !hasProcedures && hasOpme && (
                  <View wrap={false} minPresenceAhead={180}>
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2ca8e0' }}>
                        {group.procedureName} → {group.approachName}
                      </Text>
                    </View>
                    {renderOpmeSection(true)}
                  </View>
                )}

                {showHeader && !hasCids && !hasProcedures && !hasOpme && hasSuppliers && (
                  <View wrap={false} minPresenceAhead={180}>
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2ca8e0' }}>
                        {group.procedureName} → {group.approachName}
                      </Text>
                    </View>
                    {renderSuppliersSection(true)}
                  </View>
                )}

                {/* Título sozinho (sem seções) */}
                {showHeader && !hasCids && !hasProcedures && !hasOpme && !hasSuppliers && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2ca8e0' }}>
                      {group.procedureName} → {group.approachName}
                    </Text>
                  </View>
                )}

                {/* CIDs sem título (já renderizado acima se showHeader + hasCids) */}
                {!showHeader && hasCids && (
                  <View wrap={false} minPresenceAhead={180}>
                    {renderCidsSection()}
                  </View>
                )}

                {/* Procedimentos (já renderizado acima se showHeader + !hasCids + hasProcedures) */}
                {hasProcedures && (showHeader ? hasCids : true) && !(showHeader && !hasCids && hasProcedures) && (
                  <View wrap={false} minPresenceAhead={180}>
                    {renderProceduresSection(false)}
                  </View>
                )}

                {/* OPME (já renderizado acima se showHeader + !hasCids + !hasProcedures + hasOpme) */}
                {hasOpme && !(showHeader && !hasCids && !hasProcedures && hasOpme) && (
                  <View wrap={false} minPresenceAhead={180}>
                    {renderOpmeSection(false)}
                  </View>
                )}

                {/* Fornecedores (já renderizado acima se showHeader + !hasCids + !hasProcedures + !hasOpme + hasSuppliers) */}
                {hasSuppliers && !(showHeader && !hasCids && !hasProcedures && !hasOpme && hasSuppliers) && (
                  <View wrap={false} minPresenceAhead={180}>
                    {renderSuppliersSection(false)}
                  </View>
                )}
              </View>
            );
          });
        })()}

        {/* Observações gerais (não associadas a nenhuma conduta específica) */}
        {(() => {
          // Função para parsear notas por subtítulos
          const parseGeneralNotes = (notes: string | undefined | null) => {
            if (!notes) return '';
            const lines = notes.split('\n');
            let currentKey: string | null = null;
            let generalContent: string[] = [];
            
            lines.forEach(line => {
              const subtitleMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*$/);
              if (subtitleMatch) {
                currentKey = 'has_subtitle';
              } else if (!currentKey) {
                generalContent.push(line);
              }
            });
            
            return generalContent.join('\n').trim();
          };

          const cbhpmGeneral = parseGeneralNotes(orderData?.cbhpmAdditionalNotes);
          const opmeGeneral = parseGeneralNotes(orderData?.opmeAdditionalNotes);
          const supplierGeneral = parseGeneralNotes(orderData?.supplierAdditionalNotes);

          const renderMarkdownContent = (content: string) => 
            parseMarkdownToPdf(content).map((line, lineIndex) => {
              if (line.type === 'horizontalRule') {
                return <View key={lineIndex} style={styles.mdHorizontalRule} />;
              }
              if (line.type === 'heading') {
                return (
                  <Text key={lineIndex} style={styles.mdHeading}>
                    {line.segments.map((seg, segIndex) => {
                      if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                      if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                      if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                      return <Text key={segIndex}>{seg.text}</Text>;
                    })}
                  </Text>
                );
              }
              if (line.type === 'listItem') {
                return (
                  <View key={lineIndex} style={styles.mdListItem}>
                    <Text style={styles.mdBullet}>•</Text>
                    <Text style={styles.clinicalText}>
                      {line.segments.map((seg, segIndex) => {
                        if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                        if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                        if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                        return <Text key={segIndex}>{seg.text}</Text>;
                      })}
                    </Text>
                  </View>
                );
              }
              return (
                <Text key={lineIndex} style={styles.clinicalText}>
                  {line.segments.map((seg, segIndex) => {
                    if (seg.bold && seg.italic) return <Text key={segIndex} style={styles.boldItalic}>{seg.text}</Text>;
                    if (seg.bold) return <Text key={segIndex} style={styles.bold}>{seg.text}</Text>;
                    if (seg.italic) return <Text key={segIndex} style={styles.italic}>{seg.text}</Text>;
                    return <Text key={segIndex}>{seg.text}</Text>;
                  })}
                </Text>
              );
            });

          return (
            <>
              {cbhpmGeneral && (
                <View style={styles.clinicalSection} wrap={false} minPresenceAhead={180}>
                  <Text style={styles.sectionHeader}>Observações Gerais sobre Procedimentos:</Text>
                  <View style={styles.clinicalContent}>
                    {renderMarkdownContent(cbhpmGeneral)}
                  </View>
                </View>
              )}
              {opmeGeneral && (
                <View style={styles.clinicalSection} wrap={false} minPresenceAhead={180}>
                  <Text style={styles.sectionHeader}>Observações Gerais sobre Materiais:</Text>
                  <View style={styles.clinicalContent}>
                    {renderMarkdownContent(opmeGeneral)}
                  </View>
                </View>
              )}
              {supplierGeneral && (
                <View style={styles.clinicalSection} wrap={false} minPresenceAhead={180}>
                  <Text style={styles.sectionHeader}>Observações Gerais sobre Fornecedores:</Text>
                  <View style={styles.clinicalContent}>
                    {renderMarkdownContent(supplierGeneral)}
                  </View>
                </View>
              )}
            </>
          );
        })()}

        {/* BLOCO DE ASSINATURA - Bloco signature */}
        <View wrap={false} break={shouldBreakBeforeBlock('signature')}>
          {/* Seção de assinatura */}
          <View style={styles.signatureSection}>
            {/* Data */}
            <View style={styles.dateSection}>
              <Text style={styles.dateText}>
                {hospitalData?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {formatDate(new Date())}
              </Text>
            </View>

            {/* Espaço para assinatura */}
            <View style={styles.signatureSpace}>
              {orderData?.doctorSignature && (
                <Image 
                  style={styles.signatureImage} 
                  src={orderData.doctorSignature} 
                />
              )}
            </View>

            {/* Dados do médico */}
            <View style={styles.doctorInfo}>
              <View style={styles.signatureLine} />
              <Text style={styles.doctorName}>{orderData?.doctorName?.toUpperCase() || 'NOME DO MÉDICO'}</Text>
              <Text style={styles.doctorSpecialty}>ORTOPEDIA E TRAUMATOLOGIA</Text>
              <Text style={styles.doctorCrm}>CRM {orderData?.doctorCRM || 'XXXX'}</Text>
            </View>

            {/* Rodapé */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Documento gerado por MedSync v2.5.3</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Páginas dos anexos de imagem - diretamente após o conteúdo principal */}
      {attachments?.length > 0 && 
        attachments
          .filter((attachment: any) => 
            attachment.type === 'image' || 
            (attachment.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(attachment.type.toLowerCase())) ||
            (attachment.filename && /\.(jpeg|jpg|png|gif|webp)$/i.test(attachment.filename))
          )
          .map((attachment: any, index: number) => {
            const totalAttachments = attachments.filter((att: any) => 
              att.type === 'image' || 
              (att.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(att.type.toLowerCase())) ||
              (att.filename && /\.(jpeg|jpg|png|gif|webp)$/i.test(att.filename))
            ).length;
            
            return (
              <Page size="A4" style={styles.page} key={`attachment-${index}`}>
                <PageHeader />
                
                {/* Imagem do anexo - ajuste inteligente baseado na proporção */}
                <View style={{ 
                  flex: 1, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginTop: 10, 
                  marginBottom: 10,
                  padding: 5
                }}>
                  <Image 
                    style={{ 
                      width: attachment.isDocumentRatio ? '100%' : undefined,
                      height: attachment.isDocumentRatio ? '100%' : undefined,
                      maxWidth: '100%', 
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }} 
                    src={attachment.url} 
                  />
                </View>
                
                {/* Legenda na parte inferior */}
                <View style={{ 
                  marginTop: 10, 
                  marginBottom: 20,
                  paddingTop: 10, 
                  borderTopWidth: 1, 
                  borderTopColor: '#e5e7eb',
                  alignItems: 'center'
                }}>
                  <Text style={{ 
                    fontSize: 10, 
                    color: '#6b7280', 
                    textAlign: 'center' 
                  }}>
                    Pedido nº {orderData?.id} - Paciente: {patientData?.fullName} - Anexo {index + 1} / {totalAttachments}
                  </Text>
                </View>
                
                <PageFooter />
              </Page>
            );
          })
      }
    </Document>
  );
};