import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, LogOut, Loader2, Calendar, ShieldAlert, XCircle } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { apiRequest } from '@/lib/queryClient';
import medSyncLogo from '@/assets/medsync-logo-new.svg';

interface PastDueModalProps {
  isOpen: boolean;
  daysOverdue: number;
  userName?: string;
  isBlocking?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

export function PastDueModal({ 
  isOpen, 
  daysOverdue, 
  userName, 
  isBlocking = false, 
  onClose, 
  onLogout 
}: PastDueModalProps) {

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

  const handleClose = () => {
    if (!isBlocking && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    onLogout?.();
  };

  const daysRemaining = Math.max(0, 15 - daysOverdue);

  return (
    <Dialog open={isOpen} onOpenChange={isBlocking ? undefined : handleClose}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden border-none"
        onPointerDownOutside={isBlocking ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isBlocking ? (e) => e.preventDefault() : undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Pagamento em Atraso</DialogTitle>
          <DialogDescription>
            Seu pagamento está em atraso. Atualize sua forma de pagamento para continuar usando o MedSync.
          </DialogDescription>
        </VisuallyHidden>

        <div className={`relative px-6 py-6 text-center ${
          isBlocking 
            ? 'bg-gradient-to-br from-red-50 via-orange-50 to-red-100 dark:from-red-900/30 dark:via-orange-900/20 dark:to-red-900/30' 
            : 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-amber-900/30'
        }`}>
          <div className="absolute inset-0 bg-white/40 dark:bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <img src={medSyncLogo} alt="MedSync" className="h-12 object-contain" />
            </div>
            
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isBlocking 
                ? 'bg-red-100 dark:bg-red-900/50' 
                : 'bg-amber-100 dark:bg-amber-900/50'
            }`}>
              {isBlocking ? (
                <ShieldAlert className={`h-8 w-8 text-red-600 dark:text-red-400`} />
              ) : (
                <AlertTriangle className={`h-8 w-8 text-amber-600 dark:text-amber-400`} />
              )}
            </div>

            {userName && (
              <p className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Dr(a). {userName}
              </p>
            )}
            
            <h2 className={`text-xl font-bold mb-1 ${
              isBlocking 
                ? 'text-red-800 dark:text-red-300' 
                : 'text-amber-800 dark:text-amber-300'
            }`} style={{ fontFamily: 'Nunito, sans-serif' }}>
              {isBlocking ? 'Acesso Suspenso' : 'Pagamento em Atraso'}
            </h2>
            
            <p className={`text-sm ${
              isBlocking 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isBlocking 
                ? 'Sua assinatura foi suspensa por falta de pagamento.'
                : `Há ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''} não conseguimos processar seu pagamento.`
              }
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!isBlocking && daysRemaining > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-300">
                  {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
                </p>
                <p className="text-orange-600 dark:text-orange-400 text-xs">
                  Após este prazo, seu acesso será suspenso.
                </p>
              </div>
            </div>
          )}

          {isBlocking && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-300">
                  Acesso bloqueado
                </p>
                <p className="text-red-600 dark:text-red-400 text-xs">
                  Regularize seu pagamento para voltar a usar o sistema.
                </p>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              Atualize sua forma de pagamento no portal seguro do Stripe 
              para resolver esta pendência.
            </p>
          </div>

          <Button
            onClick={handleUpdatePayment}
            disabled={billingPortalMutation.isPending}
            className={`w-full ${
              isBlocking 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-amber-600 hover:bg-amber-700'
            } text-white`}
            size="lg"
            data-testid="button-update-payment-modal"
          >
            {billingPortalMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Abrindo portal...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Atualizar Forma de Pagamento
              </>
            )}
          </Button>

          <div className="flex gap-2">
            {!isBlocking && onClose && (
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-later"
              >
                Depois
              </Button>
            )}
            
            {onLogout && (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={`${isBlocking ? 'flex-1' : ''} text-gray-500 hover:text-gray-700`}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
