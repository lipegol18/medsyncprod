import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Star, Building2, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { type SubscriptionPlan } from '@/types/subscription';

interface TrialExpiredModalProps {
  isOpen: boolean;
  trialEndDate?: string;
}

export function TrialExpiredModal({ isOpen, trialEndDate }: TrialExpiredModalProps) {
  const [, setLocation] = useLocation();
  const [selectedPlanId, setSelectedPlanId] = useState<number>(2); // Default to PRO

  // Buscar planos de assinatura
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatTrialEndDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleUpgrade = () => {
    // Redirecionar para página de pagamento com plano selecionado
    setLocation(`/checkout?plan=${selectedPlanId}`);
  };

  const paidPlans = plans?.filter(plan => plan.id !== 1) || [];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Seu período gratuito expirou
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600 dark:text-gray-400">
            {trialEndDate && (
              <>Seu trial de 15 dias terminou em {formatTrialEndDate(trialEndDate)}.</>
            )}
            <br />
            Escolha um plano para continuar usando o MedSync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Grid de planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paidPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedPlanId === plan.id 
                    ? 'ring-2 ring-accent border-accent' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {plan.id === 2 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-white"
                  >
                    Mais Popular
                  </Badge>
                )}
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {plan.id === 2 ? (
                        <Zap className="w-6 h-6 text-accent" />
                      ) : plan.id === 3 ? (
                        <Building2 className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Star className="w-6 h-6 text-yellow-500" />
                      )}
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    {selectedPlanId === plan.id && (
                      <CheckCircle className="w-6 h-6 text-accent" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description}
                  </p>
                  
                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">
                        {formatPrice(plan.priceMonthly)}
                      </span>
                      <span className="text-gray-500 ml-2">/mês</span>
                    </div>
                  </div>

                  {/* Features resumidas */}
                  <div className="space-y-2">
                    {plan.features?.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {feature}
                        </span>
                      </div>
                    ))}
                    {plan.features && plan.features.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{plan.features.length - 3} recursos adicionais
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Botão de upgrade */}
          <div className="flex flex-col items-center space-y-4 pt-6">
            <Button 
              onClick={handleUpgrade}
              size="lg"
              className="w-full max-w-md bg-accent hover:bg-accent/90 text-white font-semibold py-3"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Fazer Upgrade Agora
            </Button>
            
            <p className="text-sm text-gray-500 text-center">
              Procesamento seguro via Stripe • Cancele a qualquer momento
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}