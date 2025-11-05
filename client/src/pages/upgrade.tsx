import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
}

export default function Upgrade() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  // Extrair parâmetros da URL
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan');
  const billingInterval = params.get('billing') as 'monthly' | 'yearly';
  const canceled = params.get('canceled');

  // Buscar planos
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const plan = plans?.find(p => p.id.toString() === planId);

  useEffect(() => {
    if (canceled === 'true') {
      toast({
        title: "Checkout Cancelado",
        description: "Você cancelou o processo de pagamento.",
        variant: "destructive",
      });
    }
  }, [canceled, toast]);

  useEffect(() => {
    // Iniciar checkout automaticamente quando a página carregar
    if (planId && billingInterval && !canceled) {
      handleStartCheckout();
    }
  }, [planId, billingInterval, canceled]);

  const handleStartCheckout = async () => {
    if (!planId || !billingInterval) {
      toast({
        title: "Erro",
        description: "Parâmetros inválidos",
        variant: "destructive",
      });
      setLocation('/welcome');
      return;
    }

    setIsCreatingCheckout(true);

    try {
      const response = await apiRequest('/api/create-upgrade-checkout', 'POST', {
        planId: parseInt(planId),
        billingInterval
      });

      if (response.success && response.checkoutUrl) {
        // Redirecionar para Stripe Checkout
        window.location.href = response.checkoutUrl;
      } else {
        throw new Error(response.message || 'Erro ao criar checkout');
      }
    } catch (error: any) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: "Erro ao Processar Upgrade",
        description: error.message || "Não foi possível iniciar o processo de pagamento. Tente novamente.",
        variant: "destructive",
      });
      setIsCreatingCheckout(false);
    }
  };

  if (!planId || !billingInterval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Parâmetros Inválidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Não foi possível processar sua solicitação de upgrade. Por favor, tente novamente.
            </p>
            <Button 
              onClick={() => setLocation('/welcome')}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {isCreatingCheckout ? 'Preparando Checkout...' : 'Upgrade de Plano'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isCreatingCheckout ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">
                Redirecionando para pagamento seguro via Stripe...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Por favor, aguarde.
              </p>
            </div>
          ) : (
            <>
              {plan && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#2ca8e0' }}>
                    Plano {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {plan.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Cobrança:
                    </span>
                    <span className="font-bold text-lg" style={{ color: '#2ca8e0' }}>
                      {billingInterval === 'yearly' ? 'Anual' : 'Mensal'}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleStartCheckout}
                className="w-full"
                style={{ 
                  background: 'linear-gradient(135deg, #2ca8e0 0%, #36a9e1 100%)'
                }}
              >
                Iniciar Pagamento
              </Button>

              <Button 
                variant="outline"
                onClick={() => setLocation('/welcome')}
                className="w-full"
              >
                Cancelar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
