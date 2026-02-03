import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { calculateAge } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingTop: 100, // Espaço para cabeçalho fixo
    paddingBottom: 60,
    paddingHorizontal: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  // Cabeçalho fixo (igual ao pedido cirúrgico)
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
  // Dados do paciente
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
  // Título do documento
  documentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 10,
  },
  // Justificativa médica
  justificationSection: {
    marginBottom: 20,
  },
  justificationText: {
    fontSize: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  // Assinatura (igual ao order-pdf-document)
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
  fixedFooter: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  },
  pageNumber: {
    fontSize: 7,
    color: '#9ca3af',
    marginTop: 2,
  },
});

interface AppealAttachment {
  id?: string;
  filename: string;
  url: string;
  type: 'image' | 'pdf';
}

interface AppealPDFDocumentProps {
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
  appealJustification: string;
  orderId?: number;
  user?: {
    name?: string;
    crm?: string;
    logoUrl?: string; // Logo do médico para o cabeçalho
    signatureUrl?: string; // Assinatura para o rodapé
    signatureNote?: string;
  };
  attachments?: AppealAttachment[]; // Anexos de imagem para incluir no PDF
}

const formatDateBR = (dateString?: string) => {
  if (!dateString) return 'Não informado';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

const MEDSYNC_VERSION = '2.5.3';

export const AppealPDFDocument = ({ patient, hospital, appealJustification, orderId, user, attachments = [] }: AppealPDFDocumentProps) => {
  // Filtrar apenas anexos de imagem (PDFs são mesclados separadamente com pdf-lib)
  const imageAttachments = attachments.filter(att => att.type === 'image');
  
  // Componente de rodapé reutilizável (fixo em todas as páginas)
  const PageFooter = () => (
    <View style={styles.fixedFooter} fixed>
      <Text style={styles.footerText}>
        Recurso de glosa do Pedido #{orderId || '---'} - Gerado em {new Date().toLocaleDateString('pt-BR')} através do MedSync v{MEDSYNC_VERSION}
      </Text>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => 
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  );
  
  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Cabeçalho fixo - Logo do Hospital (esquerda) e Logo do Médico (direita) */}
      <View style={styles.fixedHeader} fixed>
        <View style={styles.headerRow}>
          {/* Logo do Hospital - Esquerda */}
          <View style={styles.headerLogoLeft}>
            {hospital?.logoUrl && (
              <Image src={hospital.logoUrl} style={styles.hospitalLogo} />
            )}
          </View>

          {/* Logo do Médico - Direita */}
          <View style={styles.headerLogoRight}>
            {user?.logoUrl && (
              <Image src={user.logoUrl} style={styles.doctorLogo} />
            )}
          </View>
        </View>
      </View>

      {/* Dados do Paciente */}
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
              <Text style={styles.patientRow}>
                <Text style={styles.patientLabel}>Plano de Saúde:</Text> {patient.insurance || 'Não informado'}
              </Text>
              <Text style={styles.patientRow}>
                <Text style={styles.patientLabel}>Número da Carteirinha:</Text> {patient.insuranceNumber || 'Não informado'}
              </Text>
              <Text style={styles.patientRow}>
                <Text style={styles.patientLabel}>Tipo do Plano:</Text> {patient.plan || 'Não informado'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Título do Documento */}
      <View>
        <Text style={styles.documentTitle}>
          RECURSO DE GLOSA - SOLICITAÇÃO DE REAVALIAÇÃO
        </Text>
      </View>

      {/* Justificativa Médica */}
      <View style={styles.justificationSection}>
        <Text style={styles.justificationText}>
          {appealJustification || 'Justificativa médica será exibida aqui'}
        </Text>
      </View>

      {/* Seção de assinatura (igual ao order-pdf-document) */}
      <View style={styles.signatureSection}>
        {/* Data */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>
            {hospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>

        {/* Espaço para assinatura */}
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

        {/* Dados do médico */}
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
      
      {/* Rodapé será adicionado via pdf-lib após merge para paginação correta */}
    </Page>
    
    {/* Páginas de anexos de imagem */}
    {imageAttachments.map((attachment, index) => (
      <Page key={attachment.id || index} size="A4" style={styles.page}>
        {/* Cabeçalho fixo */}
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
        
        {/* Conteúdo do anexo - ajuste inteligente baseado na proporção */}
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 5
        }}>
          <Text style={{ fontSize: 10, marginBottom: 10, color: '#64748b' }}>
            Anexo {index + 1} de {imageAttachments.length} - {attachment.filename}
          </Text>
          <Image 
            src={attachment.url} 
            style={{ 
              width: (attachment as any).isDocumentRatio ? '100%' : undefined,
              height: (attachment as any).isDocumentRatio ? '100%' : undefined,
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain' 
            }} 
          />
        </View>
        
        {/* Rodapé será adicionado via pdf-lib após merge para paginação correta */}
      </Page>
    ))}
  </Document>
  );
};
