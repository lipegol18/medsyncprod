import sgMail from '@sendgrid/mail';
import { getUrl } from './utils/environment';

// Configurar a API Key do SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('AVISO: SENDGRID_API_KEY não configurada, emails não serão enviados');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  userName: string
): Promise<boolean> {
  console.log(`📧 [EMAIL] Iniciando recuperação de senha para ${email}`);
  console.log(`🔧 [EMAIL] SendGrid desabilitado - usando modo de desenvolvimento`);
  
  // Sempre usar modo de desenvolvimento (SendGrid desabilitado)
  const resetUrl = getUrl(`auth?reset=${resetToken}`);
  console.log(`📧 [EMAIL] Token de recuperação: ${resetToken}`);
  console.log(`📧 [EMAIL] Link de recuperação: ${resetUrl}`);
  console.log(`📧 [EMAIL] Email destinatário: ${email} (${userName})`);
  console.log(`✅ [EMAIL] Modo de desenvolvimento ativo - URL fornecida para acesso direto`);
  
  return false; // Sempre retorna false para usar fallback
}
