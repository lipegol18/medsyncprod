import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Configurar Stripe - usar chave pública de teste
const STRIPE_PUBLIC_KEY = 'pk_test_51S43b8BDo1YVjn0iA29tn753TDK4YTsWFc8QfYJV90EpdltYqJ0xoZbp8akaT9IHEyQwtsPyPF2YhbDfW7PcNfvH00hBlxfmCd';
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

interface TestResult {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp?: string;
  data?: any;
}

// Componente para configurar o Payment Intent (sem hooks do Stripe)
const PaymentIntentConfig = ({ onClientSecretCreated }: { onClientSecretCreated: (clientSecret: string) => void }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('100.00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [{ ...result, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  };

  const createPaymentIntent = async () => {
    try {
      setIsProcessing(true);
      
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Valor inválido');
      }

      addResult({
        type: 'info',
        title: 'Criando Payment Intent',
        message: `Iniciando criação do Payment Intent para R$ ${amount}`,
      });

      const response = await apiRequest('/api/payments/create-payment-intent', 'POST', {
        amount: numericAmount
      });

      addResult({
        type: 'success',
        title: 'Payment Intent Criado',
        message: `Client Secret recebido com sucesso`,
        data: { clientSecret: response.clientSecret }
      });

      onClientSecretCreated(response.clientSecret);
      return response.clientSecret;

    } catch (error: any) {
      addResult({
        type: 'error',
        title: 'Erro ao Criar Payment Intent',
        message: error.message || 'Erro desconhecido'
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Configurar Teste de Pagamento
          </CardTitle>
          <CardDescription>
            Configure e crie um Payment Intent para teste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              data-testid="input-amount"
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={createPaymentIntent}
              disabled={isProcessing}
              variant="outline"
              data-testid="button-create-payment-intent"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Criar Payment Intent
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados dos Testes */}
      <TestResultsSection results={results} />
    </div>
  );
};

// Componente para teste de Payment Intent (dentro do contexto Elements)
const PaymentIntentTest = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [{ ...result, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  };

  const processPayment = async () => {
    if (!stripe || !elements) {
      toast({
        title: "Erro",
        description: "Stripe não inicializado",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      addResult({
        type: 'info',
        title: 'Processando Pagamento',
        message: 'Confirmando pagamento com Stripe...'
      });

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      });

      if (error) {
        addResult({
          type: 'error',
          title: 'Erro no Pagamento',
          message: error.message || 'Erro desconhecido',
          data: error
        });
      } else {
        addResult({
          type: 'success',
          title: 'Pagamento Aprovado',
          message: `Pagamento processado com sucesso (${paymentIntent.status})`,
          data: { 
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount
          }
        });
      }

    } catch (error: any) {
      addResult({
        type: 'error',
        title: 'Erro Inesperado',
        message: error.message || 'Erro desconhecido'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Formulário de Teste
          </CardTitle>
          <CardDescription>
            Use os dados de teste do Stripe para simular pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

            <Button 
              onClick={processPayment}
              disabled={!stripe || !elements || isProcessing}
              className="w-full"
              data-testid="button-process-payment"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Processar Pagamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados dos Testes */}
      <TestResultsSection results={results} />
    </div>
  );
};

// Componente para teste de assinaturas
const SubscriptionTest = () => {
  const { toast } = useToast();
  const [planId, setPlanId] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [{ ...result, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  };

  const createSubscription = async () => {
    try {
      setIsProcessing(true);
      
      addResult({
        type: 'info',
        title: 'Criando Assinatura',
        message: `Iniciando criação da assinatura para plano ${planId}`,
      });

      const response = await apiRequest('/api/payments/create-subscription', 'POST', {
        planId: parseInt(planId)
      });

      addResult({
        type: 'success',
        title: 'Assinatura Criada',
        message: `Assinatura criada com sucesso`,
        data: response
      });

    } catch (error: any) {
      addResult({
        type: 'error',
        title: 'Erro ao Criar Assinatura',
        message: error.message || 'Erro desconhecido'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const testRegistrationWithPlan = async () => {
    try {
      setIsProcessing(true);
      
      const mockUserData = {
        name: 'Usuário Teste',
        firstName: 'Usuário',
        lastName: 'Teste',
        username: `teste_${Date.now()}`,
        email: `teste_${Date.now()}@exemplo.com`,
        password: 'senha123',
        roleId: 2
      };
      
      addResult({
        type: 'info',
        title: 'Testando Registro com Plano',
        message: `Testando registro de usuário com plano ${planId}`,
        data: { userData: mockUserData }
      });

      const response = await apiRequest('/api/payments/create-subscription-for-registration', 'POST', {
        planId: parseInt(planId),
        userData: mockUserData
      });

      addResult({
        type: 'success',
        title: 'Registro com Plano Testado',
        message: `Endpoint testado com sucesso`,
        data: response
      });

    } catch (error: any) {
      addResult({
        type: 'error',
        title: 'Erro no Teste de Registro',
        message: error.message || 'Erro desconhecido'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Teste de Assinaturas
          </CardTitle>
          <CardDescription>
            Teste a criação de assinaturas e integração com registro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planId">ID do Plano</Label>
            <Input
              id="planId"
              type="number"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              placeholder="1"
              data-testid="input-plan-id"
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={createSubscription}
              disabled={isProcessing}
              variant="outline"
              data-testid="button-create-subscription"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Criar Assinatura
            </Button>

            <Button 
              onClick={testRegistrationWithPlan}
              disabled={isProcessing}
              variant="outline"
              data-testid="button-test-registration"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Testar Registro com Plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados dos Testes */}
      <TestResultsSection results={results} />
    </div>
  );
};

// Componente para exibir resultados dos testes
const TestResultsSection = ({ results }: { results: TestResult[] }) => {
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Resultados dos Testes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Nenhum teste executado ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Resultados dos Testes
        </CardTitle>
        <CardDescription>
          Últimos {results.length} resultados (mais recentes primeiro)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <Alert key={index} className={`${
              result.type === 'success' ? 'border-green-200 bg-green-50' :
              result.type === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  {result.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                  {result.type === 'error' && <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                  {result.type === 'info' && <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />}
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-sm">{result.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {result.timestamp}
                      </Badge>
                    </div>
                    <AlertDescription className="text-xs mt-1">
                      {result.message}
                    </AlertDescription>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">
                          Ver dados (clique para expandir)
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Seção de cartões de teste
const TestCardsInfo = () => (
  <Card>
    <CardHeader>
      <CardTitle>Cartões de Teste do Stripe</CardTitle>
      <CardDescription>
        Use estes dados para simular diferentes cenários de pagamento
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium text-green-600">✅ Pagamentos Aprovados</h4>
          <div className="text-sm space-y-1">
            <div><strong>4242 4242 4242 4242</strong> - Visa</div>
            <div><strong>5555 5555 5555 4444</strong> - Mastercard</div>
            <div><strong>3782 822463 10005</strong> - Amex</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-red-600">❌ Pagamentos Rejeitados</h4>
          <div className="text-sm space-y-1">
            <div><strong>4000 0000 0000 0002</strong> - Cartão recusado</div>
            <div><strong>4000 0000 0000 9995</strong> - Fundos insuficientes</div>
            <div><strong>4000 0000 0000 0069</strong> - Cartão expirado</div>
          </div>
        </div>
      </div>
      
      <Separator className="my-4" />
      
      <div className="text-sm text-gray-600">
        <p><strong>CVC:</strong> Qualquer número de 3 dígitos (ex: 123)</p>
        <p><strong>Data:</strong> Qualquer data futura (ex: 12/34)</p>
        <p><strong>CEP:</strong> Qualquer CEP válido (ex: 01310-100)</p>
      </div>
    </CardContent>
  </Card>
);

export default function StripeTest() {
  const [clientSecret, setClientSecret] = useState<string>("");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <TestTube className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Testes do Stripe
            </h1>
            <p className="text-gray-600">
              Página para testar e validar a integração com o Stripe
            </p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Esta é uma página de desenvolvimento para testar a integração com Stripe. 
            Use apenas cartões de teste fornecidos pelo Stripe.
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal - testes */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="payment-intent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payment-intent" data-testid="tab-payment-intent">
                Pagamento Único
              </TabsTrigger>
              <TabsTrigger value="subscription" data-testid="tab-subscription">
                Assinaturas
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="payment-intent" className="mt-6">
              {clientSecret ? (
                <div className="space-y-6">
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
                    <PaymentIntentTest />
                  </Elements>
                </div>
              ) : (
                <PaymentIntentConfig onClientSecretCreated={setClientSecret} />
              )}
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-6">
              <SubscriptionTest />
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna lateral - informações */}
        <div className="space-y-6">
          <TestCardsInfo />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuração Atual</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div>
                <strong>Ambiente:</strong> Teste
              </div>
              <div>
                <strong>Chave Pública:</strong> 
                <code className="block text-xs bg-gray-100 p-1 rounded mt-1">
                  {STRIPE_PUBLIC_KEY.substring(0, 20)}...
                </code>
              </div>
              <div>
                <strong>Versão da API:</strong> 2023-10-16
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}