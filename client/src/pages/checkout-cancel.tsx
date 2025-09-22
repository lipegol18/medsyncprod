import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { XCircle, ArrowLeft, Home, CreditCard } from 'lucide-react';

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Pagamento Cancelado</CardTitle>
          <CardDescription>
            Você cancelou o processo de pagamento. Nenhuma cobrança foi feita.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Informações sobre o cancelamento */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              O que aconteceu?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Nenhuma cobrança foi processada</li>
              <li>• Seus dados estão seguros</li>
              <li>• Você pode tentar novamente a qualquer momento</li>
            </ul>
          </div>

          {/* Motivos comuns */}
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">
              Motivos comuns para cancelamento:
            </h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Mudança de ideia sobre o plano</li>
              <li>• Problemas com dados do cartão</li>
              <li>• Necessidade de revisar os termos</li>
              <li>• Fechou a janela por acidente</li>
            </ul>
          </div>

          {/* Call to actions */}
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation('/')}
              className="w-full bg-accent hover:bg-accent/90"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Tentar Pagamento Novamente
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setLocation('/')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              
              <Button 
                variant="ghost"
                onClick={() => setLocation('/welcome')}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>

          {/* Ajuda */}
          <div className="border-t pt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Precisa de ajuda?
            </p>
            <Button 
              variant="link"
              size="sm"
              onClick={() => setLocation('/contact')}
              className="text-accent"
            >
              Entre em contato conosco
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}