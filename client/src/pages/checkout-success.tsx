import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock, CreditCard, AlertCircle, Home } from 'lucide-react';

interface CheckoutSession {
  id: string;
  status: string;
  payment_status: string;
  customer_email: string;
  amount_total: number;
  subscription?: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
  };
  metadata?: {
    userId?: string;
    planId?: string;
  };
}

interface SuccessPageData {
  success: boolean;
  session?: CheckoutSession;
  user?: {
    id: number;
    email: string;
    firstName: string;
    subscription?: {
      status: string;
      planName: string;
    };
  };
  message?: string;
}

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/checkout/success');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Extrair session_id da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('session_id');
    setSessionId(id);
  }, []);

  // Polling para verificar status do checkout até webhook completar
  const { data: successData, isLoading, error, refetch } = useQuery<SuccessPageData>({
    queryKey: [`/api/payments/checkout-success?session_id=${sessionId}`, sessionId],
    enabled: !!sessionId,
    refetchInterval: (data) => {
      // Se já processou com sucesso ou erro, parar polling fff
      if (data?.success === true || data?.success === false) {
        return false;
      }
      // Continuar polling a cada 2 segundos se ainda processando
      return 2000;
    },
    retry: 3,
    staleTime: 0, // Sempre refetch
  });

  // Efeito para mostrar toast e invalidar cache quando processamento completa
  useEffect(() => {
    if (successData?.success && successData.user) {
      // Invalidar cache do usuário para atualizar status da subscription
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "🎉 Pagamento Processado!",
        description: `Sua assinatura foi ativada com sucesso. Bem-vindo ao MedSync!`,
      });
    }
  }, [successData, queryClient, toast]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Erro na URL</CardTitle>
            <CardDescription>
              Session ID não encontrado na URL. Esta página deve ser acessada após um pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <CardTitle className="text-blue-900">Processando Pagamento</CardTitle>
            <CardDescription>
              Aguarde enquanto confirmamos seu pagamento e ativamos sua assinatura...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              Este processo pode levar alguns segundos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Erro no Processamento</CardTitle>
            <CardDescription>
              Ocorreu um erro ao verificar o status do pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Se o pagamento foi aprovado, ele será processado em alguns minutos.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => refetch()}
                className="flex-1"
              >
                Tentar Novamente
              </Button>
              <Button 
                onClick={() => setLocation('/welcome')}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagamento processado com sucesso
  if (successData?.success && successData.user) {
    const { user, session } = successData;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-900">
              🎉 Pagamento Aprovado!
            </CardTitle>
            <CardDescription className="text-lg">
              Sua assinatura foi ativada com sucesso
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Informações do usuário */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Bem-vindo ao MedSync, {user.firstName}!
              </h3>
              <p className="text-sm text-blue-800">
                Email: {user.email}
              </p>
              {user.subscription && (
                <p className="text-sm text-blue-800">
                  Plano: {user.subscription.planName}
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    {user.subscription.status}
                  </span>
                </p>
              )}
            </div>

            {/* Informações da transação */}
            {session && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Detalhes da Transação
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>ID: {session.id}</p>
                  <p>Status: <span className="text-green-600 font-medium">{session.status}</span></p>
                  {session.amount_total && (
                    <p>Valor: R$ {(session.amount_total / 100).toFixed(2).replace('.', ',')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Call to action */}
            <div className="text-center space-y-3">
              <p className="text-gray-600">
                Sua conta está pronta! Comece a usar todas as funcionalidades do MedSync.
              </p>
              
              <Button 
                onClick={() => setLocation('/welcome')}
                size="lg"
                className="w-full bg-accent hover:bg-accent/90"
              >
                <Home className="w-4 h-4 mr-2" />
                Acessar Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado de processamento pendente
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-yellow-900">Pagamento Pendente</CardTitle>
          <CardDescription>
            {successData?.message || 'Aguardando confirmação do pagamento...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-sm text-gray-600">
            Processamento automático em andamento...
          </p>
          <Button 
            variant="outline"
            onClick={() => setLocation('/welcome')}
            className="w-full"
          >
            Continuar para Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
