import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
      <div>
        <div className="text-center mb-6">
          <h2 className="modal-title">
            Redefinir senha
          </h2>
          <p className="modal-subtitle">
            Digite sua nova senha
          </p>
        </div>
        
        <form onSubmit={resetPasswordForm.handleSubmit(handleResetPasswordSubmit)}>
          <div>
            <label htmlFor="reset-password" className="label-medsync">Nova senha</label>
            <input
              {...resetPasswordForm.register('password')}
              id="reset-password"
              type="password"
              placeholder="Digite sua nova senha"
              className="input-medsync"
            />
            {resetPasswordForm.formState.errors.password && (
              <p className="text-error mt-1">{resetPasswordForm.formState.errors.password.message}</p>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor="reset-confirmPassword" className="label-medsync">Confirmar nova senha</label>
            <input
              {...resetPasswordForm.register('confirmPassword')}
              id="reset-confirmPassword"
              type="password"
              placeholder="Confirme sua nova senha"
              className="input-medsync"
            />
            {resetPasswordForm.formState.errors.confirmPassword && (
              <p className="text-error mt-1">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-medsync-light w-full mt-5"
            disabled={isLoadingReset}
          >
            {isLoadingReset ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {isLoadingReset ? "Atualizando..." : "Atualizar senha"}
          </button>
        </form>
        
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-accent hover:text-accent/80 font-bold transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="modal-title">
          Recuperar senha
        </h2>
        <p className="modal-subtitle">
          Digite seu email para receber instruções de recuperação
        </p>
      </div>
      
      {!resetEmailSent ? (
        <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)}>
          <div>
            <label htmlFor="forgot-email" className="label-medsync">Email</label>
            <input
              {...forgotPasswordForm.register('email')}
              id="forgot-email"
              type="email"
              placeholder="Digite seu email cadastrado"
              className="input-medsync"
            />
            {forgotPasswordForm.formState.errors.email && (
              <p className="text-error mt-1">{forgotPasswordForm.formState.errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-medsync-light w-full mt-5"
            disabled={isLoadingForgot}
          >
            {isLoadingForgot ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {isLoadingForgot ? "Enviando..." : "Enviar instruções"}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-accent hover:text-accent/80 font-bold transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-4" />
          <div>
            <h3 className="text-lg font-semibold text-medsync-gray mb-2">Email enviado!</h3>
            <p className="text-medsync-gray text-sm mb-4">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <button
              onClick={handleBackToLoginWithReset}
              className="text-sm text-accent hover:text-accent/80 font-bold transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}