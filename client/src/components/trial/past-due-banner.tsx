import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface PastDueBannerProps {
  daysOverdue: number;
  onDismiss?: () => void;
}

export function PastDueBanner({ daysOverdue, onDismiss }: PastDueBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ portalUrl: string }>(
        '/api/subscriptions/billing-portal',
        'POST'
      );
      return response;
    },
    onSuccess: (data) => {
      if (data?.portalUrl) {
        window.location.href = data.portalUrl;
      }
    },
    onError: (error: any) => {
      console.error('Erro ao abrir portal de cobrança:', error);
    }
  });

  const handleUpdatePayment = () => {
    billingPortalMutation.mutate();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div 
      className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3"
      data-testid="past-due-banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-amber-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Pagamento em atraso
            </p>
            <p className="text-xs text-amber-600">
              {daysOverdue === 0 
                ? 'Não conseguimos processar seu pagamento. Atualize sua forma de pagamento para evitar suspensão.'
                : daysOverdue === 1
                  ? 'Há 1 dia não conseguimos processar seu pagamento. Atualize sua forma de pagamento.'
                  : `Há ${daysOverdue} dias não conseguimos processar seu pagamento. Atualize para evitar suspensão.`
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleUpdatePayment}
            disabled={billingPortalMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-update-payment"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {billingPortalMutation.isPending ? 'Abrindo...' : 'Atualizar Pagamento'}
          </Button>
          
          <button
            onClick={handleDismiss}
            className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
            aria-label="Fechar aviso"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
