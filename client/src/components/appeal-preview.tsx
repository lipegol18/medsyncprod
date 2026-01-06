import MedSyncLogo from "@/assets/icons/Medsync_Y_Estilizado_Azul.svg";
import { useAuth } from "@/hooks/use-auth";

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

export function AppealPreview({ 
  patient, 
  hospital, 
  rejectionReason, 
  appealJustification 
}: AppealPreviewProps) {
  const { user } = useAuth();

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

  return (
    <div className="flex justify-center mb-10">
      <div id="documento-recurso-completo" className="bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Área de conteúdo com margens A4 */}
        <div style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '30px', marginRight: '30px' }}>
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
