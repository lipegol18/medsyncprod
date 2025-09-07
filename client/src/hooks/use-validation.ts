import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface ValidationResult {
  isUnique: boolean;
}

interface ValidationHook {
  validateUnique: (field: 'cpf' | 'crm' | 'phone' | 'email' | 'username', value: string, excludeUserId?: number) => Promise<boolean>;
  isValidating: boolean;
}

export function useValidation(): ValidationHook {
  const [isValidating, setIsValidating] = useState(false);

  const validateUnique = async (
    field: 'cpf' | 'crm' | 'phone' | 'email' | 'username', 
    value: string, 
    excludeUserId?: number
  ): Promise<boolean> => {
    if (!value.trim()) return true; // Campos vazios não precisam validação de unicidade
    
    setIsValidating(true);
    
    try {
      const response = await apiRequest<ValidationResult>('/api/validate/unique', 'POST', {
        field,
        value: value.trim(),
        excludeUserId
      });
      
      return response.isUnique;
    } catch (error) {
      console.error('Erro na validação de unicidade:', error);
      return false; // Em caso de erro, considerar como não único para segurança
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateUnique,
    isValidating
  };
}