import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false }
  });

  const handleSubmit = (data: LoginForm) => {
    onSubmit(data);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-gray-900">Bem-vindo de volta!</h2>
        <p className="text-gray-600 leading-relaxed font-bold">Faça login para acessar sua conta</p>
      </div>

      <form onSubmit={loginForm.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="space-y-3">
          <Label htmlFor="username" className="text-gray-700 font-bold text-base">E-mail</Label>
          <Input
            {...loginForm.register('username')}
            id="username"
            placeholder="m@example.com"
            className="w-full h-12 rounded-xl border border-gray-300 focus:border-accent focus:outline-none transition-all text-base px-4"
          />
          {loginForm.formState.errors.username && (
            <p className="text-red-500 text-sm">{loginForm.formState.errors.username.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-gray-700 font-bold text-base">Senha</Label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-sm text-gray-700 hover:text-gray-500 font-bold transition-colors"
            >
              Esqueceu a sua senha?
            </button>
          </div>
          <Input
            {...loginForm.register('password')}
            id="password"
            type="password"
            placeholder="Digite sua senha"
            className="w-full h-12 rounded-xl border border-gray-300 focus:border-accent focus:outline-none transition-all text-base px-4"
          />
          {loginForm.formState.errors.password && (
            <p className="text-red-500 text-sm">{loginForm.formState.errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-start pt-2">
          <div className="flex items-center space-x-3">
            <Checkbox
              {...loginForm.register('remember')}
              id="remember"
              className="rounded-md border-2 border-gray-300 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <Label htmlFor="remember" className="text-sm text-gray-600 font-medium">
              Lembrar de mim
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
          style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'hsl(var(--medsync-blue))')}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          {isLoading ? "Entrando..." : "Login"}
        </Button>
      </form>
      
      <div className="text-center mt-6">
        <span className="text-sm text-gray-600 font-bold">Ainda não tem uma conta? </span>
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