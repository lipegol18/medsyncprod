import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, CreditCard, Clock, Loader2, LogOut, AlertCircle, ArrowLeft } from 'lucide-react';
import { type SubscriptionPlan } from '@/types/subscription';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { applyCPFMask, applyPhoneMask } from '@/lib/utils';
import { applyCEPMask, fetchAddressByCEP } from '@/lib/viacep';
import medSyncLogo from '@/assets/medsync-logo-new.svg';

interface AutomaticDiscount {
  data?: {
    discountType: string;
    discountValue: number;
  };
}

interface TrialExpiredModalProps {
  isOpen: boolean;
  trialEndDate?: string;
  modalType?: 'trial_expired' | 'pending_payment';
  userName?: string;
  onLogout?: () => void;
}

export function TrialExpiredModal({ isOpen, trialEndDate, modalType = 'trial_expired', userName, onLogout }: TrialExpiredModalProps) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [showProfileStep, setShowProfileStep] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const { user } = useAuth();

  const [profileForm, setProfileForm] = useState({
    cpf: '', phone: '', cep: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '',
  });

  const userAddressQuery = useQuery({
    queryKey: ['/api/users', user?.id, 'addresses', 'primary'],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        return await apiRequest(`/api/users/${user.id}/addresses/primary`, "GET");
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });
  interface AddressData {
    id?: number; cep?: string; logradouro?: string; numero?: string;
    complemento?: string; bairro?: string; cidade?: string; uf?: string;
  }
  const existingAddress = userAddressQuery.data as AddressData | null;
  const hasCompleteAddress = !!(existingAddress?.cep && existingAddress?.logradouro && existingAddress?.cidade && existingAddress?.uf);
  const isProfileIncomplete = !user?.cpf || !user?.phone || !hasCompleteAddress;

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({ ...prev, cpf: user.cpf || '', phone: user.phone || '' }));
    }
  }, [user]);

  useEffect(() => {
    if (existingAddress) {
      setProfileForm(prev => ({
        ...prev,
        cep: existingAddress.cep || '', address: existingAddress.logradouro || '',
        number: existingAddress.numero || '', complement: existingAddress.complemento || '',
        neighborhood: existingAddress.bairro || '', city: existingAddress.cidade || '', state: existingAddress.uf || '',
      }));
    }
  }, [existingAddress]);

  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setIsLoadingCEP(true);
      try {
        const data = await fetchAddressByCEP(cleanCEP);
        if (data) {
          setProfileForm(prev => ({
            ...prev,
            address: data.logradouro || prev.address, neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city, state: data.uf || prev.state,
            complement: data.complemento || prev.complement,
          }));
        }
      } catch {} finally { setIsLoadingCEP(false); }
    }
  };

  const isProfileFormValid = !!(profileForm.cpf && profileForm.phone && profileForm.cep && profileForm.address && profileForm.city && profileForm.state);

  const handleSaveProfileAndContinue = async () => {
    if (!user || !isProfileFormValid) return;
    setIsSavingProfile(true);
    try {
      await apiRequest(`/api/users/${user.id}`, "PUT", { cpf: profileForm.cpf, phone: profileForm.phone });
      const addressPayload = {
        userId: user.id, isPrimary: true, cep: profileForm.cep,
        logradouro: profileForm.address, numero: profileForm.number || '',
        complemento: profileForm.complement || '', bairro: profileForm.neighborhood || '',
        cidade: profileForm.city, uf: profileForm.state, country: 'BR',
      };
      if (existingAddress?.id) {
        await apiRequest(`/api/users/${user.id}/addresses/${existingAddress.id}`, "PUT", addressPayload);
      } else {
        await apiRequest(`/api/users/${user.id}/addresses`, "POST", addressPayload);
      }
      queryClient.setQueryData(["/api/user"], (old: any) => old ? { ...old, cpf: profileForm.cpf, phone: profileForm.phone } : old);
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'addresses', 'primary'] });
      setShowProfileStep(false);
      setTimeout(() => proceedToCheckout(), 300);
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
    } finally { setIsSavingProfile(false); }
  };

  // Buscar planos de assinatura
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  // Buscar desconto automático ativo
  const { data: automaticDiscountResponse } = useQuery<AutomaticDiscount>({
    queryKey: ['/api/discount-codes/automatic'],
  });

  const automaticDiscount = automaticDiscountResponse?.data;

  const formatTrialEndDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Funções auxiliares para cálculo de desconto
  const getDiscountPercentage = () => {
    if (!automaticDiscount || automaticDiscount.discountType !== 'percentage') {
      return 50;
    }
    return automaticDiscount.discountValue;
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!automaticDiscount || automaticDiscount.discountType !== 'percentage') {
      return originalPrice * 0.5;
    }
    const percentage = getDiscountPercentage();
    return originalPrice * ((100 - percentage) / 100);
  };

  const getDiscountText = () => {
    const percentage = getDiscountPercentage();
    if (billingInterval === 'yearly') {
      return `${percentage}% OFF + 2 MESES GRÁTIS`;
    }
    return `${percentage}% OFF`;
  };

  // Filtrar apenas plano PRO
  const proPlan = plans?.find(plan => plan.name === 'PRO');

  // Mutation para criar checkout de pagamento pendente
  const pendingPaymentCheckoutMutation = useMutation({
    mutationFn: async (data: { planId: number; billingInterval: string }) => {
      const response = await apiRequest<{ checkoutUrl: string; sessionId: string }>(
        '/api/subscriptions/pending-payment/checkout',
        'POST',
        data
      );
      return response;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      console.error('Erro ao criar checkout (pending_payment):', error);
      if (error?.code === 'PROFILE_INCOMPLETE' || error?.message?.includes('Perfil incompleto')) {
        setShowProfileStep(true);
      }
    }
  });

  const trialUpgradeCheckoutMutation = useMutation({
    mutationFn: async (data: { planId: number; billingInterval: string }) => {
      const response = await apiRequest<{ checkoutUrl: string; sessionId: string }>(
        '/api/subscriptions/trial-upgrade/checkout',
        'POST',
        data
      );
      return response;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      console.error('Erro ao criar checkout (trial_upgrade):', error);
      if (error?.code === 'PROFILE_INCOMPLETE' || error?.message?.includes('Perfil incompleto')) {
        setShowProfileStep(true);
      }
    }
  });

  const isLoading = pendingPaymentCheckoutMutation.isPending || trialUpgradeCheckoutMutation.isPending;

  const proceedToCheckout = () => {
    if (proPlan) {
      const checkoutData = { planId: proPlan.id, billingInterval };
      if (modalType === 'pending_payment') {
        pendingPaymentCheckoutMutation.mutate(checkoutData);
      } else {
        trialUpgradeCheckoutMutation.mutate(checkoutData);
      }
    }
  };

  const handleUpgrade = () => {
    if (isProfileIncomplete) {
      setShowProfileStep(true);
      return;
    }
    proceedToCheckout();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[95vh] p-0 overflow-y-auto border-none">
        <VisuallyHidden>
          <DialogTitle>Período Gratuito Expirado</DialogTitle>
          <DialogDescription>
            Seu trial de 15 dias expirou. Escolha um plano para continuar usando o MedSync.
          </DialogDescription>
        </VisuallyHidden>

        {showProfileStep ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setShowProfileStep(false)} className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Complete seu perfil</h3>
                <p className="text-sm text-gray-500">Preencha os dados abaixo para continuar com o upgrade.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">CPF *</label>
                <Input placeholder="000.000.000-00" maxLength={14} value={profileForm.cpf}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, cpf: applyCPFMask(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Telefone *</label>
                <Input placeholder="(11) 99999-9999" value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: applyPhoneMask(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  CEP * {isLoadingCEP && <span className="text-blue-600">(buscando...)</span>}
                </label>
                <Input placeholder="00000-000" maxLength={9} value={profileForm.cep} disabled={isLoadingCEP}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, cep: applyCEPMask(e.target.value) }))}
                  onBlur={(e) => handleCEPChange(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-700">Endereço *</label>
                <Input placeholder="Rua, Avenida..." value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Nº</label>
                <Input placeholder="123" value={profileForm.number}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, number: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Complemento</label>
                <Input placeholder="Apto, Sala..." value={profileForm.complement}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, complement: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Bairro</label>
                <Input placeholder="Centro" value={profileForm.neighborhood}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, neighborhood: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Cidade *</label>
                <Input placeholder="São Paulo" value={profileForm.city}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Estado *</label>
                <Input placeholder="SP" maxLength={2} className="uppercase" value={profileForm.state}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <Button onClick={handleSaveProfileAndContinue} disabled={!isProfileFormValid || isSavingProfile}
              className="w-full text-base font-bold py-5 text-white"
              style={{ background: 'linear-gradient(135deg, #2ca8e0 0%, #36a9e1 100%)' }}>
              {isSavingProfile ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><CreditCard className="w-5 h-5 mr-2" />Salvar e continuar com upgrade</>
              )}
            </Button>
          </div>
        ) : (
        <>
        {/* Header com gradiente */}
        <div className="relative bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 px-6 py-6 text-center">
          <div className="absolute inset-0 bg-white/40 dark:bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <img src={medSyncLogo} alt="MedSync" className="h-16 object-contain" />
            </div>
            {modalType === 'pending_payment' ? (
              <>
                {userName && (
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    Dr(a). {userName}
                  </p>
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Complete seu pagamento
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                  <CreditCard className="w-3 h-3" />
                  Seu cadastro está quase pronto! Finalize o pagamento para acessar o sistema.
                </p>
              </>
            ) : (
              <>
                {userName && (
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    Dr(a). {userName}
                  </p>
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Seu período gratuito expirou
                </h2>
                {trialEndDate && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                    <Clock className="w-3 h-3" />
                    Trial de 15 dias encerrado em {formatTrialEndDate(trialEndDate)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="px-6 py-6">
          {proPlan && (
            <>
              {/* Toggle de período */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-1.5 shadow-sm">
                  <div className="relative flex bg-white rounded-lg shadow-sm">
                    {/* Indicador deslizante */}
                    <div 
                      className={`absolute top-0 bottom-0 bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg transition-all duration-300 ease-in-out shadow-sm ${
                        billingInterval === 'monthly' 
                          ? 'left-0 w-1/2' 
                          : 'left-1/2 w-1/2'
                      }`}
                    />
                    
                    <button
                      type="button"
                      className={`relative z-10 text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-300 hover:bg-transparent hover:text-current ${
                        billingInterval === 'monthly' 
                          ? 'text-white' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                      onClick={() => setBillingInterval('monthly')}
                      data-testid="toggle-monthly"
                    >
                      Mensal
                    </button>
                    <button
                      type="button"
                      className={`relative z-10 text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-300 hover:bg-transparent hover:text-current ${
                        billingInterval === 'yearly' 
                          ? 'text-white' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                      onClick={() => setBillingInterval('yearly')}
                      data-testid="toggle-yearly"
                    >
                      Anual
                    </button>
                  </div>
                </div>
              </div>

              {/* Card de preço centralizado */}
              <div className="bg-gradient-to-br from-white to-sky-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-sky-200 dark:border-sky-800 shadow-xl p-6 mb-4">
                {/* Título do plano */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-black mb-1" style={{ color: '#2ca8e0', fontFamily: 'Nunito, sans-serif' }}>
                    Plano PRO
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    Plano completo para médicos independentes
                  </p>
                </div>

                {/* Seção de preço */}
                {(() => {
                  const monthlyPrice = (proPlan.priceMonthly / 100);
                  const yearlyPrice = (proPlan.priceYearly / 100);
                  const displayPrice = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;
                  const displayParts = displayPrice.toFixed(2).split('.');
                  const discountedPrice = calculateDiscountedPrice(displayPrice);
                  const discountedParts = discountedPrice.toFixed(2).split('.');
                  
                  return (
                    <div className="text-center mb-6">
                      {/* Label do período */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {billingInterval === 'yearly' ? 'INVESTIMENTO ANUAL' : 'INVESTIMENTO MENSAL'}
                      </div>

                      {/* Preço original */}
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-sm font-bold text-gray-400 line-through" style={{ fontFamily: 'Nunito, sans-serif' }}>R$</span>
                        <span className="text-2xl font-bold text-gray-400 line-through">{displayParts[0]}</span>
                        <sup className="text-sm font-medium text-gray-400 line-through" style={{ fontFamily: 'Nunito, sans-serif' }}>,{displayParts[1]}</sup>
                      </div>

                      {/* Badge de desconto */}
                      <div className="inline-block px-3 py-0.5 bg-red-500 text-white text-xs font-black rounded-full mb-2 shadow-md" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {getDiscountText()}
                      </div>

                      {/* Preço com desconto - destaque */}
                      <div className="flex items-baseline justify-center gap-1 mb-1">
                        <span className="text-xl font-bold" style={{ color: '#2ca8e0', fontFamily: 'Nunito, sans-serif' }}>R$</span>
                        <span className="text-5xl font-black" style={{ color: '#2ca8e0' }}>
                          {discountedParts[0]}
                        </span>
                        <sup className="text-xl font-bold" style={{ color: '#2ca8e0', fontFamily: 'Nunito, sans-serif' }}>
                          ,{discountedParts[1]}
                        </sup>
                      </div>

                      {/* Economia mensal para plano anual */}
                      {billingInterval === 'yearly' && (
                        <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          equivalente a <span className="font-bold" style={{ color: '#2ca8e0' }}>R$ {(discountedPrice / 12).toFixed(2)}/mês</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Features - Grid 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Laudos automatizados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Redução de glosas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">OCR para pacientes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Relatórios detalhados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Controle financeiro</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Suporte especializado</span>
                  </div>
                </div>

                {/* Divisor */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3"></div>

                {/* Informação de médicos */}
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    👨‍⚕️ Plano para 1 médico
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleUpgrade}
                size="lg"
                disabled={isLoading}
                className="w-full text-base font-bold py-5 shadow-lg hover:shadow-xl transition-all duration-200 text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #2ca8e0 0%, #36a9e1 100%)',
                  fontFamily: 'Nunito, sans-serif'
                }}
                data-testid="button-upgrade-now"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Redirecionando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Continuar com Plano PRO
                  </>
                )}
              </Button>

              <div className="text-center mt-3 space-y-0.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  🔒 Pagamento seguro processado via Stripe
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cancele a qualquer momento • Sem taxas de cancelamento
                </p>
              </div>

              {onLogout && (
                <div className="text-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onLogout}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center gap-1 mx-auto transition-colors"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-3 h-3" />
                    Sair da conta
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
