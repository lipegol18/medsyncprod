import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import iconDoctor from '@/assets/icons/icon-doctor.svg';

interface PricingSectionProps {
  onPlanSelection?: (planId: number) => void;
  selectedPlanId?: number;
  onAdvanceToPayment?: () => void;
}

export function PricingSection({ onPlanSelection, selectedPlanId, onAdvanceToPayment }: PricingSectionProps) {
  const [selectedPlanCard, setSelectedPlanCard] = useState<'START' | 'PRO' | 'CLINICA' | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<'START' | 'PRO' | 'CLINICA' | null>(null);
  const { toast } = useToast();

  // Buscar planos de assinatura
  const { data: subscriptionPlans = [], isLoading } = useQuery({
    queryKey: ['/api/subscriptions/plans'],
  });

  // Debug: Log dos planos carregados
  console.log('🔍 subscriptionPlans:', subscriptionPlans);
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
    <div className="pt-16 lg:pt-20 px-4 lg:px-6 max-w-4xl mx-auto">

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
                  const yearlyPrice = (individualPlan.priceYearly / 100) / 12; // Dividir por 12 meses, não 10
                  console.log('💰 monthlyPrice:', monthlyPrice, 'yearlyPrice:', yearlyPrice);
                  const monthlyParts = monthlyPrice.toFixed(2).split('.');
                  const yearlyParts = yearlyPrice.toFixed(2).split('.');
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">699</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">838</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,80</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
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
            <div className="bg-medsync-blue px-3 lg:px-4 py-2 lg:py-3">
              <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano CLÍNICA</h3>
            </div>
            <div className="text-center px-3 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
              {(() => {
                const teamPlan = (subscriptionPlans as any[]).find((plan: any) => plan.id === 3);
                console.log('🔍 teamPlan:', teamPlan);
                if (teamPlan) {
                  const monthlyPrice = (teamPlan.priceMonthly / 100);
                  const yearlyPrice = (teamPlan.priceYearly / 100) / 12; // Dividir por 12 meses, não 10
                  console.log('💰 teamPrice - monthly:', monthlyPrice, 'yearly:', yearlyPrice);
                  const monthlyParts = monthlyPrice.toFixed(2).split('.');
                  const yearlyParts = yearlyPrice.toFixed(2).split('.');
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">2796</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">3.355</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,20</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
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
          {/* Plano START - Container Principal */}
          <button 
            onClick={() => handlePlanSelection('START')}
            onMouseEnter={() => setHoveredPlan('START')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
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

          {/* Plano PRO */}
          <button 
            onClick={() => handlePlanSelection('PRO')}
            onMouseEnter={() => setHoveredPlan('PRO')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
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
                  const yearlyPrice = (individualPlan.priceYearly / 100) / 12; // Dividir por 12 meses, não 10
                  console.log('💰 monthlyPrice:', monthlyPrice, 'yearlyPrice:', yearlyPrice);
                  const monthlyParts = monthlyPrice.toFixed(2).split('.');
                  const yearlyParts = yearlyPrice.toFixed(2).split('.');
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{monthlyParts[1]}</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">699</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">838</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,80</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </button>

          {/* Plano CLÍNICA */}
          <button 
            onClick={() => handlePlanSelection('CLINICA')}
            onMouseEnter={() => setHoveredPlan('CLINICA')}
            onMouseLeave={() => setHoveredPlan(null)}
            className={`bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-200 relative z-10 ${
              hoveredPlan === 'CLINICA' ? 'shadow-xl scale-105' : ''
            } ${selectedPlanCard === 'CLINICA' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
          >
            <div className="bg-medsync-blue px-3 lg:px-4 py-2 lg:py-3">
              <h3 className="text-xs lg:text-sm font-black text-white text-center" style={{fontFamily: 'Nunito, sans-serif'}}>Plano CLÍNICA</h3>
            </div>
            <div className="text-center px-3 pb-1 pt-2 lg:px-2 lg:pb-2 lg:pt-2">
              {(() => {
                const teamPlan = (subscriptionPlans as any[]).find((plan: any) => plan.id === 3);
                console.log('🔍 teamPlan:', teamPlan);
                if (teamPlan) {
                  const monthlyPrice = (teamPlan.priceMonthly / 100);
                  const yearlyPrice = (teamPlan.priceYearly / 100) / 12; // Dividir por 12 meses, não 10
                  console.log('💰 teamPrice - monthly:', monthlyPrice, 'yearly:', yearlyPrice);
                  const monthlyParts = monthlyPrice.toFixed(2).split('.');
                  const yearlyParts = yearlyPrice.toFixed(2).split('.');
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">{monthlyParts[0]}</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">{yearlyParts[0]}</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,{yearlyParts[1]}</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-2 lg:mb-3">
                      <span className="text-xs text-gray-600" style={{fontFamily: 'Nunito, sans-serif'}}>Valor mensal</span><br/>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                        <span className="text-xl lg:text-4xl price-value text-accent">2796</span>
                        <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,00</sup>
                      </div>
                      <span className="text-xs text-gray-600 -mt-1 block" style={{fontFamily: 'Nunito, sans-serif'}}>ou plano anual</span>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xs text-gray-600 leading-tight font-bold" style={{fontFamily: 'Nunito, sans-serif'}}>Até<br/>10x de</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>R$</span>
                          <span className="text-2xl price-value text-accent">3.355</span>
                          <sup className="text-sm font-medium -ml-1 text-accent" style={{fontFamily: 'Nunito, sans-serif'}}>,20</sup>
                        </div>
                      </div>
                      <div className="text-[9px] text-center mt-1" style={{fontFamily: 'Nunito, sans-serif'}}>
                        <span className="text-gray-600">Desconto de </span>
                        <span className="text-accent font-bold">30% no primeiro ano.</span>
                      </div>
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
      
      {/* Botão dinâmico baseado no plano selecionado */}
      <div className="mt-8 text-center">
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
  );
}