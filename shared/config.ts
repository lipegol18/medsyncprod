/**
 * Configurações centralizadas do sistema MedSync
 * Edite este arquivo para alterar as configurações globais
 */

// Configurações do WhatsApp para suporte
export const WHATSAPP_CONFIG = {
  // Número padrão para suporte geral
  default: "5521999991905",
  
  // Números específicos por contexto asdad
  contexts: {
    // Brasil - suporte local
    br: "5521999991905",
    
    // Portugal - suporte internacional  
    pt: "5521999991905", // Pode alterar para número português se necessário
    
    // Vendas/Comercial - para Plano CLÍNICA
    sales: "5521999991905", // Pode alterar para equipe comercial específica
  }
} as const;

// Tipo TypeScript para autocomplete e type safety
export type SupportContextType = keyof typeof WHATSAPP_CONFIG.contexts;

/**
 * Função utilitária para obter número de WhatsApp por contexto
 * @param context Contexto específico ('br', 'pt', 'sales') ou undefined para padrão
 * @returns Número de telefone formatado
 */
export function getSupportWhatsAppNumber(context?: SupportContextType): string {
  if (context && WHATSAPP_CONFIG.contexts[context]) {
    return WHATSAPP_CONFIG.contexts[context];
  }
  return WHATSAPP_CONFIG.default;
}

// Configurações de webhooks N8N
export const N8N_WEBHOOKS = {
  baseUrl: "https://hook-prod.iotninja.com.br/webhook",
  
  endpoints: {
    // Formulário "Fale Conosco"
    contact: {
      path: "/fale-conosco",
      token: "ff7b1100-7e5d-4c09-b4c2-02d256c70a07",
      requiredFields: ["name", "email", "subject", "message"] as const
    },
    
    // Envio de Suporte
    support: {
      path: "/envio-suporte",
      token: "630f0db9-211b-4ab1-ad03-83e0d5b6cfd1",
      requiredFields: ["name", "email", "subject", "message"] as const
    },
    
    // Reset de Senha
    passwordReset: {
      path: "/resposta-usuario",
      token: "9fa1a85a-c542-48c6-bb3f-b667f676f77b",
      requiredFields: ["name", "email", "reset_link"] as const
    },
    
    // Validação de CRM (Registro de Usuário)
    validateCRM: {
      path: "/validar-crm",
      token: "2qJy7AbHKGt4mb6USd6Df8jF5N5HxgD12",
      requiredFields: ["name", "email", "crm", "message"] as const,
      optionalFields: ["crm_estado"] as const
    },
    
    // Geração de Justificativa com IA
    generateJustification: {
      path: "/medsync",
      token: "f9a2b8e3-c1d5-4e7f-a6b0-9c8d7e6f5a4b",
      requiredFields: [
        "procedimento_cirurgico",
        "via_acesso",
        "regiao_anatomica",
        "cids",
        "materiais"
      ] as const
    },
    
    // Geração de Recurso de Glosa com IA
    generateGlossAppeal: {
      path: "/resposta-glosa",
      token: "f9a2b8e3-c1d5-4e7f-a6b0-9c8d7e6f5a4b",
      requiredFields: ["motivo_glosa"] as const
    }
  }
} as const;

/**
 * Função auxiliar para fazer requisições autenticadas aos webhooks N8N
 * @param endpoint Endpoint do webhook ('contact', 'support', 'passwordReset')
 * @param payload Dados a serem enviados
 * @returns Promise com a resposta do webhook
 */
export async function sendToN8NWebhook(
  endpoint: keyof typeof N8N_WEBHOOKS.endpoints,
  payload: Record<string, any>
): Promise<Response> {
  const config = N8N_WEBHOOKS.endpoints[endpoint];
  const url = `${N8N_WEBHOOKS.baseUrl}${config.path}`;
  
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.token}`
    },
    body: JSON.stringify(payload)
  });
}

// Outras configurações do sistema podem ser adicionadas aqui futuramente dfdsfdsfds
export const SYSTEM_CONFIG = {
  // Email de suporte
  supportEmail: "medsync.suporte@gmail.com",
  
  // Configurações gerais
  app: {
    name: "MedSync",
    version: "1.0.0",
    supportPhone: WHATSAPP_CONFIG.default
  }
} as const;
