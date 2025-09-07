import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, CreditCard, Shield, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Configurar Stripe - usar chave pública de teste
const STRIPE_PUBLIC_KEY = 'pk_test_51S43b8BDo1YVjn0iA29tn753TDK4YTsWFc8QfYJV90EpdltYqJ0xoZbp8akaT9IHEyQwtsPyPF2YhbDfW7PcNfvH00hBlxfmCd';
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  features: string[];
  trialDays: number;
  stripePriceId: string | null;
  isPopular: boolean;
  isActive: boolean;
}

const CheckoutForm = ({ plan }: { plan: SubscriptionPlan }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/welcome`,
        },
      });

      if (error) {
        toast({
          title: "Erro no Pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Pagamento confirmado! Agora criar o usuário
        const registrationData = sessionStorage.getItem('registrationData');
        
        if (registrationData) {
          try {
            const userData = JSON.parse(registrationData);
            
            // Criar usuário via API
            const response = await apiRequest('POST', '/api/register', userData);
            
            if (response.ok) {
              // Tracking: marcar registro como completado
              fetch('/api/track-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: userData.email,
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
            toast({
              title: "Pagamento OK, mas...",
              description: "Houve um problema ao criar sua conta. Entre em contato conosco.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Pagamento Realizado!",
            description: "Sua assinatura foi ativada com sucesso.",
          });
          setLocation('/welcome');
        }
      }
    } catch (error) {
      toast({
        title: "Erro no Pagamento",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(priceInCents / 100);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      {/* Plan Summary */}
      <div className="space-y-6">
        <Card className="border-2 border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Resumo do Pedido</CardTitle>
              {plan.isPopular && (
                <Badge className="bg-accent text-white">
                  Mais Popular
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(plan.priceMonthly)}
                </div>
                <div className="text-sm text-gray-500">/mês</div>
              </div>
            </div>

            {plan.trialDays > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">
                    {plan.trialDays} dias de teste grátis
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Você só será cobrado após o período de teste
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Recursos inclusos:</h4>
              <ul className="space-y-2">
                {plan.features.slice(0, 5).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 5 && (
                  <li className="text-gray-500 text-sm ml-6">
                    + {plan.features.length - 5} outros recursos
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Pagamento 100% Seguro</h4>
                <p className="text-gray-600 text-sm">
                  Criptografia SSL e processamento via Stripe
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Informações de Pagamento
            </CardTitle>
            <CardDescription>
              Preencha os dados do seu cartão de crédito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <PaymentElement 
                  options={{
                    layout: 'tabs',
                    defaultValues: {
                      billingDetails: {
                        address: {
                          country: 'BR',
                        },
                      },
                    },
                  }}
                />
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={!stripe || !elements || isProcessing}
                  className="w-full bg-accent hover:bg-accent/90 text-white py-3 text-base font-semibold"
                  size="lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {plan.trialDays > 0 ? 'Iniciar Teste Grátis' : `Assinar por ${formatPrice(plan.priceMonthly)}/mês`}
                      <Zap className="w-4 h-4 ml-2" />
                    </div>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Ao continuar, você concorda com nossos{' '}
                  <a href="#" className="text-accent hover:underline">Termos de Serviço</a>{' '}
                  e{' '}
                  <a href="#" className="text-accent hover:underline">Política de Privacidade</a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Buscar planId do sessionStorage (vem do fluxo de registro)
  const storedPlanId = sessionStorage.getItem('selectedPlanId');
  const registrationData = sessionStorage.getItem('registrationData');
  const planId = storedPlanId;

  // Buscar dados do plano
  const { data: plans, isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const plan = plans?.find(p => p.id.toString() === planId);

  // Estado para client secret
  const [clientSecret, setClientSecret] = useState<string>("");

  // Mutation para criar assinatura
  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await apiRequest('POST', '/api/stripe/create-subscription', { planId });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar assinatura",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (plan && plan.stripePriceId && !clientSecret) {
      createSubscriptionMutation.mutate(plan.id);
    }
  }, [plan, clientSecret]);

  // Verificar se há dados de registro e plano + tracking
  useEffect(() => {
    if (!planId || !registrationData) {
      toast({
        title: "Sessão Expirada",
        description: "Por favor, faça o cadastro novamente.",
        variant: "destructive",
      });
      // Limpar sessionStorage
      sessionStorage.removeItem('selectedPlanId');
      sessionStorage.removeItem('registrationData');
      setLocation('/');
    } else {
      // Tracking: usuário chegou no checkout
      const userData = JSON.parse(registrationData);
      fetch('/api/track-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          currentStep: 'checkout_started',
          userAgent: navigator.userAgent,
        })
      }).catch(error => console.log('Erro ao atualizar tracking:', error));
    }
  }, [planId, registrationData, toast, setLocation]);
  
  if (!planId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Sessão expirada</p>
            <Link href="/">
              <Button>Fazer Cadastro</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingPlans || createSubscriptionMutation.isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Preparando checkout...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Plano não encontrado</p>
            <Link href="/subscription-plans">
              <Button>Ver Planos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Inicializando pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/subscription-plans">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Planos
            </Button>
          </Link>
          
          {/* Breadcrumb */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              {/* Etapa 1 - Dados (Completada) */}
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-green-600">
                  Seus dados
                </span>
              </div>
              
              {/* Linha conectora 1 */}
              <div className="w-12 h-0.5 bg-green-500" />
              
              {/* Etapa 2 - Planos (Completada) */}
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-green-600">
                  Escolha seu plano
                </span>
              </div>
              
              {/* Linha conectora 2 */}
              <div className="w-12 h-0.5 bg-accent" />
              
              {/* Etapa 3 - Pagamento (Atual) */}
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-accent text-white">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-accent">
                  Efetue o Pagamento
                </span>
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">
            Finalizar Assinatura
          </h1>
          <p className="text-gray-600 mt-2">
            Complete seu pagamento para começar a usar o MedSync
          </p>
        </div>

        {/* Checkout Form */}
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
          <CheckoutForm plan={plan} />
        </Elements>
      </div>
    </div>
  );
}