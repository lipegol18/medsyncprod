import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
  defaultValues?: Partial<RegisterForm>;
}

export function RegisterForm({
  onSubmit,
  onSwitchToLogin,
  isLoading,
  validationErrors,
  onFieldValidation,
  defaultValues
}: RegisterFormProps) {
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || '', 
      lastName: defaultValues?.lastName || '', 
      email: defaultValues?.email || '', 
      phone: defaultValues?.phone || '', 
      username: defaultValues?.username || '',
      password: '', confirmPassword: '', 
      address: defaultValues?.address || '', 
      number: defaultValues?.number || '', 
      cep: defaultValues?.cep || '',
      complement: defaultValues?.complement || '', 
      neighborhood: defaultValues?.neighborhood || '', 
      city: defaultValues?.city || '', 
      state: defaultValues?.state || '',
      roleId: defaultValues?.roleId || 2, 
      medicalSpecialtyId: defaultValues?.medicalSpecialtyId || undefined, 
      crm: defaultValues?.crm || '', 
      crmUf: defaultValues?.crmUf || '',
      cpf: defaultValues?.cpf || ''
    }
  });

  useEffect(() => {
    if (defaultValues) {
      registerForm.reset({
        firstName: defaultValues.firstName || '', 
        lastName: defaultValues.lastName || '', 
        email: defaultValues.email || '', 
        phone: defaultValues.phone || '', 
        username: defaultValues.username || '',
        password: '', 
        confirmPassword: '', 
        address: defaultValues.address || '', 
        number: defaultValues.number || '', 
        cep: defaultValues.cep || '',
        complement: defaultValues.complement || '', 
        neighborhood: defaultValues.neighborhood || '', 
        city: defaultValues.city || '', 
        state: defaultValues.state || '',
        roleId: defaultValues.roleId || 2, 
        medicalSpecialtyId: defaultValues.medicalSpecialtyId || undefined, 
        crm: defaultValues.crm || '', 
        crmUf: defaultValues.crmUf || '',
        cpf: defaultValues.cpf || ''
      });
    }
  }, [defaultValues]);

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
          
          // Revalidar campos preenchidos para limpar erros
          registerForm.trigger('address');
          registerForm.trigger('neighborhood');
          registerForm.trigger('city');
          registerForm.trigger('state');
          registerForm.trigger('complement');
          
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
        <h2 className="modal-title">Bem-vindo!</h2>
        <p className="modal-subtitle text-sm">Crie sua conta para começar a usar</p>
      </div>
      
      <form 
        id="register-form"
        ref={formRef}
        onSubmit={registerForm.handleSubmit(handleSubmit)} 
        className="space-y-1 mb-6"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <label htmlFor="reg-firstName" className="label-medsync">Nome</label>
            <input
              {...registerForm.register('firstName')}
              id="reg-firstName"
              placeholder="Nome"
              className="input-medsync"
            />
            {registerForm.formState.errors.firstName && (
              <p className="text-error">{registerForm.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-lastName" className="label-medsync">Sobrenome</label>
            <input
              {...registerForm.register('lastName')}
              id="reg-lastName"
              placeholder="Sobrenome"
              className="input-medsync"
            />
            {registerForm.formState.errors.lastName && (
              <p className="text-error">{registerForm.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 -mt-1">
          <div className="space-y-0.5">
            <label htmlFor="reg-cpf" className="label-medsync">CPF</label>
            <input
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
              className="input-medsync"
            />
            {registerForm.formState.errors.cpf && (
              <p className="text-error">{registerForm.formState.errors.cpf.message}</p>
            )}
            {validationErrors.cpf && (
              <p className="text-error">{validationErrors.cpf}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-crm-uf" className="label-medsync">UF do CRM</label>
            <Select
              value={registerForm.watch('crmUf') || ""}
              onValueChange={(value) => {
                registerForm.setValue('crmUf', value);
                registerForm.trigger('crmUf'); // Força revalidação para limpar erro
              }}
            >
              <SelectTrigger className="select-medsync">
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
              <p className="text-error">{registerForm.formState.errors.crmUf.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-crm-top" className="label-medsync">Nº do CRM</label>
            <input
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
              className="input-medsync"
            />
            {registerForm.formState.errors.crm && (
              <p className="text-error">{registerForm.formState.errors.crm.message}</p>
            )}
            {validationErrors.crm && (
              <p className="text-error">{validationErrors.crm}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <label htmlFor="reg-cep" className="label-medsync">
            CEP {isLoadingCEP && <span className="text-xs text-blue-600">(buscando...)</span>}
          </label>
          <input
            {...registerForm.register('cep')}
            id="reg-cep"
            placeholder="00000-000"
            maxLength={9}
            onChange={(e) => {
              const maskedValue = applyCEPMask(e.target.value);
              registerForm.setValue('cep', maskedValue);
              registerForm.trigger('cep'); // Força revalidação para limpar erro
            }}
            onBlur={(e) => {
              // Usar setTimeout para não interferir na navegação TAB
              setTimeout(() => {
                handleCEPChange(e.target.value);
              }, 100);
            }}
            className="input-medsync"
            disabled={isLoadingCEP}
          />
          {registerForm.formState.errors.cep && (
            <p className="text-error">{registerForm.formState.errors.cep.message}</p>
          )}
        </div>

        {/* Campos de Endereço - movidos para baixo do CEP */}
        <div className="grid grid-cols-4 gap-3 -mt-1">
          <div className="col-span-3 space-y-0.5">
            <label htmlFor="reg-address" className="label-medsync">Endereço</label>
            <input
              {...registerForm.register('address')}
              id="reg-address"
              placeholder="Rua, Avenida..."
              className="input-medsync"
            />
            {registerForm.formState.errors.address && (
              <p className="text-error">{registerForm.formState.errors.address.message}</p>
            )}
          </div>
          <div className="col-span-1 space-y-0.5">
            <label htmlFor="reg-number" className="label-medsync">Nº</label>
            <input
              {...registerForm.register('number')}
              id="reg-number"
              placeholder="123"
              className="input-medsync"
            />
            {registerForm.formState.errors.number && (
              <p className="text-error">{registerForm.formState.errors.number.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <label htmlFor="reg-complement" className="label-medsync">Complemento</label>
          <input
            {...registerForm.register('complement')}
            id="reg-complement"
            placeholder="Apto 101, Bloco A, Sala 2..."
            className="input-medsync"
          />
          {registerForm.formState.errors.complement && (
            <p className="text-error">{registerForm.formState.errors.complement.message}</p>
          )}
        </div>

        {/* Bairro, Cidade e Estado na mesma linha */}
        <div className="grid grid-cols-3 gap-3 -mt-1">
          <div className="space-y-0.5">
            <label htmlFor="reg-neighborhood" className="label-medsync">Bairro</label>
            <input
              {...registerForm.register('neighborhood')}
              id="reg-neighborhood"
              placeholder="Centro"
              className="input-medsync"
            />
            {registerForm.formState.errors.neighborhood && (
              <p className="text-error">{registerForm.formState.errors.neighborhood.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-city" className="label-medsync">Cidade</label>
            <input
              {...registerForm.register('city')}
              id="reg-city"
              placeholder="São Paulo"
              className="input-medsync"
            />
            {registerForm.formState.errors.city && (
              <p className="text-error">{registerForm.formState.errors.city.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-state" className="label-medsync">Estado</label>
            <input
              {...registerForm.register('state')}
              id="reg-state"
              placeholder="SP"
              maxLength={2}
              className="input-medsync uppercase"
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                registerForm.setValue('state', value);
                registerForm.trigger('state'); // Força revalidação para limpar erro
              }}
            />
            {registerForm.formState.errors.state && (
              <p className="text-error">{registerForm.formState.errors.state.message}</p>
            )}
          </div>
        </div>

        {/* Usuário e Telefone na mesma linha após o CEP */}
        <div className="grid grid-cols-2 gap-3 -mt-1">
          <div className="space-y-0.5">
            <label htmlFor="reg-username" className="label-medsync">Nome do Perfil</label>
            <input
              {...registerForm.register('username')}
              id="reg-username"
              placeholder="usuario"
              maxLength={30}
              onChange={(e) => {
                // Remove acentos, espaços e converte para minúsculas
                const sanitized = e.target.value
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                  .replace(/ç/g, 'c') // Converte ç para c
                  .replace(/\s/g, '') // Remove espaços
                  .replace(/[^a-z0-9_.]/g, ''); // Remove caracteres não permitidos
                registerForm.setValue('username', sanitized);
                registerForm.trigger('username');
              }}
              onBlur={(e) => {
                setTimeout(() => {
                  onFieldValidation('username', e.target.value);
                }, 100);
              }}
              className="input-medsync"
            />
            {registerForm.formState.errors.username && (
              <p className="text-error">{registerForm.formState.errors.username.message}</p>
            )}
            {validationErrors.username && (
              <p className="text-error">{validationErrors.username}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-phone" className="label-medsync">Telefone</label>
            <input
              {...registerForm.register('phone')}
              id="reg-phone"
              type="tel"
              placeholder="(11) 99999-9999"
              onChange={(e) => {
                const maskedValue = applyPhoneMask(e.target.value);
                registerForm.setValue('phone', maskedValue);
                registerForm.trigger('phone'); // Força revalidação para limpar erro
              }}
              onBlur={(e) => {
                setTimeout(() => {
                  onFieldValidation('phone', e.target.value);
                }, 100);
              }}
              className="input-medsync"
            />
            {registerForm.formState.errors.phone && (
              <p className="text-error">{registerForm.formState.errors.phone.message}</p>
            )}
            {validationErrors.phone && (
              <p className="text-error">{validationErrors.phone}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <label htmlFor="reg-email" className="label-medsync">Email</label>
          <input
            {...registerForm.register('email')}
            id="reg-email"
            type="email"
            placeholder="seu@email.com"
            onBlur={(e) => {
              setTimeout(() => {
                onFieldValidation('email', e.target.value);
              }, 100);
            }}
            className="input-medsync"
          />
          {registerForm.formState.errors.email && (
            <p className="text-error">{registerForm.formState.errors.email.message}</p>
          )}
          {validationErrors.email && (
            <p className="text-error">{validationErrors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 -mt-1">
          <div className="space-y-0.5">
            <label htmlFor="reg-password" className="label-medsync">Senha</label>
            <input
              {...registerForm.register('password')}
              id="reg-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className="input-medsync"
            />
            {registerForm.formState.errors.password && (
              <p className="text-error">{registerForm.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <label htmlFor="reg-confirmPassword" className="label-medsync">Confirmar Senha</label>
            <input
              {...registerForm.register('confirmPassword')}
              id="reg-confirmPassword"
              type="password"
              placeholder="Confirme sua senha"
              className="input-medsync"
            />
            {registerForm.formState.errors.confirmPassword && (
              <p className="text-error">{registerForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-0.5 -mt-1">
          <label htmlFor="reg-medicalSpecialtyId" className="label-medsync">Especialidade Médica</label>
          <Select
            value={registerForm.watch('medicalSpecialtyId')?.toString() || ""} 
            onValueChange={(value) => {
              registerForm.setValue('medicalSpecialtyId', parseInt(value));
              registerForm.trigger('medicalSpecialtyId'); // Força revalidação para limpar erro
            }}
          >
            <SelectTrigger className="select-medsync">
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
            <p className="text-error">{registerForm.formState.errors.medicalSpecialtyId.message}</p>
          )}
        </div>
      </form>

      {/* Botão fora do formulário para melhor espaçamento */}
      <div className="mb-1">
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