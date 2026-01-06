import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type OrderCid = {
  cid: {
    id: number;
    code: string;
    description: string;
    category?: string;
  };
  surgicalApproach: { id: number; name: string } | null;
  surgicalProcedure: { id: number; name: string } | null;
};

export type OrderProcedure = {
  id: number;
  procedure: {
    id: number;
    code: string;
    description: string;
    porte?: string;
  };
  quantity: number;
  isMain: boolean;
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
};

export type OrderOpmeItem = {
  item: {
    id: number;
    technicalName: string;
    commercialName?: string | null;
    anvisaRegistrationNumber?: string | null;
  };
  quantity: number;
  surgicalApproach: { id: number; name: string } | null;
  surgicalProcedure: { id: number; name: string } | null;
};

export type OrderSupplier = {
  supplier: {
    id: number;
    name: string;
    tradeName?: string | null;
    cnpj?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  surgicalApproach: { id: number; name: string } | null;
  surgicalProcedure: { id: number; name: string } | null;
  isApproved: boolean | null;
};

export type MedicalOrder = {
  id: number;
  patientId?: number | null;
  hospitalId?: number | null;
  statusId?: number;
  anatomicalRegionId?: number | null;
  urgencyLevel?: string;
  clinicalIndication?: string;
  clinicalHistory?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const useOrderData = (orderId: number | null) => {
  const queryClient = useQueryClient();

  const orderQuery = useQuery<MedicalOrder>({
    queryKey: ["/api/medical-orders", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID");
      return await apiRequest(`/api/medical-orders/${orderId}`, "GET");
    },
    enabled: !!orderId,
    staleTime: 30000,
  });

  const cidsQuery = useQuery<OrderCid[]>({
    queryKey: ["/api/orders", orderId, "cids"],
    queryFn: async () => {
      if (!orderId) return [];
      return await apiRequest(`/api/orders/${orderId}/cids`, "GET");
    },
    enabled: !!orderId,
    staleTime: 30000,
  });

  const proceduresQuery = useQuery<OrderProcedure[]>({
    queryKey: ["/api/orders", orderId, "procedures"],
    queryFn: async () => {
      if (!orderId) return [];
      return await apiRequest(`/api/orders/${orderId}/procedures`, "GET");
    },
    enabled: !!orderId,
    staleTime: 30000,
  });

  const opmeItemsQuery = useQuery<OrderOpmeItem[]>({
    queryKey: ["/api/orders", orderId, "opme-items"],
    queryFn: async () => {
      if (!orderId) return [];
      return await apiRequest(`/api/orders/${orderId}/opme-items`, "GET");
    },
    enabled: !!orderId,
    staleTime: 30000,
  });

  const suppliersQuery = useQuery<OrderSupplier[]>({
    queryKey: ["/api/orders", orderId, "suppliers"],
    queryFn: async () => {
      if (!orderId) return [];
      return await apiRequest(`/api/orders/${orderId}/suppliers`, "GET");
    },
    enabled: !!orderId,
    staleTime: 30000,
  });

  const invalidateOrder = () => {
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-orders", orderId] });
    }
  };

  const invalidateCids = () => {
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "cids"] });
    }
  };

  const invalidateProcedures = () => {
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "procedures"] });
    }
  };

  const invalidateOpmeItems = () => {
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "opme-items"] });
    }
  };

  const invalidateSuppliers = () => {
    if (orderId) {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "suppliers"] });
    }
  };

  const invalidateAll = () => {
    invalidateOrder();
    invalidateCids();
    invalidateProcedures();
    invalidateOpmeItems();
    invalidateSuppliers();
  };

  const isLoading = 
    orderQuery.isLoading || 
    cidsQuery.isLoading || 
    proceduresQuery.isLoading || 
    opmeItemsQuery.isLoading || 
    suppliersQuery.isLoading;

  const isError = 
    orderQuery.isError || 
    cidsQuery.isError || 
    proceduresQuery.isError || 
    opmeItemsQuery.isError || 
    suppliersQuery.isError;

  return {
    order: orderQuery.data,
    cids: cidsQuery.data ?? [],
    procedures: proceduresQuery.data ?? [],
    opmeItems: opmeItemsQuery.data ?? [],
    suppliers: suppliersQuery.data ?? [],
    
    orderQuery,
    cidsQuery,
    proceduresQuery,
    opmeItemsQuery,
    suppliersQuery,
    
    isLoading,
    isError,
    
    invalidateOrder,
    invalidateCids,
    invalidateProcedures,
    invalidateOpmeItems,
    invalidateSuppliers,
    invalidateAll,
  };
};
