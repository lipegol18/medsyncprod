import { Tour } from '../types';

export const createOrderTour: Tour = {
  id: 'create-order-tour',
  name: 'Tour de Novo Pedido Cirúrgico',
  steps: [
    // === WIZARD STEP 1 ===
    {
      id: 'order-welcome',
      target: '[data-testid="order-header"]',
      content: 'Bem-vindo ao formulário de Pedido Cirúrgico! Aqui você cria autorizações médicas em apenas 5 etapas simples.',
      title: 'Pedido Cirúrgico',
      placement: 'bottom',
      disableBeacon: true,
      metadata: { wizardStep: 1 },
    },
    {
      id: 'order-steps',
      target: '[data-testid="order-steps-progress"]',
      content: 'Esta barra mostra seu progresso nas 5 etapas: 1) Paciente e Hospital, 2) Exame e Laudo, 3) Dados da Cirurgia, 4) Visualização e 5) Confirmação. Você pode clicar em qualquer etapa já preenchida para voltar.',
      title: 'Progresso do Pedido',
      placement: 'bottom',
      metadata: { wizardStep: 1 },
    },
    {
      id: 'order-patient',
      target: '[data-testid="order-patient-selection"]',
      content: 'Primeiro, selecione o paciente. Digite o nome ou CPF para buscar pacientes cadastrados. Se o paciente não existir, você pode cadastrá-lo pela página de Gestão de Pacientes.',
      title: 'Seleção de Paciente',
      placement: 'bottom',
      metadata: { wizardStep: 1 },
    },
    {
      id: 'order-hospital',
      target: '[data-testid="order-hospital-selection"]',
      content: 'Depois, selecione o hospital onde a cirurgia será realizada. Apenas hospitais vinculados ao seu perfil aparecem aqui.',
      title: 'Seleção de Hospital',
      placement: 'top',
      metadata: { wizardStep: 1 },
    },
    {
      id: 'order-navigation',
      target: '[data-testid="order-navigation-buttons"]',
      content: 'Use estes botões para navegar: "Salvar e Sair" salva o progresso para continuar depois, e "Próximo" avança para a próxima etapa (habilitado apenas quando os campos obrigatórios estão preenchidos).',
      title: 'Navegação',
      placement: 'top',
      metadata: { wizardStep: 1 },
    },
    
    // === WIZARD STEP 2 ===
    {
      id: 'order-step2-clinical',
      target: '[data-testid="order-clinical-indication"]',
      content: 'Na Etapa 2, você preenche a Indicação Clínica do procedimento - descreva o quadro do paciente e a justificativa médica para a cirurgia.',
      title: 'Etapa 2: Indicação Clínica',
      placement: 'bottom',
      metadata: { wizardStep: 2 },
    },
    {
      id: 'order-step2-attachments',
      target: '[data-testid="order-exam-info"]',
      content: 'Você pode anexar exames de imagem (raio-X, ressonância, tomografia) e laudos médicos em PDF. O sistema suporta OCR para extrair texto automaticamente dos documentos!',
      title: 'Etapa 2: Anexos e OCR',
      placement: 'top',
      metadata: { wizardStep: 2 },
    },
    
    // === WIZARD STEP 3 - SURGERY DATA ===
    {
      id: 'order-step3-region',
      target: '[data-testid="surgery-anatomical-region"]',
      content: 'Escolha a região anatômica da cirurgia clicando no ícone correspondente. Por exemplo: Ombro, Joelho, Coluna, etc. Os procedimentos disponíveis serão filtrados automaticamente pela região selecionada.',
      title: 'Etapa 3: Região Anatômica',
      placement: 'bottom',
      metadata: { wizardStep: 3 },
    },
    {
      id: 'order-step3-procedure',
      target: '[data-testid="surgery-procedure-selection"]',
      content: 'Selecione o procedimento cirúrgico desejado. Ao escolher um procedimento, os demais campos (CIDs, CBHPM, OPME, Fornecedores) serão preenchidos automaticamente de forma otimizada!',
      title: 'Etapa 3: Procedimento Cirúrgico',
      placement: 'top',
      metadata: { wizardStep: 3 },
    },
    {
      id: 'order-step3-laterality',
      target: '[data-testid="surgery-laterality"]',
      content: 'Escolha a lateralidade do procedimento: Bilateral, Direito, Esquerdo ou Não se aplica. Este campo é obrigatório para prosseguir.',
      title: 'Etapa 3: Lateralidade',
      placement: 'top',
      metadata: { wizardStep: 3 },
    },
    {
      id: 'order-step3-character',
      target: '[data-testid="surgery-character"]',
      content: 'Escolha o caráter do procedimento: Eletiva (programada) ou Urgência. Este campo define a prioridade do pedido junto à seguradora.',
      title: 'Etapa 3: Caráter do Procedimento',
      placement: 'top',
      metadata: { wizardStep: 3 },
    },
    {
      id: 'order-step3-auto-fields',
      target: '[data-testid="order-step-3"]',
      content: 'Revise os campos preenchidos automaticamente: CIDs diagnósticos, Procedimentos CBHPM, Itens OPME e Fornecedores. Você pode alterar qualquer informação de acordo com suas necessidades clínicas.',
      title: 'Etapa 3: Campos Auto-preenchidos',
      placement: 'top',
      metadata: { wizardStep: 3, scrollToTop: true },
    },
    {
      id: 'order-step3-ai',
      target: '[data-testid="surgery-ai-justification"]',
      content: 'Você pode alterar manualmente a justificativa clínica ou gerar uma automaticamente com nossa IA especializada. Clique no botão "Gerar Justificativa Clínica com IA" para criar um texto específico baseado nos dados do pedido.',
      title: 'Etapa 3: Justificativa com IA',
      placement: 'top',
      metadata: { wizardStep: 3 },
    },
    {
      id: 'order-step3-next',
      target: '[data-testid="order-navigation-buttons"]',
      content: 'Clique em "Salvar e Sair" para continuar depois, ou "Próximo" para visualizar seu pedido completo antes de finalizar.',
      title: 'Etapa 3: Próximos Passos',
      placement: 'top',
      metadata: { wizardStep: 3 },
    },
    
    // === WIZARD STEP 4 - PREVIEW ===
    {
      id: 'order-step4-preview',
      target: '[data-testid="order-step-4"]',
      content: 'Esta é a Etapa 4: Visualização do Pedido. Aqui você vê uma prévia exata do documento que será gerado, no formato A4 pronto para impressão ou envio digital.',
      title: 'Etapa 4: Visualização',
      placement: 'top',
      metadata: { wizardStep: 4, scrollToTop: true },
    },
    {
      id: 'order-step4-navigation',
      target: '[data-testid="order-navigation-buttons"]',
      content: 'Use "Voltar" para fazer ajustes, "Salvar e Sair" para continuar depois, ou clique em "Próximo" para gerar o PDF oficial do pedido.',
      title: 'Etapa 4: Gerar PDF',
      placement: 'top',
      metadata: { wizardStep: 4 },
    },
    
    // === WIZARD STEP 5 - PDF GENERATION ===
    {
      id: 'order-step5-success',
      target: '[data-testid="order-step-5"]',
      content: 'Parabéns! Seu pedido foi criado com sucesso e o PDF foi gerado automaticamente. O documento está pronto para ser baixado ou enviado.',
      title: 'Etapa 5: PDF Gerado',
      placement: 'top',
      metadata: { wizardStep: 5 },
    },
    {
      id: 'order-step5-actions',
      target: '[data-testid="order-pdf-actions"]',
      content: 'Use os botões "Download" para baixar o PDF ou "Enviar por Email" para enviar diretamente para a seguradora. O documento inclui todos os dados do pedido formatados profissionalmente.',
      title: 'Etapa 5: Download e Envio',
      placement: 'top',
      metadata: { wizardStep: 5 },
    },
  ],
};
