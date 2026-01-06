import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { loginSchema, type LoginForm } from '@/schemas/auth-schemas';

interface LoginModalProps {
  onSubmit: (data: LoginForm) => void;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  isLoading: boolean;
}

export function LoginModal({ 
  onSubmit, 
  onSwitchToRegister, 
  onSwitchToForgotPassword, 
  isLoading 
}: LoginModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false }
  });

  const handleSubmit = (data: LoginForm) => {
    onSubmit(data);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="modal-title">Bem-vindo de volta!</h2>
        <p className="modal-subtitle">Faça login para acessar sua conta</p>
      </div>

      <form onSubmit={loginForm.handleSubmit(handleSubmit)}>
        <div>
          <label htmlFor="username" className="label-medsync">E-mail ou Nome de Usuário</label>
          <input
            {...loginForm.register('username')}
            id="username"
            placeholder="Digite seu e-mail ou nome de usuário"
            className="input-medsync"
          />
          {loginForm.formState.errors.username && (
            <p className="text-error mt-1">{loginForm.formState.errors.username.message}</p>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label-medsync">Senha</label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-sm text-medsync-gray hover:text-medsync-gray/80 font-bold transition-colors"
            >
              Esqueceu a sua senha?
            </button>
          </div>
          <div className="relative">
            <input
              {...loginForm.register('password')}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              className="input-medsync pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medsync-gray hover:text-medsync-gray/80 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="text-error mt-1">{loginForm.formState.errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-start pt-2 space-x-3">
          <Checkbox
            {...loginForm.register('remember')}
            id="remember"
            className="rounded-md border-2 border-medsync-light-gray data-[state=checked]:bg-accent data-[state=checked]:border-accent"
          />
          <label htmlFor="remember" className="label-medsync-sm">
            Lembrar de mim
          </label>
        </div>

        <button
          type="submit"
          className="btn-medsync-light w-full mt-5"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          {isLoading ? "Entrando..." : "Login"}
        </button>
      </form>
      
      <div className="text-center mt-1">
        <span className="text-sm text-medsync-gray font-bold">Ainda não tem uma conta? </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-sm text-accent hover:text-accent/80 font-bold transition-colors"
        >
          Registrar
        </button>
      </div>
    </div>
  );
}