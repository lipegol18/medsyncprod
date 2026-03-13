import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  remember: z.boolean().optional()
});

// Register schema (simplified - Phase 1 only)
export const registerSchema = z.object({
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  roleId: z.number().min(1, 'Função é obrigatória'),
  medicalSpecialtyId: z.number().min(1, 'Especialidade médica é obrigatória'),
  crm: z.string().min(1, 'CRM é obrigatório').regex(/^\d+$/, 'CRM deve conter apenas números'),
  crmUf: z.string().min(2, 'Estado do CRM é obrigatório').max(2, 'Estado deve ter 2 caracteres')
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

// Profile completion schema (Phase 2 - CPF, phone, address)
export const profileCompletionSchema = z.object({
  cpf: z.string().min(11, 'CPF inválido'),
  phone: z.string().min(14, 'Telefone inválido'),
  cep: z.string().min(8, 'CEP deve ter 8 dígitos').max(9, 'CEP inválido'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
});

// Reset password schema
export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
});

// Types
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ProfileCompletionForm = z.infer<typeof profileCompletionSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
