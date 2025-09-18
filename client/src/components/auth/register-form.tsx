import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registerSchema, type RegisterForm } from '@/schemas/auth-schemas';
import { applyCPFMask, applyPhoneMask, onlyNumbers } from '@/lib/utils';
import { fetchAddressByCEP, applyCEPMask } from '@/lib/viacep';
import { useState, useRef, useEffect } from 'react';

interface RegisterFormProps {
  onSubmit: (data: RegisterForm) => void;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  validationErrors: Record<string, string>;
  onFieldValidation: (field: 'cpf' | 'crm' | 'phone' | 'email' | 'username', value: string, additionalData?: any) => void;
}

export function RegisterForm({
  onSubmit,
  onSwitchToLogin,
  isLoading,
  validationErrors,
  onFieldValidation
}: RegisterFormProps) {
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '', username: '',
      password: '', confirmPassword: '', address: '', number: '', cep: '',
      complement: '', neighborhood: '', city: '', state: '',
      roleId: 2, medicalSpecialtyId: undefined, crm: '', crmUf: ''
    }
  });

  // Função para buscar dados do CEP
  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length === 8) {
      setIsLoadingCEP(true);
      
      try {
        const addressData = await fetchAddressByCEP(cleanCEP);
        
        if (addressData) {
          // Preencher campos automaticamente
          registerForm.setValue('address', addressData.logradouro);
          registerForm.setValue('neighborhood', addressData.bairro);
          registerForm.setValue('city', addressData.localidade);
          registerForm.setValue('state', addressData.uf);
          registerForm.setValue('complement', addressData.complemento || '');
          
          // Focar no campo número após preenchimento
          const numberField = document.getElementById('reg-number');
          if (numberField) numberField.focus();
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setIsLoadingCEP(false);
      }
    }
  };

  // Fetch medical specialties for registration
  const specialtiesQuery = useQuery({
    queryKey: ['/api/medical-specialties/public']
  });

  // Fetch Brazilian states for CRM UF selection
  const statesQuery = useQuery({
    queryKey: ['/api/brazilian-states']
  });

  const handleSubmit = (data: RegisterForm) => {
    onSubmit(data);
  };

  // Neutralizar elementos do Replit que interferem na navegação TAB
  useEffect(() => {
    const neutralizeReplitElements = () => {
      // Elementos específicos do Replit que podem interferir
      const replitSelectors = [
        '[class*="beacon"]',
        '[class*="replit"]', 
        '[data-replit]',
        'iframe[src*="replit"]',
        'script[src*="replit"]',
        '[id*="replit"]',
        // Elementos do Vite/Hot reload que podem ter tabIndex
        '[class*="vite"]',
        '[data-vite]'
      ];

      replitSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Remover da ordem de TAB
          (el as HTMLElement).tabIndex = -1;
          // Remover eventos de foco se houver
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      });

      // Garantir que apenas elementos do formulário sejam focáveis
      if (formRef.current) {
        const formElements = formRef.current.querySelectorAll('input, select, button, textarea');
        formElements.forEach((el, index) => {
          (el as HTMLElement).tabIndex = index + 1;
        });
      }
    };

    // Executar neutralização após carregamento
    const timer = setTimeout(neutralizeReplitElements, 500);
    
    // Executar novamente caso elementos sejam carregados dinamicamente
    const interval = setInterval(neutralizeReplitElements, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);


  return (
    <div>
      <div className="text-left mb-6">
        <h2 className="text-2xl font-black text-gray-900">Bem-vindo!</h2>
        <p className="text-gray-600 leading-relaxed font-bold text-sm">Crie sua conta para começar a usar</p>
      </div>
      
      <form 
        id="register-form"
        ref={formRef}
        onSubmit={registerForm.handleSubmit(handleSubmit)} 
        className="space-y-1 mb-6"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="reg-firstName" className="text-sm text-gray-700 font-bold">Nome</Label>
            <Input
              {...registerForm.register('firstName')}
              id="reg-firstName"
              placeholder="Nome"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.firstName && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-lastName" className="text-sm text-gray-700 font-bold">Sobrenome</Label>
            <Input
              {...registerForm.register('lastName')}
              id="reg-lastName"
              placeholder="Sobrenome"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.lastName && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 -mt-1">
          <div className="space-y-0.5">
            <Label htmlFor="reg-cpf" className="text-sm text-gray-700 font-bold">CPF</Label>
            <Input
              {...registerForm.register('cpf')}
              id="reg-cpf"
              placeholder="000.000.000-00"
              maxLength={14}
              onChange={(e) => {
                const maskedValue = applyCPFMask(e.target.value);
                registerForm.setValue('cpf', maskedValue);
                // Forçar revalidação imediata do campo CPF
                registerForm.trigger('cpf');
              }}
              onBlur={(e) => {
                // Usar setTimeout para não interferir na navegação TAB
                setTimeout(() => {
                  registerForm.trigger('cpf');
                  onFieldValidation('cpf', e.target.value);
                }, 100);
              }}
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.cpf && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.cpf.message}</p>
            )}
            {validationErrors.cpf && (
              <p className="text-red-500 text-xs">{validationErrors.cpf}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-crm-uf" className="text-sm text-gray-700 font-bold">UF do CRM</Label>
            <Select
              value={registerForm.watch('crmUf') || ""}
              onValueChange={(value) => registerForm.setValue('crmUf', value)}
            >
              <SelectTrigger className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(statesQuery.data) && statesQuery.data?.map((state: any) => (
                  <SelectItem key={state.stateCode} value={state.stateCode}>
                    {state.stateCode} - {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {registerForm.formState.errors.crmUf && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.crmUf.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-crm-top" className="text-sm text-gray-700 font-bold">Nº do CRM</Label>
            <Input
              {...registerForm.register('crm')}
              id="reg-crm-top"
              type="text"
              placeholder="123456"
              onBlur={(e) => {
                setTimeout(() => {
                  const crmUf = registerForm.getValues('crmUf');
                  onFieldValidation('crm', e.target.value, { crmUf });
                }, 100);
              }}
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.crm && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.crm.message}</p>
            )}
            {validationErrors.crm && (
              <p className="text-red-500 text-xs">{validationErrors.crm}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <Label htmlFor="reg-cep" className="text-sm text-gray-700 font-bold">
            CEP {isLoadingCEP && <span className="text-xs text-blue-600">(buscando...)</span>}
          </Label>
          <Input
            {...registerForm.register('cep')}
            id="reg-cep"
            placeholder="00000-000"
            maxLength={9}
            onChange={(e) => {
              const maskedValue = applyCEPMask(e.target.value);
              registerForm.setValue('cep', maskedValue);
            }}
            onBlur={(e) => {
              // Usar setTimeout para não interferir na navegação TAB
              setTimeout(() => {
                handleCEPChange(e.target.value);
              }, 100);
            }}
            className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            disabled={isLoadingCEP}
          />
          {registerForm.formState.errors.cep && (
            <p className="text-red-500 text-xs">{registerForm.formState.errors.cep.message}</p>
          )}
        </div>

        {/* Campos de Endereço - movidos para baixo do CEP */}
        <div className="grid grid-cols-4 gap-3 -mt-1">
          <div className="col-span-3 space-y-0.5">
            <Label htmlFor="reg-address" className="text-sm text-gray-700 font-bold">Endereço</Label>
            <Input
              {...registerForm.register('address')}
              id="reg-address"
              placeholder="Rua, Avenida..."
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.address && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.address.message}</p>
            )}
          </div>
          <div className="col-span-1 space-y-0.5">
            <Label htmlFor="reg-number" className="text-sm text-gray-700 font-bold">Nº</Label>
            <Input
              {...registerForm.register('number')}
              id="reg-number"
              placeholder="123"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.number && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.number.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <Label htmlFor="reg-complement" className="text-sm text-gray-700 font-bold">Complemento</Label>
          <Input
            {...registerForm.register('complement')}
            id="reg-complement"
            placeholder="Apto 101, Bloco A, Sala 2..."
            className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
          />
          {registerForm.formState.errors.complement && (
            <p className="text-red-500 text-xs">{registerForm.formState.errors.complement.message}</p>
          )}
        </div>

        {/* Bairro, Cidade e Estado na mesma linha */}
        <div className="grid grid-cols-3 gap-3 -mt-1">
          <div className="space-y-0.5">
            <Label htmlFor="reg-neighborhood" className="text-sm text-gray-700 font-bold">Bairro</Label>
            <Input
              {...registerForm.register('neighborhood')}
              id="reg-neighborhood"
              placeholder="Centro"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.neighborhood && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.neighborhood.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-city" className="text-sm text-gray-700 font-bold">Cidade</Label>
            <Input
              {...registerForm.register('city')}
              id="reg-city"
              placeholder="São Paulo"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.city && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.city.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-state" className="text-sm text-gray-700 font-bold">Estado</Label>
            <Input
              {...registerForm.register('state')}
              id="reg-state"
              placeholder="SP"
              maxLength={2}
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3 uppercase"
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                registerForm.setValue('state', value);
              }}
            />
            {registerForm.formState.errors.state && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.state.message}</p>
            )}
          </div>
        </div>

        {/* Usuário e Telefone na mesma linha após o CEP */}
        <div className="grid grid-cols-2 gap-3 -mt-1">
          <div className="space-y-0.5">
            <Label htmlFor="reg-username" className="text-sm text-gray-700 font-bold">Nome do Perfil</Label>
            <Input
              {...registerForm.register('username')}
              id="reg-username"
              placeholder="usuario"
              onBlur={(e) => {
                setTimeout(() => {
                  onFieldValidation('username', e.target.value);
                }, 100);
              }}
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.username && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.username.message}</p>
            )}
            {validationErrors.username && (
              <p className="text-red-500 text-xs">{validationErrors.username}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-phone" className="text-sm text-gray-700 font-bold">Telefone</Label>
            <Input
              {...registerForm.register('phone')}
              id="reg-phone"
              type="tel"
              placeholder="(11) 99999-9999"
              onChange={(e) => {
                const maskedValue = applyPhoneMask(e.target.value);
                registerForm.setValue('phone', maskedValue);
              }}
              onBlur={(e) => {
                setTimeout(() => {
                  onFieldValidation('phone', e.target.value);
                }, 100);
              }}
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.phone && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.phone.message}</p>
            )}
            {validationErrors.phone && (
              <p className="text-red-500 text-xs">{validationErrors.phone}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <Label htmlFor="reg-email" className="text-sm text-gray-700 font-bold">Email</Label>
          <Input
            {...registerForm.register('email')}
            id="reg-email"
            type="email"
            placeholder="seu@email.com"
            onBlur={(e) => {
              setTimeout(() => {
                onFieldValidation('email', e.target.value);
              }, 100);
            }}
            className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
          />
          {registerForm.formState.errors.email && (
            <p className="text-red-500 text-xs">{registerForm.formState.errors.email.message}</p>
          )}
          {validationErrors.email && (
            <p className="text-red-500 text-xs">{validationErrors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 -mt-1">
          <div className="space-y-0.5">
            <Label htmlFor="reg-password" className="text-sm text-gray-700 font-bold">Senha</Label>
            <Input
              {...registerForm.register('password')}
              id="reg-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.password && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="reg-confirmPassword" className="text-sm text-gray-700 font-bold">Confirmar Senha</Label>
            <Input
              {...registerForm.register('confirmPassword')}
              id="reg-confirmPassword"
              type="password"
              placeholder="Confirme sua senha"
              className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors px-3"
            />
            {registerForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <Label htmlFor="reg-medicalSpecialtyId" className="text-sm text-gray-700 font-bold">Especialidade Médica</Label>
          <Select
            value={registerForm.watch('medicalSpecialtyId')?.toString() || ""} 
            onValueChange={(value) => registerForm.setValue('medicalSpecialtyId', parseInt(value))}
          >
            <SelectTrigger className="h-9 rounded-lg border-2 border-gray-200 focus:border-accent">
              <SelectValue placeholder="Selecione sua especialidade" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(specialtiesQuery.data) && specialtiesQuery.data?.map((specialty: any) => (
                <SelectItem key={specialty.id} value={specialty.id.toString()}>
                  {specialty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {registerForm.formState.errors.medicalSpecialtyId && (
            <p className="text-red-500 text-xs">{registerForm.formState.errors.medicalSpecialtyId.message}</p>
          )}
        </div>
      </form>

      {/* Botão fora do formulário para melhor espaçamento */}
      <div className="mb-6">
        <Button
          type="submit"
          form="register-form"
          className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
          style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'hsl(var(--medsync-blue))')}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          {isLoading ? "Validando dados..." : "Continuar para planos →"}
        </Button>
      </div>

      <div className="text-center">
        <span className="text-xs text-gray-600 font-bold">Já tem uma conta? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs text-accent hover:text-accent/80 font-bold transition-colors"
        >
          Fazer login
        </button>
      </div>
    </div>
  );
}