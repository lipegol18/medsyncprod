import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { RegisterForm } from './register-form';
import { PricingSection } from './pricing-section';
import { type RegisterForm as RegisterFormType } from '@/schemas/auth-schemas';
import { type SubscriptionPlan } from '@/types/subscription';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

// Configurar Stripe - usar chave pública de teste
const STRIPE_PUBLIC_KEY = 'pk_test_51S43b8BDo1YVjn0iA29tn753TDK4YTsWFc8QfYJV90EpdltYqJ0xoZbp8akaT9IHEyQwtsPyPF2YhbDfW7PcNfvH00hBlxfmCd';
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

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
  const [currentStep, setCurrentStep] = useState<'form' | 'pricing' | 'payment' | 'trial-welcome' | 'error'>('form');
  const [formData, setFormData] = useState<RegisterFormType | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [crmValidationStatus, setCrmValidationStatus] = useState<{ [key: string]: 'validating' | 'valid' | 'invalid' }>({});

  // Buscar planos de assinatura
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  // Inicializar Stripe quando necessário
  useEffect(() => {
    if (currentStep === 'payment' && selectedPlanId && !clientSecret && selectedPlan?.stripePriceId) {
      createSubscriptionMutation.mutate(selectedPlanId);
    }
  }, [currentStep, selectedPlanId, clientSecret, selectedPlan?.stripePriceId]);

  // Mutation para registro com plano (novo sistema)
  const registerWithPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      if (!formData) throw new Error("Dados do formulário não encontrados");
      
      console.log('🚀 Enviando dados para registro com plano:', { planId, userData: formData });
      
      const data = await apiRequest('/api/register-with-plan', 'POST', { 
        planId,
        ...formData
      });
      
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ Registro com plano bem-sucedido:', data);
      
      if (data.trialActive) {
        // Para plano START - mostrar tela de boas-vindas primeiro
        console.log('🎯 Trial ativo - indo para tela de boas-vindas');
        setCurrentStep('trial-welcome');
      } else if (data.requiresPayment) {
        // Para outros planos - continuar para pagamento
        toast({
          title: "Dados salvos!",
          description: "Complete o pagamento para ativar sua conta.",
        });
        createSubscriptionMutation.mutate(data.planId);
      }
    },
    onError: (error: any) => {
      console.error('❌ Erro no registro com plano:', error);
      
      // Ir para tela de erro ao invés de apenas mostrar toast
      setCurrentStep('error');
    }
  });

  // Mutation para validar CRM via webhook externo
  const validateCrmMutation = useMutation({
    mutationFn: async ({ crm, crmUf }: { crm: string; crmUf: string }) => {
      const response = await fetch('https://lipegol18.app.n8n.cloud/webhook/validar-crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crm, crmUf }),
      });
      
      if (!response.ok) {
        throw new Error('Falha na validação do CRM');
      }
      
      return response.json();
    },
    onMutate: ({ crm, crmUf }) => {
      // Definir status como validando
      const crmKey = `${crm}-${crmUf}`;
      setCrmValidationStatus(prev => ({ ...prev, [crmKey]: 'validating' }));
    },
    onSuccess: (data, { crm, crmUf }) => {
      const crmKey = `${crm}-${crmUf}`;
      // Assumir que o webhook retorna { valid: boolean }
      setCrmValidationStatus(prev => ({ ...prev, [crmKey]: data.valid ? 'valid' : 'invalid' }));
      
      if (!data.valid) {
        toast({
          title: "CRM Inválido",
          description: "O número de CRM informado não foi encontrado no sistema do CFM.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "CRM Validado",
          description: "CRM confirmado no sistema do CFM.",
          variant: "default",
        });
      }
    },
    onError: (error: any, { crm, crmUf }) => {
      const crmKey = `${crm}-${crmUf}`;
      setCrmValidationStatus(prev => ({ ...prev, [crmKey]: 'invalid' }));
      
      toast({
        title: "Erro na Validação",
        description: "Não foi possível validar o CRM. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar assinatura no Stripe (planos pagos)
  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: number) => {
      if (!formData) throw new Error("Dados do formulário não encontrados");
      
      console.log('🚀 Enviando dados para criar assinatura Stripe:', { planId, userData: formData });
      
      const data = await apiRequest('/api/stripe/create-subscription-for-registration', 'POST', { 
        planId, 
        userData: formData 
      });
      
      console.log('✅ Dados recebidos:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🎉 Sucesso! clientSecret:', data.clientSecret);
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      console.error('💥 Erro na mutation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar assinatura",
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
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          cpf: data.cpf,
          phone: data.phone,
          username: data.username,
          currentStep: 'form_completed',
          userAgent: navigator.userAgent,
          source: 'direct'
        })
      });
    } catch (error) {
      console.log('Erro ao registrar lead:', error);
      // Não bloquear o fluxo por erro de tracking
    }
    
    setCurrentStep('pricing');
  };

  const handleBackToForm = () => {
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
    console.log(`📋 Plano ${planId} selecionado (apenas visual)`);
  };

  // Função para executar a ação do plano selecionado
  const handlePlanAction = (planId: number) => {
    console.log(`🚀 handlePlanAction chamado com planId: ${planId}`);
    
    // NOVO FLUXO: Para plano START (ID 1), criar usuário imediatamente e depois mostrar boas-vindas
    if (planId === 1) {
      console.log('🎯 Plano START detectado - criando usuário primeiro');
      registerWithPlanMutation.mutate(planId);
    } else {
      // Para outros planos, ir para pagamento
      console.log(`💳 Plano ${planId} - indo para pagamento`);
      if (formData && selectedPlan?.stripePriceId) {
        const completeData = { ...formData, selectedPlanId: planId };
        
        sessionStorage.setItem('registrationData', JSON.stringify(completeData));
        sessionStorage.setItem('selectedPlanId', planId.toString());
        
        setCurrentStep('payment');
        createSubscriptionMutation.mutate(planId);
      } else {
        console.log('❌ Dados insuficientes para pagamento:', { formData: !!formData, stripePriceId: selectedPlan?.stripePriceId });
      }
    }
  };

  const handleAdvanceToPayment = () => {
    // Executar a ação do plano selecionado
    if (selectedPlanId) {
      handlePlanAction(selectedPlanId);
    }
  };

  // Função para validar campos incluindo validação de CRM via webhook
  const handleFieldValidation = (field: 'cpf' | 'crm' | 'phone' | 'email' | 'username', value: string, additionalData?: any) => {
    // Chamar a validação original
    onFieldValidation(field, value);
    
    // Se for campo CRM e tivermos dados suficientes, validar via webhook
    if (field === 'crm' && value && additionalData?.crmUf) {
      validateCrmMutation.mutate({ 
        crm: value, 
        crmUf: additionalData.crmUf 
      });
    }
  };

  // Indicador de progresso
  const ProgressIndicator = () => (
    <div className="flex items-center justify-center mb-4 sm:mb-6 px-2">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Etapa 1 - Dados */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            currentStep === 'form' ? 'bg-accent text-white' : 
            (currentStep === 'pricing' || currentStep === 'payment') ? 'bg-green-500 text-white' : 
            'bg-gray-300 text-gray-600'
          }`}>
            {(currentStep === 'pricing' || currentStep === 'payment') ? '✓' : '1'}
          </div>
          <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${
            currentStep === 'form' ? 'text-accent' : 
            (currentStep === 'pricing' || currentStep === 'payment') ? 'text-green-600' : 
            'text-gray-500'
          }`}>
            <span className="hidden sm:inline">Seus dados</span>
            <span className="sm:hidden">Dados</span>
          </span>
        </div>
        
        {/* Linha conectora 1 */}
        <div className={`w-6 sm:w-12 h-0.5 ${
          (currentStep === 'pricing' || currentStep === 'payment') ? 'bg-green-500' : 'bg-gray-300'
        }`} />
        
        {/* Etapa 2 - Planos */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            currentStep === 'pricing' ? 'bg-accent text-white' : 
            currentStep === 'payment' ? 'bg-green-500 text-white' : 
            'bg-gray-300 text-gray-600'
          }`}>
            {currentStep === 'payment' ? '✓' : '2'}
          </div>
          <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${
            currentStep === 'pricing' ? 'text-accent' : 
            currentStep === 'payment' ? 'text-green-600' : 
            'text-gray-500'
          }`}>
            <span className="hidden sm:inline">Escolha seu plano</span>
            <span className="sm:hidden">Plano</span>
          </span>
        </div>
        
        {/* Linha conectora 2 */}
        <div className={`w-6 sm:w-12 h-0.5 ${
          currentStep === 'payment' ? 'bg-accent' : 'bg-gray-300'
        }`} />
        
        {/* Etapa 3 - Pagamento */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            currentStep === 'payment' ? 'bg-accent text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            3
          </div>
          <span className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${
            currentStep === 'payment' ? 'text-accent' : 'text-gray-500'
          }`}>
            <span className="hidden sm:inline">Efetue o Pagamento</span>
            <span className="sm:hidden">Pagamento</span>
          </span>
        </div>
      </div>
    </div>
  );

  if (currentStep === 'pricing') {
    return (
      <div>
        <ProgressIndicator />
        
        {/* Header da seção de preços com botão */}
        <div className="relative mb-6">
          <button
            onClick={handleBackToForm}
            className="absolute left-0 top-0 flex items-center text-accent hover:text-accent/80 text-sm font-bold transition-colors"
          >
            ← Voltar aos dados
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">Quase lá!</h2>
            <p className="text-gray-600 leading-relaxed font-bold text-sm">
              Agora escolha o plano ideal para você
            </p>
          </div>
        </div>

        <PricingSection 
          onPlanSelection={handlePlanSelection}
          selectedPlanId={selectedPlanId || undefined}
          onAdvanceToPayment={handleAdvanceToPayment}
        />
      </div>
    );
  }

  // Etapa de pagamento
  if (currentStep === 'payment') {
    // Componente interno de checkout
    const CheckoutFormComponent = () => {
      const stripe = useStripe();
      const elements = useElements();
      const [isProcessing, setIsProcessing] = useState(false);

      const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!stripe || !elements || !formData) return;
        
        setIsProcessing(true);

        try {
          // Confirmar pagamento com Stripe
          const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/payment-success`,
            },
            redirect: 'if_required'
          });

          if (error) {
            toast({
              title: "Erro no Pagamento",
              description: error.message,
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          // Se chegou aqui, pagamento foi bem-sucedido
          try {
            // Criar usuário via API
            const userData = { ...formData, selectedPlanId };
            const response = await apiRequest('POST', '/api/register', userData);
            
            if (response.ok) {
              // Tracking: marcar registro como completado
              fetch('/api/track-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: formData.email,
                  currentStep: 'completed',
                  userAgent: navigator.userAgent,
                })
              }).catch(() => {}); // Ignorar erro de tracking
              
              // Limpar sessionStorage
              sessionStorage.removeItem('registrationData');
              sessionStorage.removeItem('selectedPlanId');
              
              toast({
                title: "Conta Criada com Sucesso!",
                description: "Sua assinatura foi ativada e conta criada.",
              });
              
              setLocation('/welcome');
            } else {
              throw new Error('Erro ao criar conta');
            }
          } catch (userError) {
            console.error('Erro ao criar usuário:', userError);
            toast({
              title: "Pagamento Aprovado",
              description: "Pagamento processado, mas houve erro ao criar conta. Contate o suporte.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Erro no pagamento:', error);
          toast({
            title: "Erro no Pagamento",
            description: "Ocorreu um erro inesperado. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      return (
        <form onSubmit={handlePaymentSubmit} className="space-y-6">
          <PaymentElement />
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep('pricing')}
              className="flex-1 text-sm sm:text-base py-2 sm:py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Voltar aos Planos</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
            <Button
              type="submit"
              disabled={!stripe || !elements || isProcessing}
              className="flex-1 text-sm sm:text-base py-2 sm:py-3"
            >
              {isProcessing ? 'Processando...' : (
                <>
                  <span className="hidden sm:inline">Finalizar Pagamento</span>
                  <span className="sm:hidden">Finalizar</span>
                </>
              )}
            </Button>
          </div>
        </form>
      );
    };

    return (
      <div>
        <ProgressIndicator />
        
        {/* Header da seção de pagamento */}
        <div className="text-center mb-4 sm:mb-6 px-2">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">Finalizar Assinatura</h2>
          <p className="text-gray-600 leading-relaxed font-bold text-xs sm:text-sm">
            Complete seu pagamento para começar a usar o MedSync
          </p>
        </div>

        {/* Resumo do plano selecionado */}
        {selectedPlan && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Plano Selecionado: {selectedPlan.name}</h3>
            <p className="text-gray-600 text-xs sm:text-sm mb-2">{selectedPlan.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-accent">
                R$ {(selectedPlan.price / 100).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-sm text-gray-500">por mês</span>
            </div>
          </div>
        )}

        {/* Checkout Form */}
        <div className="px-1 sm:px-0">
        {clientSecret ? (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#2ca8e0',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                  colorDanger: '#ef4444',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <CheckoutFormComponent />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Inicializando pagamento...</p>
          </div>
        )}
        </div>
      </div>
    );
  }

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
        <Button 
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
          size="lg"
          className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3"
        >
          Começar a Usar o MedSync
        </Button>

        {/* Botão para voltar */}
        <Button 
          variant="ghost" 
          onClick={() => setCurrentStep('pricing')}
          className="mt-4 w-full"
          disabled={registerWithPlanMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Planos
        </Button>
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
          Ops! Algo deu errado
        </h2>

        {/* Mensagem de erro */}
        <div className="space-y-4 mb-6">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Ocorreu um problema técnico durante a criação da sua conta.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              Isso pode ter acontecido porque:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1 text-left">
              <li>• O email ou CPF já estão cadastrados no sistema</li>
              <li>• Houve uma instabilidade temporária no servidor</li>
              <li>• Alguns dados podem estar em formato incorreto</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              O que você pode fazer:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
              <li>✓ Tente novamente em alguns minutos</li>
              <li>✓ Verifique se seus dados estão corretos</li>
              <li>✓ Entre em contato com nosso suporte se o problema persistir</li>
            </ul>
          </div>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <Button 
            onClick={() => {
              // Voltar para seleção de planos para tentar novamente
              setCurrentStep('pricing');
            }}
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3"
          >
            Tentar Novamente
          </Button>

          <Button 
            variant="outline" 
            onClick={() => {
              // Voltar para o formulário de dados
              setCurrentStep('form');
            }}
            className="w-full"
          >
            Verificar Meus Dados
          </Button>

          <div className="text-sm text-gray-500 mt-4">
            Precisa de ajuda? Entre em contato com nosso suporte: 
            <br />
            <a href="mailto:suporte@medsync.com.br" className="text-accent hover:underline">
              suporte@medsync.com.br
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ProgressIndicator />
      <RegisterForm
        onSubmit={handleFormSubmit}
        onSwitchToLogin={onSwitchToLogin}
        isLoading={isLoading}
        validationErrors={validationErrors}
        onFieldValidation={handleFieldValidation}
      />
    </div>
  );
}