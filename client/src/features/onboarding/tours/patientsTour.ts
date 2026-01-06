import { Tour } from '../types';

export const patientsTour: Tour = {
  id: 'patients-tour',
  name: 'Tour de Cadastro de Pacientes',
  steps: [
    {
      id: 'patients-welcome',
      target: '[data-testid="patients-header"]',
      content: 'Bem-vindo à página de Gestão de Pacientes! Aqui você pode cadastrar, editar e gerenciar todos os seus pacientes.',
      title: 'Gestão de Pacientes',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      id: 'patients-filters',
      target: '[data-testid="patients-filters-card"]',
      content: 'Use os filtros para encontrar pacientes rapidamente. Você pode buscar por nome, CPF, data de nascimento ou convênio. Os resultados são atualizados automaticamente.',
      title: 'Filtros de Busca',
      placement: 'bottom',
    },
    {
      id: 'patients-new-button',
      target: '[data-testid="button-novo-paciente-page"]',
      content: 'Clique aqui para cadastrar um novo paciente. Um formulário será aberto com duas seções: Dados Pessoais (nome, CPF, nascimento, sexo, contato) e Plano de Saúde (seguradora, plano, carteirinha). Você pode usar OCR para extrair dados automaticamente de documentos e carteirinhas!',
      title: 'Cadastrar Novo Paciente',
      placement: 'left',
    },
  ],
};
