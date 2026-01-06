import { Tour } from '../types';

export const profileTour: Tour = {
  id: 'profile-tour',
  name: 'Tour do Perfil',
  steps: [
    {
      id: 'profile-intro',
      target: '[data-testid="profile-header"]',
      content: 'Bem-vindo à página do seu perfil! Aqui você pode gerenciar todas as suas informações pessoais e configurações profissionais.',
      title: 'Seu Perfil',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      id: 'profile-logo',
      target: '[data-testid="profile-logo-section"]',
      content: 'Adicione o logo do seu consultório ou clínica. Este logo aparecerá nos documentos e relatórios que você gerar.',
      title: 'Logo Profissional',
      placement: 'right',
    },
    {
      id: 'profile-signature',
      target: '[data-testid="profile-signature-section"]',
      content: 'Faça upload da sua assinatura digital. Ela será usada automaticamente nos documentos médicos e autorizações.',
      title: 'Assinatura Digital',
      placement: 'right',
    },
    {
      id: 'profile-crm',
      target: '[data-testid="profile-crm-section"]',
      content: 'Adicione uma imagem do seu cartão CRM. Esta informação é importante para validação das suas credenciais médicas.',
      title: 'Cartão CRM',
      placement: 'right',
    },
    {
      id: 'profile-signature-note',
      target: '[data-testid="profile-signature-note-section"]',
      content: 'A Nota da Assinatura é um texto complementar que aparece junto à sua assinatura nos documentos. Por exemplo: "Dr. João Silva - CRM 12345/SP - Ortopedista".',
      title: 'Nota da Assinatura',
      placement: 'top',
    },
    {
      id: 'profile-save-button',
      target: '[data-testid="button-save-profile"]',
      content: 'Após fazer suas alterações, clique aqui para salvar. Suas informações serão atualizadas imediatamente no sistema.',
      title: 'Salvar Alterações',
      placement: 'top',
    },
  ],
};
