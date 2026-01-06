import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import iconDoctor from '@/assets/icons/icon-doctor.svg';

interface PricingSectionProps {
  onPlanSelection?: (planId: number) => void;
  selectedPlanId?: number;
  onAdvanceToPayment?: () => void;
  billingInterval?: 'monthly' | 'yearly';
  onBackToForm?: () => void;
}

export function PricingSection({ onPlanSelection, selectedPlanId, onAdvanceToPayment, billingInterval = 'monthly', onBackToForm }: PricingSectionProps) {
  const [selectedPlanCard, setSelectedPlanCard] = useState<'START' | 'PRO' | 'CLINICA' | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<'START' | 'PRO' | 'CLINICA' | null>(null);
  const { toast } = useToast();

  // Buscar planos de assinatura
  const { data: subscriptionPlans = [], isLoading } = useQuery({
    queryKey: ['/api/subscriptions/plans'],
  });

  // Buscar desconto automático ativo
  const { data: automaticDiscountResponse } = useQuery({
    queryKey: ['/api/discount-codes/automatic'],
  });

  const automaticDiscount = automaticDiscountResponse?.data;

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

  const getDiscountText = () => {
    const percentage = getDiscountPercentage();
    return `${percentage}% de desconto no primeiro ano`;
  };

  // Debug: Log dos planos e desconto carregados
  console.log('🔍 subscriptionPlans:', subscriptionPlans);
  console.log('🏷️ automaticDiscount:', automaticDiscount);
  console.log('📊 isLoading:', isLoading);

  // Função para selecionar plano (apenas visual, não executa ação)
  const handlePlanSelection = (planType: 'START' | 'PRO' | 'CLINICA') => {
    setSelectedPlanCard(planType);
    
    // Mapear planos baseado no nome, não na posição do array
    const planMapping: Record<string, number> = {
      'START': subscriptionPlans.find(p => p.name === 'START')?.id || 1,
      'PRO': subscriptionPlans.find(p => p.name === 'PRO')?.id || 2,
      'CLINICA': subscriptionPlans.find(p => p.name === 'CLINICA')?.id || 3
    };
    
    const planId = planMapping[planType];
    
    // Apenas notificar o parent sobre a seleção (sem executar ação)
    if (onPlanSelection && planId) {
      onPlanSelection(planId);
    }
  };

  return (
    <div className="pt-6 lg:pt-8 px-4 lg:px-6 max-w-5xl mx-auto">

      {/* Connector lines for desktop - absolute positioning */}
      <div className="relative">
        <div className="hidden sm:block absolute inset-0 pointer-events-none">
          {/* Linha curva à esquerda */}
          <div className="absolute -top-14 left-[calc(16.67%-12px)] w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-full" />
          
          {/* Linha curva à direita */}
          <div className="absolute -top-14 right-[calc(16.67%-12px)] w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-full" />
          
          {/* Linha horizontal central entre os arcos */}
          <div className="absolute -top-14 left-[calc(16.67%+12px)] right-[calc(16.67%+12px)] h-0.5 bg-accent" />
          
          {/* Linhas verticais para cards */}
          <div className="absolute -top-8 left-[calc(16.67%-12px)] h-8 w-0.5 bg-accent" />
          <div className="absolute -top-14 left-1/2 h-14 w-0.5 bg-accent transform -translate-x-1/2" />
          <div className="absolute -top-8 right-[calc(16.67%-12px)] h-8 w-0.5 bg-accent" />
          
          {/* Nova linha vertical central superior */}
          <div className="absolute -top-20 left-1/2 h-14 w-0.5 bg-accent transform -translate-x-1/2" />
          
          {/* Círculo no topo da linha central */}
          <div className="absolute -top-20 left-1/2 w-2 h-2 rounded-full bg-accent transform -translate-x-1/2 -translate-y-1" />
        </div>
      </div>

      {/* Layout Mobile: Planos agrupados com suas funcionalidades */}
      <div className="block sm:hidden space-y-6">
        {/* START - Plano + Funcionalidades */}
        <div className="space-y-3">
          <button 
            onClick={() => handlePlanSelection('START')}
            onMouseEnter={() => setHoveredPlan('START')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`w-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
              hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
            } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
          >
            <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
              <h3 className="text-xs lg:text-sm font-black text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano START</h3>
            </div>
            <div className="p-3 lg:p-4">
              <div className="mb-0.5 text-center">
                <span className="text-sm lg:text-lg font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>15 dias de</span><br/>
                <span className="text-sm lg:text-base font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>Acesso Gratuito</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 text-left" style={{fontFamily: 'Nunito, sans-serif'}}>Sem fidelidade.<br/>Sem riscos.<br/>Sem cartão.<br/>Você decide no final.</p>
            </div>
          </button>

          <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
            hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
          } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
            <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
              <p className="text-xs font-medium text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções Disponíveis</p>
            </div>
            <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Laudos automatizados</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Geração de texto inteligente</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Sugestão de codificação CBHPM/TUSS</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>OCR para cadastro de pacientes</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Relatórios e controle financeiro</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Suporte durante o período de teste</span>
              </div>
            </div>
            <div className="text-center pb-3 lg:pb-4">
              <div className="flex flex-col items-center justify-center">
                <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRO - Plano + Funcionalidades */}
        <div className="space-y-3">
          <button 
            onClick={() => handlePlanSelection('PRO')}
            onMouseEnter={() => setHoveredPlan('PRO')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`w-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
              hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
            } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
          >
            <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
              <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano PRO</h3>
            </div>
            <div className="text-center px-2 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
              {(() => {
                const individualPlan = (subscriptionPlans as any[]).find((plan: any) => plan.id === 2);
                console.log('🔍 individualPlan:', individualPlan);
                if (individualPlan) {
                  const monthlyPrice = (individualPlan.priceMonthly / 100);
                  const yearlyPrice = (individualPlan.priceYearly / 100); // Valor anual completo
                  console.log('💰 monthlyPrice:', monthlyPrice, 'yearlyPrice:', yearlyPrice);
                  
                  // Usar preço baseado no billingInterval
                  const displayPrice = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;
                  const displayParts = displayPrice.toFixed(2).split('.');
                  
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      
                      {/* Preço original cortado */}
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-xs font-bold text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-sm lg:text-lg price-value text-red-500 line-through">{displayParts[0]}</span>
                        <sup className="text-xs font-medium -ml-1 text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>,{displayParts[1]}</sup>
                      </div>
                      

                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{billingInterval === 'yearly' ? '6990' : '699'}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>
                          {billingInterval === 'yearly' ? ',00' : ',00'}
                        </sup>
                      </div>
                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-2xl price-value text-accent">582</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,50</sup>
                            </div>
                          </div>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                        </>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
          </button>

          <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
            hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
          } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
            <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
              <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funcionalidades</p>
            </div>
            <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Laudos automatizados</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Redução de glosas</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>OCR para cadastro de pacientes</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Relatórios por convênio, hospital e tipo de cirurgia</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Controle financeiro com cálculo de repasse líquido</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Onboarding e suporte especializado</span>
              </div>
            </div>
            <div className="text-center pb-3 lg:pb-4">
              <div className="flex flex-col items-center justify-center">
                <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
              </div>
            </div>
          </div>
        </div>

        {/* CLÍNICA - Plano + Funcionalidades */}
        <div className="space-y-3">
          <button 
            onClick={() => handlePlanSelection('CLINICA')}
            onMouseEnter={() => setHoveredPlan('CLINICA')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`w-full bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
              hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
            } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
          >
            <div className="bg-medsync-blue px-3 lg:px-4 py-3 lg:py-4">
              <h3 className="text-sm lg:text-base font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano CLÍNICA</h3>
            </div>
            <div className="text-center px-3 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
              {(() => {
                const teamPlan = (subscriptionPlans as any[]).find((plan: any) => plan.id === 3);
                console.log('🔍 teamPlan:', teamPlan);
                if (teamPlan) {
                  const monthlyPrice = (teamPlan.priceMonthly / 100);
                  const yearlyPrice = (teamPlan.priceYearly / 100); // Valor anual completo
                  console.log('💰 teamPrice - monthly:', monthlyPrice, 'yearly:', yearlyPrice);
                  
                  // Usar preço baseado no billingInterval
                  const displayPrice = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;
                  const displayParts = displayPrice.toFixed(2).split('.');
                  
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      
                      {/* Preço original cortado */}
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-xs font-bold text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-sm lg:text-lg price-value text-red-500 line-through">{displayParts[0]}</span>
                        <sup className="text-xs font-medium -ml-1 text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>,{displayParts[1]}</sup>
                      </div>
                      

                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{billingInterval === 'yearly' ? '399600' : '39900'}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>
                          {billingInterval === 'yearly' ? ',00' : ',00'}
                        </sup>
                      </div>
                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-2xl price-value text-accent">33.300</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                            </div>
                          </div>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                        </>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
          </button>

          <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
            hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
          } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
            <div className="bg-medsync-blue px-3 lg:px-4 py-2 lg:py-3">
              <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções turbinadas</p>
            </div>
            <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Relatórios centralizados por equipe</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Gestão por médico, hospital e convênio</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Indicadores clínico-financeiros</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Painel de repasses médicos</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Suporte avançado e organização do faturamento</span>
              </div>
            </div>
            <div className="text-center pb-3 lg:pb-4">
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center space-x-1">
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                </div>
                <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>Até 5 médicos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Tablet/Desktop: Grid lado a lado */}
      <div className="hidden sm:block relative">
        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-6 sm:gap-4 lg:gap-3" style={{gridTemplateColumns: 'repeat(3, minmax(165px, 1fr))'}}>
          {/* Plano START - Container Principal - Melhorado */}
          <button 
            onClick={() => handlePlanSelection('START')}
            onMouseEnter={() => setHoveredPlan('START')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 relative z-10 ${
              hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
            } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
          >
            <div className="bg-gradient-to-r from-sky-100 to-blue-100 px-3 lg:px-4 py-3 lg:py-4">
              <h3 className="text-sm lg:text-base font-black text-accent text-center flex items-center justify-center gap-2" style={{fontFamily: 'Nunito, sans-serif'}}>
                Plano START
              </h3>
            </div>
            <div className="p-3 lg:p-4">
              <div className="mb-0.5 text-center">
                <span className="text-sm lg:text-lg font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>15 dias de</span><br/>
                <span className="text-sm lg:text-base font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>Acesso Gratuito</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 text-left" style={{fontFamily: 'Nunito, sans-serif'}}>Sem fidelidade.<br/>Sem riscos.<br/>Sem cartão.<br/>Você decide no final.</p>
            </div>
          </button>

          {/* Plano PRO - Melhorado com destaque */}
          <div className="relative">
            {/* Badge de mais popular */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30">
            </div>
            
            <button 
              onClick={() => handlePlanSelection('PRO')}
              onMouseEnter={() => setHoveredPlan('PRO')}
              onMouseLeave={() => setHoveredPlan(null)}
              className={`bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 relative z-10 ${
                hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
              } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
            >
              <div className="bg-sky-400 px-3 lg:px-4 py-3 lg:py-4">
                <h3 className="text-sm lg:text-base font-black text-white text-center flex items-center justify-center gap-2" style={{fontFamily: 'Nunito, sans-serif'}}>
                  Plano PRO
                </h3>
              </div>
            <div className="text-center px-2 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
              {(() => {
                const individualPlan = (subscriptionPlans as any[]).find((plan: any) => plan.id === 2);
                console.log('🔍 individualPlan:', individualPlan);
                if (individualPlan) {
                  const monthlyPrice = (individualPlan.priceMonthly / 100);
                  const yearlyPrice = (individualPlan.priceYearly / 100); // Valor anual completo
                  console.log('💰 monthlyPrice:', monthlyPrice, 'yearlyPrice:', yearlyPrice);
                  
                  // Usar preço baseado no billingInterval
                  const displayPrice = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;
                  const displayParts = displayPrice.toFixed(2).split('.');
                  
                  return (
                    <div className="mb-2 lg:mb-3 relative">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      
                      {/* Preço original cortado */}
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-xs font-bold text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-sm lg:text-lg price-value text-red-500 line-through">{displayParts[0]}</span>
                        <sup className="text-xs font-medium -ml-1 text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>,{displayParts[1]}</sup>
                      </div>
                      

                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{billingInterval === 'yearly' ? '6990' : '699'}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>
                          {billingInterval === 'yearly' ? ',00' : ',00'}
                        </sup>
                      </div>
                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-2xl price-value text-accent">582</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,50</sup>
                            </div>
                          </div>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                        </>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
          </button>
          </div>

          {/* Plano CLÍNICA */}
          <button 
            onClick={() => handlePlanSelection('CLINICA')}
            onMouseEnter={() => setHoveredPlan('CLINICA')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
              hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
            } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
          >
            <div className="bg-medsync-blue px-3 lg:px-4 py-3 lg:py-4">
              <h3 className="text-sm lg:text-base font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano CLÍNICA</h3>
            </div>
            <div className="text-center px-3 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
              {(() => {
                const teamPlan = (subscriptionPlans as any[]).find((plan: any) => plan.id === 3);
                console.log('🔍 teamPlan:', teamPlan);
                if (teamPlan) {
                  const monthlyPrice = (teamPlan.priceMonthly / 100);
                  const yearlyPrice = (teamPlan.priceYearly / 100); // Valor anual completo
                  console.log('💰 teamPrice - monthly:', monthlyPrice, 'yearly:', yearlyPrice);
                  
                  // Usar preço baseado no billingInterval
                  const displayPrice = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;
                  const displayParts = displayPrice.toFixed(2).split('.');
                  
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      
                      {/* Preço original cortado */}
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-xs font-bold text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-sm lg:text-lg price-value text-red-500 line-through">{displayParts[0]}</span>
                        <sup className="text-xs font-medium -ml-1 text-red-500 line-through" style={{fontFamily: 'Nunito, sans-serif'}}>,{displayParts[1]}</sup>
                      </div>
                      

                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(monthlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600 font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>
                        {billingInterval === 'yearly' ? 'Valor anual' : 'Valor mensal'}
                      </span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{billingInterval === 'yearly' ? '399600' : '39900'}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>
                          {billingInterval === 'yearly' ? ',00' : ',00'}
                        </sup>
                      </div>
                      
                      {billingInterval === 'yearly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>

                          <div className="flex items-baseline justify-center gap-1 mt-1">
                            <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                            <span className="text-lg lg:text-3xl price-value text-accent">{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[0]}</span>
                            <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{calculateDiscountedPrice(yearlyPrice).toFixed(2).split('.')[1]}</sup>
                          </div>
                          <div className="text-[8px] text-center mt-2 text-gray-500" style={{fontFamily: 'Nunito, sans-serif'}}>
                            Desconto válido para os primeiros 1000 inscritos e no primeiro ano de subscrição.
                          </div>
                        </>
                      )}
                      
                      {billingInterval === 'monthly' && (
                        <>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                              <span className="text-2xl price-value text-accent">33.300</span>
                              <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                            </div>
                          </div>
                          <span className="text-xs text-red-500 font-bold -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>{getDiscountText()}</span>
                        </>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
          </button>
        </div>

        {/* Features section for desktop - shows below plan cards */}
        <div className="mt-4 grid grid-cols-3 gap-4 lg:gap-3">
          <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
            hoveredPlan === 'START' ? 'shadow-xl scale-105' : ''
          } ${selectedPlanCard === 'START' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
            <div className="bg-sky-100 px-3 lg:px-4 py-2 lg:py-3">
              <p className="text-xs font-medium text-accent text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções Disponíveis</p>
            </div>
            <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Laudos automatizados</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Geração de texto inteligente</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Sugestão de codificação CBHPM/TUSS</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>OCR para cadastro de pacientes</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Relatórios e controle financeiro</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Suporte durante o período de teste</span>
              </div>
            </div>
            <div className="text-center pb-3 lg:pb-4">
              <div className="flex flex-col items-center justify-center">
                <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
            hoveredPlan === 'PRO' ? 'shadow-xl scale-105' : ''
          } ${selectedPlanCard === 'PRO' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
            <div className="bg-sky-400 px-3 lg:px-4 py-2 lg:py-3">
              <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funcionalidades</p>
            </div>
            <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Laudos automatizados</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Redução de glosas</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>OCR para cadastro de pacientes</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Relatórios por convênio, hospital e tipo de cirurgia</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Controle financeiro com cálculo de repasse líquido</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Onboarding e suporte especializado</span>
              </div>
            </div>
            <div className="text-center pb-3 lg:pb-4">
              <div className="flex flex-col items-center justify-center">
                <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>1 médico</span>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden relative z-10 transition-all duration-200 ${
            hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
          } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}>
            <div className="bg-medsync-blue px-3 lg:px-4 py-2 lg:py-3">
              <p className="text-xs font-medium text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Funções turbinadas</p>
            </div>
            <div className="p-3 lg:p-4 space-y-1 text-xs" style={{fontFamily: 'Nunito, sans-serif'}}>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Relatórios centralizados por equipe</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Gestão por médico, hospital e convênio</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Indicadores clínico-financeiros</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Painel de repasses médicos</span>
              </div>
              <div className="flex items-center">
                <span className="text-accent mr-1">✓</span>
                <span>Suporte avançado e organização do faturamento</span>
              </div>
            </div>
            <div className="text-center pb-3 lg:pb-4">
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center space-x-1">
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                  <img src={iconDoctor} alt="Doctor" className="w-5 h-5" />
                </div>
                <span className="mt-1 text-xs font-medium" style={{fontFamily: 'Nunito, sans-serif'}}>Até 5 médicos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Botões de ação */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
          {/* Botão Voltar aos Dados */}
          <button 
            onClick={onBackToForm}
            className="font-semibold py-3 px-8 rounded-lg transition-colors duration-200 bg-accent hover:bg-gray-300 text-white flex items-center gap-2"
            style={{fontFamily: 'Nunito, sans-serif'}}
            data-testid="button-back-to-form"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar aos Dados
          </button>
          
          {/* Botão dinâmico baseado no plano selecionado */}
          <button
            onClick={onAdvanceToPayment}
            disabled={!selectedPlanCard}
            className={`font-semibold py-3 px-8 rounded-lg transition-colors duration-200 ${
              selectedPlanCard 
                ? 'bg-accent hover:bg-blue-600 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            style={{fontFamily: 'Nunito, sans-serif'}}
          >
            {(() => {
              if (!selectedPlanCard) {
                return 'Selecione um plano primeiro';
              }
              if (selectedPlanCard === 'START') {
                return 'Iniciar Teste Gratuito';
              }
              return 'Avançar para Pagamento';
            })()}
          </button>
        </div>
      </div>
    </div>
  );
}