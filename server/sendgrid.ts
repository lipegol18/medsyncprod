import sgMail from '@sendgrid/mail';
import { getUrl } from './utils/environment';

// Configurar a API Key do SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('AVISO: SENDGRID_API_KEY não configurada, emails não serão enviados');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface OrderEmailRecipient {
  name: string;
  email: string;
}

export async function sendOrderEmail(
  recipients: OrderEmailRecipient[],
  orderId: number,
  patientName: string,
  pdfBase64: string,
  pdfFilename: string,
  senderName: string
): Promise<{ success: boolean; sent: string[]; failed: string[]; devMode: boolean }> {
  const sent: string[] = [];
  const failed: string[] = [];

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`📧 [EMAIL DEV] Pedido #${orderId} — destinatários:`, recipients.map(r => r.email).join(', '));
    console.log(`📧 [EMAIL DEV] PDF: ${pdfFilename} (${Math.round(pdfBase64.length * 0.75 / 1024)}KB)`);
    return { success: true, sent: recipients.map(r => r.email), failed: [], devMode: true };
  }

  for (const recipient of recipients) {
    try {
      await sgMail.send({
        to: { name: recipient.name, email: recipient.email },
        from: { name: 'MedSync', email: process.env.SENDGRID_FROM_EMAIL || 'noreply@medsync.med.br' },
        subject: `Pedido Cirúrgico #${orderId} — Paciente: ${patientName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">MedSync — Pedido Cirúrgico</h2>
            <p>Prezado(a) <strong>${recipient.name}</strong>,</p>
            <p>Segue em anexo o pedido cirúrgico <strong>#${orderId}</strong> referente ao paciente <strong>${patientName}</strong>, encaminhado pelo Dr(a). ${senderName}.</p>
            <p style="color: #64748b; font-size: 0.875rem;">Este email foi enviado automaticamente pela plataforma MedSync.</p>
          </div>
        `,
        attachments: [
          {
            content: pdfBase64,
            filename: pdfFilename,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });
      sent.push(recipient.email);
      console.log(`✅ [EMAIL] Enviado para ${recipient.email}`);
    } catch (err: any) {
      failed.push(recipient.email);
      console.error(`❌ [EMAIL] Falha ao enviar para ${recipient.email}:`, err?.message);
    }
  }

  return { success: sent.length > 0, sent, failed, devMode: false };
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