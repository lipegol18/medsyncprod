import sgMail from '@sendgrid/mail';

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
  console.log(`📧 [EMAIL] Iniciando envio de email de recuperação para ${email}`);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`⚠️ [EMAIL] SENDGRID_API_KEY não configurada. Email não será enviado.`);
    console.log(`📧 [EMAIL] SIMULAÇÃO: Token de recuperação ${resetToken} para ${email}`);
    console.log(`📧 [EMAIL] SIMULAÇÃO: Link de recuperação: http://localhost:5000/auth?reset=${resetToken}`);
    return false;
  }

  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/auth?reset=${resetToken}`;
  console.log(`📧 [EMAIL] URL de recuperação: ${resetUrl}`);
  
  // Verifique se é o email especificado do cliente
  const isTargetEmail = email === 'felipecorreati@gmail.com';
  if (isTargetEmail) {
    console.log(`📧 [EMAIL] Email alvo detectado: ${email} - Processando envio especial`);
  }
  
  const msg = {
    to: email,
    from: 'support@medsyncsystem.com', // Domínio verificado no SendGrid
    subject: isTargetEmail ? 'MedSync - Recuperação de Senha (Solicitado por Felipe)' : 'MedSync - Recuperação de Senha',
    text: `Olá ${userName},\n\nVocê solicitou a recuperação de senha. Para criar uma nova senha, acesse o link:\n\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe você não solicitou esta recuperação, ignore este email.\n\nAtenciosamente,\nEquipe MedSync`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">MedSync - Recuperação de Senha</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Você solicitou a recuperação de senha da sua conta MedSync.</p>
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #000; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Redefinir Senha
          </a>
        </div>
        <p style="font-size: 13px; color: #666;">Este link expira em 1 hora.</p>
        <p style="font-size: 13px; color: #666;">Se você não solicitou esta recuperação, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Atenciosamente,<br>
          Equipe MedSync
        </p>
      </div>
    `
  };

  try {
    console.log(`📧 [EMAIL] Enviando email para ${email} via SendGrid`);
    await sgMail.send(msg);
    console.log(`✅ [EMAIL] Email de recuperação enviado com sucesso para ${email}`);
    return true;
  } catch (error: unknown) {
    console.error('❌ [EMAIL] Erro ao enviar email de recuperação:', error);
    // Verificar se o erro tem a propriedade 'response' de forma segura
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'body' in error.response) {
      console.error(`❌ [EMAIL] Detalhes do erro:`, (error.response as any).body);
    }
    return false;
  }
}