import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ===========================
// TYPES
// ===========================

export type StripeCoupon = {
  id: number;
  name: string;
  description?: string;
  stripeCouponId: string;
  discountType: 'percent' | 'amount';
  percentOff?: number;
  amountOffCents?: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  timesRedeemed: number;
  applicablePlans?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StripePromotionCode = {
  id: number;
  code: string;
  couponId: number;
  stripePromotionCodeId: string;
  maxRedemptions?: number;
  timesRedeemed: number;
  expiresAt?: string;
  firstTimeTransaction: boolean;
  minimumAmountCents?: number;
  minimumAmountCurrency?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relação
  coupon?: StripeCoupon;
};

export type CreateCouponData = {
  name: string;
  description?: string;
  discountType: 'percent' | 'amount';
  percentOff?: number;
  amountOffCents?: number;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  applicablePlans?: string[];
  metadata?: Record<string, any>;
  validFrom?: string;
  validUntil?: string;
};

export type CreatePromotionCodeData = {
  code: string;
  couponId: number;
  maxRedemptions?: number;
  expiresAt?: string;
  firstTimeTransaction?: boolean;
  minimumAmountCents?: number;
  metadata?: Record<string, any>;
  notes?: string;
};

// ===========================
// COUPONS HOOKS
// ===========================

export function useCoupons(filters?: { isActive?: boolean; discountType?: string }) {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.discountType) params.set('discountType', filters.discountType);
  
  const queryString = params.toString();
  const endpoint = `/api/admin/discounts/coupons${queryString ? `?${queryString}` : ''}`;

  return useQuery<StripeCoupon[]>({
    queryKey: ['/api/admin/discounts/coupons', filters],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao buscar cupons');
      }
      return response.json();
    },
  });
}

export function useCreateCoupon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCouponData) => {
      const response = await fetch('/api/admin/discounts/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar cupom');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/coupons'] });
      toast({
        title: "Sucesso",
        description: "Cupom criado e sincronizado com Stripe!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ===========================
// PROMOTION CODES HOOKS
// ===========================

export function usePromotionCodes(filters?: { isActive?: boolean; couponId?: number }) {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.couponId) params.set('couponId', String(filters.couponId));
  
  const queryString = params.toString();
  const endpoint = `/api/admin/discounts/promotion-codes${queryString ? `?${queryString}` : ''}`;

  return useQuery<StripePromotionCode[]>({
    queryKey: ['/api/admin/discounts/promotion-codes', filters],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao buscar códigos promocionais');
      }
      return response.json();
    },
  });
}

export function useCreatePromotionCode() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePromotionCodeData) => {
      const response = await fetch('/api/admin/discounts/promotion-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar código promocional');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/promotion-codes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/coupons'] });
      toast({
        title: "Sucesso",
        description: "Código promocional criado e sincronizado com Stripe!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ===========================
// COUPON MUTATIONS (DELETE/TOGGLE)
// ===========================

export function useToggleCoupon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/discounts/coupons/${id}/toggle`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao alternar status do cupom');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/coupons'] });
      toast({
        title: "Sucesso",
        description: "Status do cupom alterado!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCoupon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/discounts/coupons/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir cupom');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/coupons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/promotion-codes'] });
      toast({
        title: "Sucesso",
        description: "Cupom excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ===========================
// PROMOTION CODE MUTATIONS (DELETE/TOGGLE)
// ===========================

export function useTogglePromotionCode() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/discounts/promotion-codes/${id}/toggle`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao alternar status do código');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/promotion-codes'] });
      toast({
        title: "Sucesso",
        description: "Status do código alterado!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeletePromotionCode() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/discounts/promotion-codes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao excluir código');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/promotion-codes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/coupons'] });
      toast({
        title: "Sucesso",
        description: "Código promocional excluído!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ===========================
// BULK OPERATIONS
// ===========================

export function useBulkCreatePromotionCodes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      couponName: string;
      prefix: string;
      quantity: number;
      maxRedemptions?: number;
    }) => {
      const response = await fetch('/api/admin/discounts/bulk-create-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar códigos em lote');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/promotion-codes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discounts/coupons'] });
      toast({
        title: "Sucesso",
        description: `${data.data.created} código(s) criado(s) em lote!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
