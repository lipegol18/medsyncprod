import { z } from 'zod';
import { validateCPF, validateBrazilianPhone } from '@/lib/utils';

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  remember: z.boolean().optional()
});

// Register schema
export const registerSchema = z.object({
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório'),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().refine(validateBrazilianPhone, 'Telefone brasileiro inválido. Use formato: (XX) XXXXX-XXXX'),
  username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
  cep: z.string().min(8, 'CEP deve ter 8 dígitos').max(9, 'CEP inválido'),
  roleId: z.number().min(1, 'Função é obrigatória'),
  medicalSpecialtyId: z.number().min(1, 'Especialidade médica é obrigatória'),
  crm: z.string().min(1, 'CRM é obrigatório').regex(/^\d+$/, 'CRM deve conter apenas números')
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"]
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
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;