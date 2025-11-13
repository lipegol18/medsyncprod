import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RegisterForm } from './register-form';
import { PricingSection } from './pricing-section';
import { type RegisterForm as RegisterFormType } from '@/schemas/auth-schemas';
import { type SubscriptionPlan } from '@/types/subscription';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSupportContact } from '@/lib/support-contact';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

interface RegisterModalProps {
  onSubmit: (data: RegisterFormType) => void;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  validationErrors: Record<string, string>;
  onFieldValidation: (field: 'cpf' | 'crm' | 'phone' | 'email' | 'username', value: string) => void;
}

export function RegisterModal({
  onSubmit,
  onSwitchToLogin,
  isLoading,
  validationErrors,
  onFieldValidation
}: RegisterModalProps) {
  // Sempre iniciar no formulário de dados (passo 1)
  const [currentStep, setCurrentStep] = useState<'form' | 'pricing' | 'confirmation' | 'trial-welcome' | 'clinica-contact' | 'error'>('form');
  // Dados do formulário começam vazios para o usuário preencher
  const [formData, setFormData] = useState<RegisterFormType | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  // Estado para dados pré-carregados quando voltar ao formulário
  const [preloadedFormData, setPreloadedFormData] = useState<Partial<RegisterFormType> | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { openSupport } = useSupportContact();
  const queryClient = useQueryClient();
  const [crmValidationStatus, setCrmValidationStatus] = useState<{ [key: string]: 'validating' | 'valid' | 'invalid' }>({});

  // Scroll para o topo sempre que o modal for aberto/montado
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Buscar planos de assinatura  adasdsadsadas
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  // Buscar desconto automático ativo
  const { data: automaticDiscountResponse } = useQuery({
    queryKey: ['/api/discount-codes/automatic'],
  });

  const automaticDiscount = automaticDiscountResponse?.data;
  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  // Funções auxiliares para cálculo de desconto
  const getDiscountPercentage = () => {
    if (!automaticDiscount || automaticDiscount.discountType !== 'percentage') {
      return 50; // fallback para 50% se não houver desconto automático
    }
    return automaticDiscount.discountValue;
  };

  const getDiscountMultiplier = () => {
    const percentage = getDiscountPercentage();
    return (100 - percentage) / 100; // Ex: 50% = 0.5 multiplier
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!automaticDiscount || automaticDiscount.discountType !== 'percentage') {
      return originalPrice * 0.5; // fallback para 50% de desconto
    }
    return originalPrice * getDiscountMultiplier();
  };

  // Mutation para registro com plano
  const registerWithPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      if (!formData) throw new Error("Dados do formulário não encontrados");
      
      const payload = { 
        planId,
        billingInterval, // Incluir billingInterval selecionado pelo usuário
        ...formData,
        // Incluir ID do desconto automático se disponível
        ...(automaticDiscount && { discountCodeId: automaticDiscount.id })
      };
      
      console.log('🚀 Enviando dados para registro com plano:', payload);
      
      const data = await apiRequest('/api/register-with-plan', 'POST', payload);
      
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ Registro com plano bem-sucedido:', data);
      
      if (data.trialActive) {
        // Para plano START - mostrar tela de boas-vindas primeiro
        console.log('🎯 Trial ativo - indo para tela de boas-vindas');
        setCurrentStep('trial-welcome');
      } else if (data.checkoutUrl) {
        // Redirecionar para checkout do Stripe
        console.log('🔗 Redirecionando para checkout:', data.checkoutUrl);
        toast({
          title: "Dados salvos!",
          description: data.discountApplied ? "Redirecionando para pagamento com desconto..." : "Redirecionando para pagamento...",
        });
        window.location.href = data.checkoutUrl;
      } else {
        // Erro: deveria ter recebido checkoutUrl mas não recebeu
        console.error('❌ Erro: checkoutUrl não retornado pelo servidor');
        toast({
          title: "Erro no Pagamento",
          description: "Não foi possível criar a sessão de pagamento. Tente novamente.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Erro no registro com plano:', error);
      
      // Se for erro de usuário já existente, mostrar tela de erro específica
      if (error.message?.includes('já existe') || error.message?.includes('already exists')) {
        setCurrentStep('error');
      } else {
        toast({
          title: "Erro no Registro",
          description: error.message || "Erro ao criar conta. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para validação de CRM
  const validateCrmMutation = useMutation({
    mutationFn: async ({ crm, crmUf }: { crm: string; crmUf: string }) => {
      const response = await apiRequest('/api/validate-crm', 'POST', { crm, crmUf });
      return response;
    },
    onMutate: ({ crm, crmUf }) => {
      const crmKey = `${crm}-${crmUf}`;
      setCrmValidationStatus(prev => ({ ...prev, [crmKey]: 'validating' }));
    },
    onSuccess: (data, variables) => {
      const crmKey = `${variables.crm}-${variables.crmUf}`;
      setCrmValidationStatus(prev => ({ ...prev, [crmKey]: data.isValid ? 'valid' : 'invalid' }));
    },
    onError: (error, variables) => {
      const crmKey = `${variables.crm}-${variables.crmUf}`;
      setCrmValidationStatus(prev => ({ ...prev, [crmKey]: 'invalid' }));
      
      toast({
        title: "Erro na Validação",
        description: "Não foi possível validar o CRM. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = async (data: RegisterFormType) => {
    // Salvar dados do formulário e prosseguir para seleção de planos
    setFormData(data);
    
    // Tracking: registrar que usuário completou o formulário
    try {
      await fetch('/api/track-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Dados básicos
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          cpf: data.cpf,
          phone: data.phone,
          username: data.username,
          // Dados CRM
          medicalSpecialtyId: data.medicalSpecialtyId,
          crmNumber: data.crmNumber,
          crmState: data.crmState,
          // Dados de endereço
          zipCode: data.zipCode,
          address: data.address,
          addressNumber: data.addressNumber,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          // Tracking
          currentStep: 'form_completed',
          userAgent: navigator.userAgent,
          source: 'direct'
        })
      });
    } catch (error) {
      console.log('Erro ao registrar lead:', error);
      // Não bloquear o fluxo por erro de tracking
    }
    
    // Fazer scroll para o topo do modal quando transita para escolha de planos
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setCurrentStep('pricing');
  };

  const handleBackToForm = async () => {
    // Carregar dados salvos se existir email
    if (formData?.email) {
      try {
        console.log('🔍 Carregando dados salvos para email:', formData.email);
        
        const response = await fetch(`/api/incomplete-registration/${encodeURIComponent(formData.email)}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            console.log('✅ Dados carregados:', result.data);
            setPreloadedFormData(result.data);
            
            // Se houver plano selecionado salvo, restaurar também
            if (result.selectedPlanId) {
              setSelectedPlanId(result.selectedPlanId);
            }
          }
        } else {
          console.log('ℹ️ Nenhum dado salvo encontrado, mantendo dados atuais');
          // Se não encontrar dados salvos, usar os dados atuais do formData
          setPreloadedFormData(formData);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados salvos:', error);
        // Em caso de erro, usar os dados atuais do formData
        setPreloadedFormData(formData);
      }
    } else {
      // Se não houver email, limpar dados pré-carregados
      setPreloadedFormData(null);
    }
    
    setCurrentStep('form');
  };

  // Função para apenas selecionar o plano visualmente (não executa ação)
  const handlePlanSelection = async (planId: number) => {
    // Salvar plano selecionado no estado local
    setSelectedPlanId(planId);
    
    // Tracking: atualizar que usuário selecionou plano
    if (formData) {
      try {
        await fetch('/api/track-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            selectedPlanId: planId,
            currentStep: 'plan_selected',
            userAgent: navigator.userAgent,
          })
        });
      } catch (error) {
        console.log('Erro ao atualizar tracking:', error);
      }
    }
    
    // NÃO executar ação aqui - apenas marcar plano como selecionado
    console.log(`Plano ${planId} selecionado (apenas visual)`);
  };

  // Função para avançar da seleção de planos para confirmação ou contato
  const handleAdvanceToConfirmation = async () => {
    if (!selectedPlanId) {
      toast({
        title: "Plano não selecionado",
        description: "Por favor, selecione um plano para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Fazer scroll para o topo do modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Se for plano CLÍNICA (id 3), ir para tela de contato
    if (selectedPlanId === 3) {
      setCurrentStep('clinica-contact');
    } else {
      // Para outros planos, ir para confirmação normal
      setCurrentStep('confirmation');
    }
  };

  // Função para processar o pagamento final (da confirmação)
  const handleFinalizePayment = async () => {
    if (!selectedPlanId) return;
    
    // Executar ação baseada no plano
    registerWithPlanMutation.mutate(selectedPlanId);
  };

  // Indicador de progresso
  const ProgressIndicator = () => {
    const isCompleted = (step: string) => {
      if (currentStep === 'form') return false;
      if (currentStep === 'pricing') return step === 'form';
      if (currentStep === 'confirmation') return step === 'form' || step === 'pricing';
      return step === 'form' || step === 'pricing' || step === 'confirmation';
    };

    const isCurrent = (step: string) => currentStep === step;

    return (
      <div className="flex items-center justify-center mb-4 sm:mb-4 px-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Etapa 1: Formulário */}
          <div className="flex items-center">
            <div className={`breadcrumb-base ${
              isCurrent('form') ? 'breadcrumb-active' : 
                isCompleted('form') ? 'breadcrumb-completed' : 
                'breadcrumb-inactive'
            }`}>
              {isCompleted('form') ? '✓' : '1'}
            </div>
            <span className={`
              ml-2 text-xs sm:text-sm font-medium hidden sm:inline
              ${isCurrent('form') ? 'text-accent' : 
                isCompleted('form') ? 'text-green-600' : 
                'text-gray-500'}
            `}>
              Dados
            </span>
          </div>

          {/* Linha conectora 1 */}
          <div className={`
            w-4 sm:w-8 h-1 rounded-full
            ${isCompleted('form') ? 'bg-green-500' : 'bg-gray-300'}
          `} />

          {/* Etapa 2: Planos */}
          <div className="flex items-center">
            <div className={`breadcrumb-base ${
              isCurrent('pricing') ? 'breadcrumb-active' : 
                isCompleted('pricing') ? 'breadcrumb-completed' : 
                'breadcrumb-inactive'
            }`}>
              {isCompleted('pricing') ? '✓' : '2'}
            </div>
            <span className={`
              ml-2 text-xs sm:text-sm font-medium hidden sm:inline
              ${isCurrent('pricing') ? 'text-accent' : 
                isCompleted('pricing') ? 'text-green-600' : 
                'text-gray-500'}
            `}>
              Planos
            </span>
          </div>

          {/* Linha conectora 2 */}
          <div className={`
            w-4 sm:w-8 h-1 rounded-full
            ${isCompleted('pricing') ? 'bg-green-500' : 'bg-gray-300'}
          `} />

          {/* Etapa 3: Confirmação */}
          <div className="flex items-center">
            <div className={`breadcrumb-base ${
              isCurrent('confirmation') ? 'breadcrumb-active' : 
                isCompleted('confirmation') ? 'breadcrumb-completed' : 
                'breadcrumb-inactive'
            }`}>
              {isCompleted('confirmation') ? '✓' : '3'}
            </div>
            <span className={`
              ml-2 text-xs sm:text-sm font-medium hidden sm:inline
              ${isCurrent('confirmation') ? 'text-accent' : 
                isCompleted('confirmation') ? 'text-green-600' : 
                'text-gray-500'}
            `}>
              Confirmação
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Etapa 1: Formulário de registro
  if (currentStep === 'form') {
    return (
      <div>
        <ProgressIndicator />
        <RegisterForm 
          onSubmit={handleFormSubmit}
          onSwitchToLogin={onSwitchToLogin}
          isLoading={isLoading}
          validationErrors={validationErrors}
          onFieldValidation={onFieldValidation}
          defaultValues={preloadedFormData || formData || undefined}
        />
      </div>
    );
  }

  // Etapa 2: Seleção de planos
  if (currentStep === 'pricing') {
    return (
      <div>
        <ProgressIndicator />
        
        {/* Header da seção de planos - Melhorado */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            Escolha seu <span className="text-blue-600">Plano Ideal</span>
          </h2>
        </div>

        {/* Toggle para período de cobrança - Melhorado */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="relative">
            {/* Badge de economia */}
            <div className="absolute -top-3 -right-2 z-20">
              <span className="inline-block px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 transform rotate-12 shadow-sm" style={{fontFamily: 'Nunito, sans-serif'}}>
                2 meses grátis
              </span>
            </div>
            
            <div className="flex items-center bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-1.5 shadow-sm">
              <div className="relative flex bg-white rounded-lg shadow-sm">
                {/* Indicador deslizante melhorado */}
                <div 
                  className={`absolute top-0 bottom-0 bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg transition-all duration-300 ease-in-out shadow-sm ${
                    billingInterval === 'monthly' 
                      ? 'left-0 w-1/2' 
                      : 'left-1/2 w-1/2'
                  }`}
                />
                
                <button
                  type="button"
                  className={`relative z-10 text-sm font-semibold px-6 py-2.5 rounded-lg transition-all duration-300 hover:bg-transparent hover:text-current ${
                    billingInterval === 'monthly' 
                      ? 'text-white' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  onClick={() => setBillingInterval('monthly')}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  className={`relative z-10 text-sm font-semibold px-6 py-2.5 rounded-lg transition-all duration-300 hover:bg-transparent hover:text-current ${
                    billingInterval === 'yearly' 
                      ? 'text-white' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  onClick={() => setBillingInterval('yearly')}
                >
                  Anual
                </button>
              </div>
            </div>
          </div>
        </div>

        <PricingSection 
          onPlanSelection={handlePlanSelection}
          selectedPlanId={selectedPlanId || undefined}
          onAdvanceToPayment={handleAdvanceToConfirmation}
          billingInterval={billingInterval}
          onBackToForm={handleBackToForm}
        />
      </div>
    );
  }

  // Debug: mostrar estado atual
  console.log('🔍 Renderização - currentStep:', currentStep);

  // Etapa 3: Confirmação dos dados e plano
  if (currentStep === 'confirmation') {
    return (
      <div>
        <ProgressIndicator />
        
        {/* Header da seção de confirmação */}
        <div className="text-center mb-6 px-2">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">Confirme seus Dados</h2>
          <p className="text-gray-600 leading-relaxed font-bold text-xs sm:text-sm">
            Revise as informações antes de finalizar o pagamento
          </p>
        </div>

        <div className="px-4 space-y-6">
          {/* Dados Pessoais */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">Dados Pessoais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">Nome:</span> <span className="font-medium">{formData?.firstName} {formData?.lastName}</span></div>
              <div><span className="text-gray-600">CPF:</span> <span className="font-medium">{formData?.cpf}</span></div>
              <div><span className="text-gray-600">E-mail:</span> <span className="font-medium">{formData?.email}</span></div>
              <div><span className="text-gray-600">Telefone:</span> <span className="font-medium">{formData?.phone}</span></div>
              <div><span className="text-gray-600">CRM:</span> <span className="font-medium">{formData?.crm} / {formData?.crmUf}</span></div>
              <div><span className="text-gray-600">Username:</span> <span className="font-medium">{formData?.username}</span></div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">Endereço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">CEP:</span> <span className="font-medium">{formData?.cep}</span></div>
              <div><span className="text-gray-600">Endereço:</span> <span className="font-medium">{formData?.address}, {formData?.number}</span></div>
              <div><span className="text-gray-600">Complemento:</span> <span className="font-medium">{formData?.complement || '—'}</span></div>
              <div><span className="text-gray-600">Bairro:</span> <span className="font-medium">{formData?.neighborhood}</span></div>
              <div><span className="text-gray-600">Cidade:</span> <span className="font-medium">{formData?.city}</span></div>
              <div><span className="text-gray-600">Estado:</span> <span className="font-medium">{formData?.state}</span></div>
            </div>
          </div>

          {/* Plano Selecionado */}
          {selectedPlan && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-bold text-gray-900 mb-3">Plano Selecionado</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{selectedPlan.name}</span>
                  <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    {billingInterval === 'monthly' ? 'Mensal' : 'Anual'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{selectedPlan.description}</p>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Total a pagar:</span>
                  <div className="text-right">
                    {automaticDiscount && (
                      <div className="text-sm text-red-500 font-medium">
                        {getDiscountPercentage()}% de desconto no primeiro ano
                      </div>
                    )}
                    <span className="text-2xl font-bold text-blue-600">
                      R$ {billingInterval === 'monthly' 
                        ? calculateDiscountedPrice(selectedPlan.priceMonthly / 100).toFixed(2)
                        : calculateDiscountedPrice(selectedPlan.priceYearly / 100).toFixed(2)
                      }
                      <span className="text-sm text-gray-500">/{billingInterval === 'monthly' ? 'mês' : 'ano'}</span>
                    </span>
                    {automaticDiscount && (
                      <div className="text-xs text-gray-500 line-through">
                        De: R$ {billingInterval === 'monthly' ? (selectedPlan.priceMonthly / 100).toFixed(2) : (selectedPlan.priceYearly / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cupom Promocional Disponível */}
          {automaticDiscount && (
            <p className="text-sm font-bold text-blue-900">
              Ativar o desconto de {getDiscountPercentage()}% com o código {automaticDiscount.code} na próxima tela de pagamento.
            </p>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setCurrentStep('pricing')}
              className="flex-1 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 bg-accent hover:bg-gray-300 text-white flex items-center justify-center"
              data-testid="button-back-to-pricing"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Alterar Plano
            </button>
            
            <button 
              type="button"
              onClick={() => setCurrentStep('form')}
              className="flex-1 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 bg-accent hover:bg-gray-300 text-white"
              data-testid="button-back-to-form"
            >
              Editar Dados
            </button>
            
            <button 
              type="button"
              onClick={handleFinalizePayment}
              disabled={registerWithPlanMutation.isPending}
              className="flex-1 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 bg-accent hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-finalize-payment"
            >
              {registerWithPlanMutation.isPending ? 'Processando...' : 'Finalizar Pagamento'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Etapa de contato para plano CLÍNICA
  if (currentStep === 'clinica-contact') {
    return (
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🏥</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Plano CLÍNICA - Consultoria Personalizada
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Este plano é customizado para cada empresa.<br/>
            Nossa equipe comercial entrará em contato em até 24h.
          </p>
        </div>

        {/* Benefícios do plano */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-3">✨ Benefícios Exclusivos</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Médicos ilimitados na clínica
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Integração com sistemas existentes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Suporte técnico dedicado 24/7
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Treinamento da equipe incluso
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Relatórios avançados e analytics
            </li>
          </ul>
        </div>

        {/* Processo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Como funciona?</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
              <span>Entre em contato conosco pelo WhatsApp ou formulário</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
              <span>Nossa equipe agenda uma reunião para entender suas necessidades</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
              <span>Criamos uma proposta personalizada com preço e cronograma</span>
            </div>
          </div>
        </div>

        {/* Opções de contato */}
        <div className="space-y-4 mb-6">
          <h3 className="font-bold text-gray-900 text-center">💬 Entre em contato agora:</h3>
          
          {/* WhatsApp */}
          <button
            onClick={() => openSupport("Olá! Tenho interesse no Plano CLÍNICA do MedSync e gostaria de saber mais informações.", "sales")}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📱</span>
            Falar via WhatsApp
          </button>

          {/* Formulário de contato */}
          <button
            onClick={() => {
              toast({
                title: "Formulário em breve!",
                description: "Use o WhatsApp para contato imediato ou envie email para contato@medsync.com.br",
              });
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📧</span>
            Formulário de Contato
          </button>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            type="button"
            onClick={() => setCurrentStep('pricing')}
            className="flex-1 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 bg-accent hover:bg-gray-300 text-white flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Planos
          </button>
        </div>
      </div>
    );
  }

  // Etapa de pagamento removida - agora redirecionamos diretamente para Checkout Session

  // Tela de boas-vindas para trial do plano START
  if (currentStep === 'trial-welcome') {
    return (
      <div className="text-center px-4 py-6">
        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Título principal */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          🎉 Bem-vindo ao MedSync!
        </h2>

        {/* Mensagem de boas-vindas */}
        <div className="space-y-4 mb-6">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Seu período de teste <strong>gratuito de 15 dias</strong> está ativo!
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              O que você pode fazer agora:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
              <li>✓ Criar pedidos cirúrgicos com IA</li>
              <li>✓ Gerar laudos automatizados</li>
              <li>✓ Usar OCR para cadastro de pacientes</li>
              <li>✓ Acessar relatórios e controle financeiro</li>
              <li>✓ Receber suporte especializado</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                Sem compromisso
              </span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Teste todas as funcionalidades sem cartão de crédito. 
              Você decide se quer continuar no final do período.
            </p>
          </div>
        </div>

        {/* Botão para acessar o dashboard */}
        <button 
          type="button"
          onClick={() => {
            console.log('🎯 Redirecionando para dashboard');
            toast({
              title: "Bem-vindo ao MedSync!",
              description: "Sua conta foi criada com sucesso. Aproveite seu trial gratuito!",
            });
            
            // Invalidar cache do usuário e redirecionar
            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            setLocation('/welcome');
          }}
          className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg"
        >
          Começar a Usar o MedSync
        </button>

        {/* Botão para voltar */}
        <button 
          type="button"
          onClick={() => setCurrentStep('pricing')}
          className="mt-4 w-full py-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          disabled={registerWithPlanMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Planos
        </button>
      </div>
    );
  }

  // Tela de erro
  if (currentStep === 'error') {
    return (
      <div className="text-center px-4 py-6">
        {/* Ícone de erro */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Ops! Usuário já existe
        </h2>

        {/* Mensagem */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Já existe uma conta cadastrada com esses dados.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Se você já tem uma conta, faça login para acessar o sistema.
              Se esqueceu sua senha, use a opção "Esqueci minha senha".
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <button 
            type="button"
            onClick={onSwitchToLogin}
            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg"
          >
            Fazer Login
          </button>

          <button 
            type="button"
            onClick={() => setCurrentStep('form')}
            className="w-full border border-gray-300 hover:bg-gray-100 py-2 rounded-lg transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Fallback: retornar ao formulário se currentStep não for reconhecido
  return (
    <div>
      <ProgressIndicator />
      <RegisterForm 
        onSubmit={handleFormSubmit}
        onSwitchToLogin={onSwitchToLogin}
        isLoading={isLoading}
        validationErrors={validationErrors}
        onFieldValidation={onFieldValidation}
        defaultValues={preloadedFormData || formData || undefined}
      />
    </div>
  );
}
