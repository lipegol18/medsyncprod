import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { calculateAge } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  fixedHeader: {
    position: 'absolute',
    top: 15,
    left: 30,
    right: 30,
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
  patientSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  patientGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  patientColumn: {
    flex: 1,
  },
  patientRow: {
    fontSize: 9,
    marginBottom: 4,
  },
  patientLabel: {
    fontWeight: 'bold',
  },
  documentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 10,
  },
  reportSection: {
    marginBottom: 20,
  },
  reportText: {
    fontSize: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
  },
  reportHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
  },
  reportParagraph: {
    fontSize: 10,
    textAlign: 'justify' as const,
    lineHeight: 1.6,
    marginBottom: 6,
  },
  reportBold: {
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  reportItalic: {
    fontStyle: 'italic',
    fontFamily: 'Helvetica-Oblique',
  },
  reportBoldItalic: {
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontFamily: 'Helvetica-BoldOblique',
  },
  reportListItem: {
    fontSize: 10,
    textAlign: 'justify' as const,
    lineHeight: 1.6,
    marginBottom: 3,
    paddingLeft: 15,
  },
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
});

interface MedicalReportPDFDocumentProps {
  patient: {
    fullName?: string;
    birthDate?: string;
    insurance?: string;
    insuranceNumber?: string;
    plan?: string;
  };
  hospital: {
    name?: string;
    logoUrl?: string;
  };
  reportContent: string;
  orderId?: number;
  user?: {
    name?: string;
    crm?: string;
    logoUrl?: string;
    signatureUrl?: string;
    signatureNote?: string;
  };
}

const formatDateBR = (dateString?: string) => {
  if (!dateString) return 'Não informado';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

function renderInlineMarkdown(text: string) {
  const parts: any[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldItalicMatch = remaining.match(/\*\*\*(.+?)\*\*\*/);
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    let firstMatch: { index: number; length: number; content: string; type: string } | null = null;

    if (boldItalicMatch && boldItalicMatch.index !== undefined) {
      firstMatch = { index: boldItalicMatch.index, length: boldItalicMatch[0].length, content: boldItalicMatch[1], type: 'bolditalic' };
    }
    if (boldMatch && boldMatch.index !== undefined) {
      if (!firstMatch || boldMatch.index < firstMatch.index) {
        firstMatch = { index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[1], type: 'bold' };
      }
    }
    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = { index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[1], type: 'italic' };
      }
    }

    if (!firstMatch) {
      if (remaining) parts.push(<Text key={key++}>{remaining}</Text>);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(<Text key={key++}>{remaining.substring(0, firstMatch.index)}</Text>);
    }

    if (firstMatch.type === 'bolditalic') {
      parts.push(<Text key={key++} style={styles.reportBoldItalic}>{firstMatch.content}</Text>);
    } else if (firstMatch.type === 'bold') {
      parts.push(<Text key={key++} style={styles.reportBold}>{firstMatch.content}</Text>);
    } else {
      parts.push(<Text key={key++} style={styles.reportItalic}>{firstMatch.content}</Text>);
    }

    remaining = remaining.substring(firstMatch.index + firstMatch.length);
  }

  return parts;
}

function renderMarkdownContent(markdown: string) {
  if (!markdown) return null;

  const lines = markdown.split('\n');
  const elements: any[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const content = headingMatch[2];
      elements.push(
        <Text key={key++} style={styles.reportHeading}>
          {renderInlineMarkdown(content)}
        </Text>
      );
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      elements.push(
        <Text key={key++} style={styles.reportListItem}>
          {'• '}{renderInlineMarkdown(listMatch[1])}
        </Text>
      );
      continue;
    }

    const numberedListMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedListMatch) {
      elements.push(
        <Text key={key++} style={styles.reportListItem}>
          {renderInlineMarkdown(numberedListMatch[1])}
        </Text>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<Text key={key++} style={{ marginBottom: 4 }}>{' '}</Text>);
      continue;
    }

    elements.push(
      <Text key={key++} style={styles.reportParagraph}>
        {renderInlineMarkdown(line)}
      </Text>
    );
  }

  return elements;
}

export const MedicalReportPDFDocument = ({ patient, hospital, reportContent, orderId, user }: MedicalReportPDFDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.fixedHeader} fixed>
          <View style={styles.headerRow}>
            <View style={styles.headerLogoLeft}>
              {hospital?.logoUrl && (
                <Image src={hospital.logoUrl} style={styles.hospitalLogo} />
              )}
            </View>
            <View style={styles.headerLogoRight}>
              {user?.logoUrl && (
                <Image src={user.logoUrl} style={styles.doctorLogo} />
              )}
            </View>
          </View>
        </View>

        {patient && (
          <View style={styles.patientSection}>
            <Text style={styles.sectionTitle}>Dados do Paciente</Text>
            <View style={styles.patientGrid}>
              <View style={styles.patientColumn}>
                <Text style={styles.patientRow}>
                  <Text style={styles.patientLabel}>Nome:</Text> {patient.fullName}
                </Text>
                <Text style={styles.patientRow}>
                  <Text style={styles.patientLabel}>Data de Nascimento:</Text> {formatDateBR(patient.birthDate)}
                </Text>
                <Text style={styles.patientRow}>
                  <Text style={styles.patientLabel}>Idade:</Text> {calculateAge(patient.birthDate)} anos
                </Text>
              </View>
              <View style={styles.patientColumn}>
                {patient.insurance ? (
                  <Text style={styles.patientRow}>
                    <Text style={styles.patientLabel}>Plano de Saúde:</Text> {patient.insurance}
                  </Text>
                ) : null}
                {patient.insuranceNumber ? (
                  <Text style={styles.patientRow}>
                    <Text style={styles.patientLabel}>Número da Carteirinha:</Text> {patient.insuranceNumber}
                  </Text>
                ) : null}
                {patient.plan ? (
                  <Text style={styles.patientRow}>
                    <Text style={styles.patientLabel}>Tipo do Plano:</Text> {patient.plan}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.documentTitle}>
            LAUDO MÉDICO
          </Text>
        </View>

        <View style={styles.reportSection}>
          {renderMarkdownContent(reportContent)}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.dateSection}>
            <Text style={styles.dateText}>
              {hospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <View style={styles.signatureSpace}>
            {user?.signatureUrl ? (
              <Image
                style={styles.signatureImage}
                src={user.signatureUrl}
              />
            ) : (
              <Text style={styles.signaturePlaceholder}>
                Assinatura não cadastrada
              </Text>
            )}
          </View>

          <View style={styles.doctorInfo}>
            <View style={styles.signatureLine} />
            <Text style={styles.doctorName}>{user?.name?.toUpperCase() || 'NOME DO MÉDICO'}</Text>
            {user?.signatureNote ? (
              <Text style={styles.doctorSpecialty}>{user.signatureNote}</Text>
            ) : (
              <>
                <Text style={styles.doctorSpecialty}>ORTOPEDIA E TRAUMATOLOGIA</Text>
                <Text style={styles.doctorCrm}>CRM {user?.crm || 'XXXX'}</Text>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
