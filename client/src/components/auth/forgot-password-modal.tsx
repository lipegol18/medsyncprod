import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  forgotPasswordSchema, 
  resetPasswordSchema,
  type ForgotPasswordForm, 
  type ResetPasswordForm 
} from '@/schemas/auth-schemas';

interface ForgotPasswordModalProps {
  onSubmitForgotPassword: (data: ForgotPasswordForm) => void;
  onSubmitResetPassword: (data: ResetPasswordForm) => void;
  onBackToLogin: () => void;
  isLoadingForgot: boolean;
  isLoadingReset: boolean;
  resetEmailSent: boolean;
  showResetForm: boolean;
  setResetEmailSent: (sent: boolean) => void;
}

export function ForgotPasswordModal({
  onSubmitForgotPassword,
  onSubmitResetPassword,
  onBackToLogin,
  isLoadingForgot,
  isLoadingReset,
  resetEmailSent,
  showResetForm,
  setResetEmailSent
}: ForgotPasswordModalProps) {
  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  const handleForgotPasswordSubmit = (data: ForgotPasswordForm) => {
    onSubmitForgotPassword(data);
  };

  const handleResetPasswordSubmit = (data: ResetPasswordForm) => {
    onSubmitResetPassword(data);
  };

  const handleBackToLoginWithReset = () => {
    setResetEmailSent(false);
    forgotPasswordForm.reset();
    onBackToLogin();
  };

  if (showResetForm) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Redefinir senha</h2>
          <p className="text-gray-600">Digite sua nova senha abaixo</p>
        </div>
        
        <form onSubmit={resetPasswordForm.handleSubmit(handleResetPasswordSubmit)} className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor="reset-password" className="text-gray-700 font-medium">Nova senha</Label>
            <Input
              {...resetPasswordForm.register('password')}
              id="reset-password"
              type="password"
              placeholder="Digite sua nova senha"
              className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors text-base px-4"
            />
            {resetPasswordForm.formState.errors.password && (
              <p className="text-red-500 text-sm">{resetPasswordForm.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="reset-confirmPassword" className="text-gray-700 font-medium">Confirmar nova senha</Label>
            <Input
              {...resetPasswordForm.register('confirmPassword')}
              id="reset-confirmPassword"
              type="password"
              placeholder="Confirme sua nova senha"
              className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors text-base px-4"
            />
            {resetPasswordForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
            style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
            onMouseEnter={(e) => !isLoadingReset && (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
            onMouseLeave={(e) => !isLoadingReset && (e.currentTarget.style.backgroundColor = 'hsl(var(--medsync-blue))')}
            disabled={isLoadingReset}
          >
            {isLoadingReset ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {isLoadingReset ? "Atualizando..." : "Atualizar senha"}
          </Button>
        </form>
        
        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!resetEmailSent ? (
        <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="forgot-email" className="text-gray-700 font-medium">Email</Label>
            <Input
              {...forgotPasswordForm.register('email')}
              id="forgot-email"
              type="email"
              placeholder="Digite seu email cadastrado"
              className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-accent focus:ring-0 transition-colors text-base px-4"
            />
            {forgotPasswordForm.formState.errors.email && (
              <p className="text-red-500 text-sm">{forgotPasswordForm.formState.errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-9 text-white font-semibold rounded-lg text-sm shadow-md transition-all duration-200 hover:shadow-lg"
            style={{backgroundColor: 'hsl(var(--medsync-blue))'}}
            onMouseEnter={(e) => !isLoadingForgot && (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
            onMouseLeave={(e) => !isLoadingForgot && (e.currentTarget.style.backgroundColor = 'hsl(var(--medsync-blue))')}
            disabled={isLoadingForgot}
          >
            {isLoadingForgot ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {isLoadingForgot ? "Enviando..." : "Enviar instruções"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-primary hover:text-primary/80 underline"
            >
              Voltar ao login
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email enviado!</h3>
            <p className="text-gray-600 text-sm mb-4">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <button
              onClick={handleBackToLoginWithReset}
              className="text-sm text-primary hover:text-primary/80 underline"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}