import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registerSchema, type RegisterForm } from '@/schemas/auth-schemas';
import { useEffect, useRef } from 'react';

interface RegisterFormProps {
  onSubmit: (data: RegisterForm) => void;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  validationErrors: Record<string, string>;
  onFieldValidation: (field: 'crm' | 'email', value: string, additionalData?: any) => void;
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
  const formRef = useRef<HTMLFormElement>(null);

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || '', 
      lastName: defaultValues?.lastName || '', 
      email: defaultValues?.email || '', 
      password: '', 
      confirmPassword: '', 
      roleId: defaultValues?.roleId || 2, 
      medicalSpecialtyId: defaultValues?.medicalSpecialtyId || undefined, 
      crm: defaultValues?.crm || '', 
      crmUf: defaultValues?.crmUf || '',
    }
  });

  useEffect(() => {
    if (defaultValues) {
      registerForm.reset({
        firstName: defaultValues.firstName || '', 
        lastName: defaultValues.lastName || '', 
        email: defaultValues.email || '', 
        password: '', 
        confirmPassword: '', 
        roleId: defaultValues.roleId || 2, 
        medicalSpecialtyId: defaultValues.medicalSpecialtyId || undefined, 
        crm: defaultValues.crm || '', 
        crmUf: defaultValues.crmUf || '',
      });
    }
  }, [defaultValues]);

  const specialtiesQuery = useQuery({
    queryKey: ['/api/medical-specialties/public']
  });

  const statesQuery = useQuery({
    queryKey: ['/api/brazilian-states']
  });

  const handleSubmit = (data: RegisterForm) => {
    onSubmit(data);
  };

  useEffect(() => {
    const neutralizeReplitElements = () => {
      const replitSelectors = [
        '[class*="beacon"]',
        '[class*="replit"]', 
        '[data-replit]',
        'iframe[src*="replit"]',
        'script[src*="replit"]',
        '[id*="replit"]',
        '[class*="vite"]',
        '[data-vite]'
      ];

      replitSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          (el as HTMLElement).tabIndex = -1;
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      });

      if (formRef.current) {
        const formElements = formRef.current.querySelectorAll('input, select, button, textarea');
        formElements.forEach((el, index) => {
          (el as HTMLElement).tabIndex = index + 1;
        });
      }
    };

    const timer = setTimeout(neutralizeReplitElements, 500);
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

        <div className="grid grid-cols-3 gap-3 -mt-1">
          <div className="space-y-0.5">
            <label htmlFor="reg-crm-uf" className="label-medsync">UF do CRM</label>
            <Select
              value={registerForm.watch('crmUf') || ""}
              onValueChange={(value) => {
                registerForm.setValue('crmUf', value);
                registerForm.trigger('crmUf');
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
          <div className="space-y-0.5">
            <label htmlFor="reg-medicalSpecialtyId" className="label-medsync">Especialidade</label>
            <Select
              value={registerForm.watch('medicalSpecialtyId')?.toString() || ""} 
              onValueChange={(value) => {
                registerForm.setValue('medicalSpecialtyId', parseInt(value));
                registerForm.trigger('medicalSpecialtyId');
              }}
            >
              <SelectTrigger className="select-medsync">
                <SelectValue placeholder="Selecione" />
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
        </div>
      </form>

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
