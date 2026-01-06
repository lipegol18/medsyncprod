import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, Trash2, Link2, Settings, X, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { CreateProcedureModal } from "@/components/CreateProcedureModal";
import { CreateApproachModal } from "@/components/CreateApproachModal";
import CloneAssociationsModal from "@/components/CloneAssociationsModal";
import { RichTextEditor } from "@/components/rich-text-editor";

type AnatomicalRegion = {
  id: number;
  name: string;
  description?: string;
};

type SurgicalProcedure = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
};

type SurgicalApproach = {
  id: number;
  name: string;
  description?: string;
};

type CidCode = {
  id: number;
  code: string;
  description: string;
  category?: string;
};

type ProcedureAssociation = {
  procedureId: number;
  procedureName: string;
  anatomicalRegions: AnatomicalRegion[];
  approaches: {
    id: number;
    name: string;
    cidCodes: CidCode[];
  }[];
};

export default function ProcedureAssociationsPage() {
  const [selectedProcedure, setSelectedProcedure] = useState<number | null>(null);
  const [selectedApproach, setSelectedApproach] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [approachSearchTerm, setApproachSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateProcedureModalOpen, setIsCreateProcedureModalOpen] = useState(false);
  const [isCreateApproachModalOpen, setIsCreateApproachModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  
  // Estados para busca de associações
  const [cidSearchTerm, setCidSearchTerm] = useState("");
  const [cbhpmSearchTerm, setCbhpmSearchTerm] = useState("");
  const [opmeSearchTerm, setOpmeSearchTerm] = useState("");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [justificationSearchTerm, setJustificationSearchTerm] = useState("");
  
  // Estados para resultados de busca
  const [cidSearchResults, setCidSearchResults] = useState([]);
  const [cbhpmSearchResults, setCbhpmSearchResults] = useState([]);
  const [opmeSearchResults, setOpmeSearchResults] = useState([]);
  const [supplierSearchResults, setSupplierSearchResults] = useState([]);
  const [justificationSearchResults, setJustificationSearchResults] = useState([]);
  
  // Estados de loading
  const [cidLoading, setCidLoading] = useState(false);
  const [cbhpmLoading, setCbhpmLoading] = useState(false);
  const [opmeLoading, setOpmeLoading] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [justificationLoading, setJustificationLoading] = useState(false);
  
  // Estados para edição de justificativas
  const [editingJustification, setEditingJustification] = useState<number | null>(null);
  const [justificationContent, setJustificationContent] = useState("");
  const [newJustificationContent, setNewJustificationContent] = useState("");
  
  // Estados removidos - campos agora são sempre editáveis

  const [formData, setFormData] = useState({
    procedureId: "",
    anatomicalRegionIds: [] as number[],
    approachId: "",
    cidCodeIds: [] as number[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os dados necessários
  const { data: procedures = [] } = useQuery({
    queryKey: ["/api/admin/surgical-procedures"],
  });

  const { data: anatomicalRegions = [] } = useQuery({
    queryKey: ["/api/anatomical-regions"],
  });

  const { data: approaches = [] } = useQuery({
    queryKey: ["/api/admin/surgical-approaches"],
  });

  // const { data: cbhpmProcedures = [] } = useQuery({
  //   queryKey: ["/api/admin/cbhpm-procedures"],
  // });

  // const { data: opmeItems = [] } = useQuery({
  //   queryKey: ["/api/admin/opme-items"],
  // });

  // const { data: suppliers = [] } = useQuery({
  //   queryKey: ["/api/admin/suppliers"],
  // });

  // const { data: clinicalJustifications = [] } = useQuery({
  //   queryKey: ["/api/admin/clinical-justifications"],
  // });

  // Buscar associações existentes para um procedimento
  const { data: procedureAssociations = [], isLoading: isLoadingAssociations } = useQuery({
    queryKey: ["/api/admin/procedure-associations", selectedProcedure],
    enabled: !!selectedProcedure,
    queryFn: async () => {
      console.log(`🔍 [DEBUG] Chamando API: /api/admin/procedure-associations/${selectedProcedure}`);
      const response = await fetch(`/api/admin/procedure-associations/${selectedProcedure}`);
      if (!response.ok) {
        console.error(`❌ [DEBUG] Erro na API: ${response.status} ${response.statusText}`);
        throw new Error('Erro na API');
      }
      const data = await response.json();
      console.log(`📊 [DEBUG] Dados recebidos:`, data);
      console.log(`📊 [DEBUG] Tipo:`, typeof data, 'Array?', Array.isArray(data), 'Length:', data?.length);
      return data;
    }
  });

  // Buscar detalhes de uma conduta selecionada (CID-10, CBHPM, OPME)
  const { data: approachDetails, isLoading: isLoadingApproachDetails, error: approachDetailsError } = useQuery({
    queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure],
    enabled: !!selectedApproach && !!selectedProcedure,
    queryFn: async () => {
      console.log(`🔍 [DEBUG] Chamando API detalhes: /api/admin/approach-details/${selectedApproach}?procedureId=${selectedProcedure}`);
      const response = await fetch(`/api/admin/approach-details/${selectedApproach}?procedureId=${selectedProcedure}`);
      console.log(`📊 [DEBUG] Response status:`, response.status);
      if (!response.ok) {
        console.error(`❌ [DEBUG] Erro na API detalhes: ${response.status} ${response.statusText}`);
        throw new Error('Erro na API');
      }
      const data = await response.json();
      console.log(`📊 [DEBUG] Detalhes recebidos:`, data);
      return data;
    }
  });

  // Criar nova associação
  const createAssociationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/admin/procedure-associations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar associação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-associations"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Associação criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar associação.",
        variant: "destructive",
      });
    },
  });

  // Remover associação
  const deleteAssociationMutation = useMutation({
    mutationFn: async ({ procedureId, approachId }: { procedureId: number; approachId: number }) => {
      const response = await fetch(`/api/admin/procedure-associations/${procedureId}/${approachId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao remover associação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-associations"] });
      toast({
        title: "Sucesso",
        description: "Associação removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover associação.",
        variant: "destructive",
      });
    },
  });

  // === MUTATIONS PARA CID-10 ===
  const addCidMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; cidId: number; isPrimary?: boolean }) => {
      const response = await fetch('/api/admin/approach-cids', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar CID');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "CID-10 adicionado com sucesso!",
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

  const removeCidMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; cidId: number }) => {
      const response = await fetch(`/api/admin/approach-cids/${data.procedureId}/${data.approachId}/${data.cidId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Erro ao remover CID');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "CID-10 removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover CID-10.",
        variant: "destructive",
      });
    },
  });

  // === MUTATIONS PARA CBHPM ===
  const addCbhpmMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; cbhpmId: number; quantity?: number }) => {
      const response = await fetch('/api/admin/approach-cbhpm', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar CBHPM');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "CBHPM adicionado com sucesso!",
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

  const removeCbhpmMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; cbhpmId: number }) => {
      const response = await fetch(`/api/admin/approach-cbhpm/${data.procedureId}/${data.approachId}/${data.cbhpmId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Erro ao remover CBHPM');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "CBHPM removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover CBHPM.",
        variant: "destructive",
      });
    },
  });

  // === MUTATIONS PARA OPME ===
  const addOpmeMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; opmeId: number; quantity?: number }) => {
      const response = await fetch('/api/admin/approach-opme', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar OPME');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "OPME adicionado com sucesso!",
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

  const removeOpmeMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; opmeId: number }) => {
      const response = await fetch(`/api/admin/approach-opme/${data.procedureId}/${data.approachId}/${data.opmeId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Erro ao remover OPME');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "OPME removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover OPME.",
        variant: "destructive",
      });
    },
  });

  // === MUTATIONS PARA FORNECEDORES ===
  const addSupplierMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; supplierId: number }) => {
      const response = await fetch('/api/admin/approach-suppliers', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar fornecedor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Fornecedor adicionado com sucesso!",
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

  const removeSupplierMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; supplierId: number }) => {
      const response = await fetch(`/api/admin/approach-suppliers/${data.procedureId}/${data.approachId}/${data.supplierId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Erro ao remover fornecedor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Fornecedor removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover fornecedor.",
        variant: "destructive",
      });
    },
  });

  const updateSupplierPriorityMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; supplierId: number; priority: number }) => {
      const response = await fetch(`/api/admin/approach-suppliers/${data.procedureId}/${data.approachId}/${data.supplierId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: data.priority }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar prioridade');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Prioridade atualizada com sucesso!",
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

  // === MUTATIONS PARA JUSTIFICATIVAS ===
  const addJustificationMutation = useMutation({
    mutationFn: async (data: { approachId: number; justificationId: number; procedureId: number }) => {
      const response = await fetch('/api/admin/approach-justifications', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar justificativa');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Justificativa adicionada com sucesso!",
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

  const removeJustificationMutation = useMutation({
    mutationFn: async (data: { approachId: number; justificationId: number }) => {
      const response = await fetch(`/api/admin/approach-justifications/${data.approachId}/${data.justificationId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Erro ao remover justificativa');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Justificativa removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover justificativa.",
        variant: "destructive",
      });
    },
  });

  const updateJustificationMutation = useMutation({
    mutationFn: async (data: { justificationId: number; content: string }) => {
      const response = await fetch(`/api/admin/clinical-justifications/${data.justificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar justificativa');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Justificativa atualizada com sucesso!",
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

  const createJustificationMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      const response = await fetch('/api/admin/clinical-justifications', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar justificativa');
      }
      return response.json();
    },
    onSuccess: (response) => {
      // Adicionar a nova justificativa à conduta atual se estiver no contexto de uma conduta
      if (selectedApproach && selectedProcedure && response.justification) {
        addJustificationMutation.mutate({
          approachId: selectedApproach,
          justificationId: response.justification.id,
          procedureId: selectedProcedure
        });
      }
      // Limpar o campo após sucesso
      setNewJustificationContent("");
      toast({
        title: "Sucesso",
        description: "Justificativa criada com sucesso!",
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

  // === MUTATIONS PARA ATUALIZAR QUANTIDADES ===
  const updateCbhpmQuantityMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; cbhpmId: number; quantity: number }) => {
      const response = await fetch(`/api/admin/approach-cbhpm/${data.procedureId}/${data.approachId}/${data.cbhpmId}/quantity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: data.quantity }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar quantidade CBHPM');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Quantidade CBHPM atualizada com sucesso!",
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

  const updateOpmeQuantityMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; opmeId: number; quantity: number }) => {
      const response = await fetch(`/api/admin/approach-opme/${data.procedureId}/${data.approachId}/${data.opmeId}/quantity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: data.quantity }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar quantidade OPME');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Quantidade OPME atualizada com sucesso!",
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

  const updateOpmeDisplayOrderMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number; opmeId: number; displayOrder: number }) => {
      const response = await fetch(`/api/admin/approach-opme/${data.procedureId}/${data.approachId}/${data.opmeId}/display-order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: data.displayOrder }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar ordem de apresentação OPME');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details", selectedApproach, selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Ordem de apresentação OPME atualizada com sucesso!",
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

  // === FUNÇÕES DE BUSCA COM DEBOUNCE ===
  
  // Função para formatar automaticamente o código CID-10
  const formatCidCode = (value: string): string => {
    // Remove todos os caracteres que não são letras ou números
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem pelo menos 3 caracteres (1 letra + 2 números), adiciona o ponto
    if (cleaned.length >= 4) {
      // Formato: L12.3 (1 letra + 2 números + ponto + 1 número)
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 4)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CID-10 para busca (garante que tenha ponto)
  const normalizeCidForSearch = (value: string): string => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem exatamente 4 caracteres sem ponto, adiciona o ponto
    if (cleaned.length === 4 && /^[A-Z][0-9]{3}$/.test(cleaned)) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[A-Z][0-9]{2}\.[0-9]$/.test(value.toUpperCase())) {
      return value.toUpperCase();
    }
    
    return value;
  };

  // Busca de CID-10
  useEffect(() => {
    const fetchCidCodes = async () => {
      if (cidSearchTerm.length < 2) {
        setCidSearchResults([]);
        return;
      }

      try {
        setCidLoading(true);
        const normalizedTerm = normalizeCidForSearch(cidSearchTerm);
        
        const response = await fetch(
          `/api/cid-codes/search?q=${encodeURIComponent(normalizedTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar códigos CID-10: ${response.status}`);
        }

        const data = await response.json();
        setCidSearchResults(data);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar códigos CID-10",
          variant: "destructive",
        });
        setCidSearchResults([]);
      } finally {
        setCidLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (cidSearchTerm.length >= 2) {
        fetchCidCodes();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [cidSearchTerm]);

  // Busca de CBHPM
  useEffect(() => {
    const fetchCbhpmProcedures = async () => {
      if (cbhpmSearchTerm.length < 3) {
        setCbhpmSearchResults([]);
        return;
      }

      try {
        setCbhpmLoading(true);
        
        const response = await fetch(
          `/api/procedures/search?q=${encodeURIComponent(cbhpmSearchTerm)}&cbhpmOnly=true`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar procedimentos CBHPM: ${response.status}`);
        }

        const data = await response.json();
        setCbhpmSearchResults(data);
      } catch (error) {
        console.error("Erro ao buscar procedimentos CBHPM:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar procedimentos CBHPM",
          variant: "destructive",
        });
        setCbhpmSearchResults([]);
      } finally {
        setCbhpmLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (cbhpmSearchTerm.length >= 3) {
        fetchCbhpmProcedures();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [cbhpmSearchTerm]);

  // Busca de OPME
  useEffect(() => {
    const fetchOpmeItems = async () => {
      if (opmeSearchTerm.length < 3) {
        setOpmeSearchResults([]);
        return;
      }

      try {
        setOpmeLoading(true);
        
        const response = await fetch(
          `/api/opme-items/search?q=${encodeURIComponent(opmeSearchTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar itens OPME: ${response.status}`);
        }

        const data = await response.json();
        setOpmeSearchResults(data);
      } catch (error) {
        console.error("Erro ao buscar itens OPME:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar itens OPME",
          variant: "destructive",
        });
        setOpmeSearchResults([]);
      } finally {
        setOpmeLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (opmeSearchTerm.length >= 3) {
        fetchOpmeItems();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [opmeSearchTerm]);

  // Busca de Fornecedores  
  useEffect(() => {
    const fetchSuppliers = async () => {
      if (supplierSearchTerm.length < 2) {
        setSupplierSearchResults([]);
        return;
      }

      try {
        setSupplierLoading(true);
        
        const response = await fetch(
          `/api/suppliers/search?q=${encodeURIComponent(supplierSearchTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar fornecedores: ${response.status}`);
        }

        const data = await response.json();
        setSupplierSearchResults(data);
      } catch (error) {
        console.error("Erro ao buscar fornecedores:", error);
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar fornecedores",
          variant: "destructive",
        });
        setSupplierSearchResults([]);
      } finally {
        setSupplierLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (supplierSearchTerm.length >= 2) {
        fetchSuppliers();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [supplierSearchTerm]);

  // Buscar região associada ao procedimento selecionado
  const { data: procedureRegion, isLoading: isLoadingProcedureRegion } = useQuery({
    queryKey: ["/api/admin/procedure-regions", selectedProcedure],
    enabled: !!selectedProcedure,
    queryFn: async () => {
      const response = await fetch(`/api/admin/procedure-regions/${selectedProcedure}`);
      if (!response.ok) throw new Error('Erro ao buscar região');
      return response.json();
    }
  });

  // Buscar condutas associadas ao procedimento selecionado  
  const { data: procedureApproaches, isLoading: isLoadingProcedureApproaches } = useQuery({
    queryKey: ["/api/admin/procedure-approaches", selectedProcedure],
    enabled: !!selectedProcedure,
    queryFn: async () => {
      const response = await fetch(`/api/admin/procedure-approaches/${selectedProcedure}`);
      if (!response.ok) throw new Error('Erro ao buscar condutas');
      return response.json();
    }
  });

  // Definir/alterar região do procedimento
  const setRegionMutation = useMutation({
    mutationFn: async (data: { procedureId: number; regionId: number | null }) => {
      if (data.regionId === null) {
        // Remover região
        const response = await fetch(`/api/admin/procedure-regions/${data.procedureId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error('Erro ao remover região');
        return response.json();
      } else {
        // Definir região
        const response = await fetch(`/api/admin/procedure-regions/${data.procedureId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regionId: data.regionId }),
        });
        if (!response.ok) throw new Error('Erro ao definir região');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-regions", selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Região anatômica atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar região anatômica.",
        variant: "destructive",
      });
    },
  });

  // Adicionar conduta ao procedimento
  const addApproachMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number }) => {
      const response = await fetch('/api/admin/procedure-approaches', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar conduta');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-approaches", selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Conduta cirúrgica adicionada com sucesso!",
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

  // Remover conduta do procedimento
  const removeApproachMutation = useMutation({
    mutationFn: async (data: { procedureId: number; approachId: number }) => {
      const response = await fetch(`/api/admin/procedure-approaches/${data.procedureId}/${data.approachId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error('Erro ao remover conduta');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-approaches", selectedProcedure] });
      toast({
        title: "Sucesso",
        description: "Conduta cirúrgica removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover conduta cirúrgica.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      procedureId: "",
      anatomicalRegionIds: [],
      approachId: "",
      cidCodeIds: [],
    });
  };

  const handleCreateAssociation = () => {
    if (!formData.procedureId || !formData.approachId) {
      toast({
        title: "Erro",
        description: "Selecione um procedimento e uma conduta.",
        variant: "destructive",
      });
      return;
    }
    createAssociationMutation.mutate(formData);
  };

  const handleDeleteAssociation = (procedureId: number, approachId: number) => {
    if (confirm("Tem certeza que deseja remover esta associação?")) {
      deleteAssociationMutation.mutate({ procedureId, approachId });
    }
  };

  const filteredProcedures = (procedures as SurgicalProcedure[]).filter((proc: SurgicalProcedure) =>
    proc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApproaches = (approaches as SurgicalApproach[])
    .filter((approach: SurgicalApproach) =>
      approach.name.toLowerCase().includes(approachSearchTerm.toLowerCase())
    )
    .filter((approach: SurgicalApproach) => 
      !procedureApproaches?.some((pa: any) => pa.id === approach.id)
    );

  const selectedProcedureData = (procedures as SurgicalProcedure[]).find((p: SurgicalProcedure) => p.id === selectedProcedure);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Associações</h1>
          <p className="text-muted-foreground">
            Configure as associações automáticas entre procedimentos, regiões, condutas e CID-10
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Associação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Associação</DialogTitle>
              <DialogDescription>
                Configure uma nova associação entre procedimento, conduta e CID-10
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="procedure">Procedimento Cirúrgico</Label>
                <Select
                  value={formData.procedureId}
                  onValueChange={(value) => setFormData({ ...formData, procedureId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {(procedures as SurgicalProcedure[]).map((proc: SurgicalProcedure) => (
                      <SelectItem key={proc.id} value={proc.id.toString()}>
                        {proc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Regiões Anatômicas</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {(anatomicalRegions as AnatomicalRegion[]).map((region: AnatomicalRegion) => (
                    <div key={region.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`region-${region.id}`}
                        checked={formData.anatomicalRegionIds.includes(region.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              anatomicalRegionIds: [...formData.anatomicalRegionIds, region.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              anatomicalRegionIds: formData.anatomicalRegionIds.filter(id => id !== region.id),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`region-${region.id}`} className="text-sm">
                        {region.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="approach">Conduta Cirúrgica</Label>
                <Select
                  value={formData.approachId}
                  onValueChange={(value) => setFormData({ ...formData, approachId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conduta" />
                  </SelectTrigger>
                  <SelectContent>
                    {(approaches as SurgicalApproach[]).map((approach: SurgicalApproach) => (
                      <SelectItem key={approach.id} value={approach.id.toString()}>
                        {approach.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAssociation} disabled={createAssociationMutation.isPending}>
                {createAssociationMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Procedimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Procedimentos
            </CardTitle>
            <CardDescription>
              Selecione um procedimento para ver suas associações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar procedimentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProcedures.length > 0 ? (
                  filteredProcedures.map((procedure: SurgicalProcedure) => (
                    <div
                      key={procedure.id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedProcedure === procedure.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedProcedure(procedure.id)}
                    >
                      <div className="font-medium">{procedure.name}</div>
                      {procedure.description && (
                        <div className="text-sm text-muted-foreground">
                          {procedure.description}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground mb-4">
                      {searchTerm ? 
                        `Nenhum procedimento encontrado para "${searchTerm}"` : 
                        "Nenhum procedimento disponível"}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setIsCreateProcedureModalOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Procedimento
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes das Associações */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Associações Configuradas
            </CardTitle>
            <CardDescription>
              {selectedProcedureData
                ? `Associações para: ${selectedProcedureData.name}`
                : "Selecione um procedimento para ver suas associações"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedProcedure ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione um procedimento na lista ao lado para visualizar suas associações
              </div>
            ) : isLoadingAssociations ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando associações...
              </div>
            ) : (
              <div className="space-y-6">

                {/* Seção principal: Região Anatômica (1:1) */}
                <div className="border rounded-lg p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Região Anatômica</h3>
                  </div>
                  
                  {isLoadingProcedureRegion ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Carregando região...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label htmlFor="region-select">Selecionar Região Anatômica</Label>
                          <Select
                            value={procedureRegion?.id?.toString() || "none"}
                            onValueChange={(value) => {
                              if (selectedProcedure) {
                                const regionId = value === "none" ? null : parseInt(value);
                                setRegionMutation.mutate({
                                  procedureId: selectedProcedure,
                                  regionId
                                });
                              }
                            }}
                            disabled={setRegionMutation.isPending || !selectedProcedure}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Escolha uma região anatômica..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma região</SelectItem>
                              {(anatomicalRegions as AnatomicalRegion[]).map((region: AnatomicalRegion) => (
                                <SelectItem key={region.id} value={region.id.toString()}>
                                  {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Mostrar região selecionada */}
                      {procedureRegion && (
                        <div className="flex items-center space-x-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {procedureRegion.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-teal-900">{procedureRegion.name}</div>
                            {procedureRegion.description && (
                              <div className="text-sm text-teal-700">{procedureRegion.description}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Seção: Condutas Cirúrgicas */}
                <div className="border rounded-lg p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Condutas Cirúrgicas</h3>
                  </div>
                  
                  {isLoadingProcedureApproaches ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Carregando condutas...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Campo de busca para adicionar nova conduta */}
                      <div>
                        <Label htmlFor="approach-search">Buscar e Adicionar Condutas Cirúrgicas</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id="approach-search"
                            placeholder="Buscar condutas para adicionar..."
                            value={approachSearchTerm}
                            onChange={(e) => setApproachSearchTerm(e.target.value)}
                            disabled={!selectedProcedure}
                          />
                        </div>
                        {approachSearchTerm && (
                          <div className="mt-2 max-h-48 overflow-y-auto border rounded">
                            {filteredApproaches.length > 0 ? (
                              filteredApproaches.map((approach: SurgicalApproach) => (
                                <div
                                  key={approach.id}
                                  className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                                  onClick={() => {
                                    if (selectedProcedure) {
                                      addApproachMutation.mutate({
                                        procedureId: selectedProcedure,
                                        approachId: approach.id
                                      }, {
                                        onSuccess: () => {
                                          setApproachSearchTerm("");
                                        }
                                      });
                                    }
                                  }}
                                >
                                  <div className="font-medium">{approach.name}</div>
                                  {approach.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {approach.description}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center">
                                <div className="text-muted-foreground mb-2">
                                  Nenhuma conduta encontrada para "{approachSearchTerm}"
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setIsCreateApproachModalOpen(true)}
                                  disabled={addApproachMutation.isPending}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Criar Nova Conduta
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Mostrar condutas associadas */}
                      {procedureApproaches && procedureApproaches.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Condutas Associadas:</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {procedureApproaches.map((approach: any) => (
                              <div 
                                key={approach.id} 
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                  selectedApproach === approach.id
                                    ? "bg-teal-100 border-2 border-teal-500"
                                    : "bg-teal-50 border border-teal-200 hover:bg-teal-100"
                                }`}
                                onClick={() => setSelectedApproach(approach.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                      {approach.name.charAt(0)}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-teal-900">{approach.name}</div>
                                    {approach.description && (
                                      <div className="text-sm text-teal-700 line-clamp-1">
                                        {approach.description}
                                      </div>
                                    )}
                                    {selectedApproach === approach.id && (
                                      <div className="mt-1 text-xs text-teal-600 font-medium">
                                        ← Clique para configurar associações
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Evita selecionar a conduta ao clicar no X
                                      if (selectedProcedure) {
                                        removeApproachMutation.mutate({
                                          procedureId: selectedProcedure,
                                          approachId: approach.id
                                        });
                                      }
                                    }}
                                    disabled={removeApproachMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">Nenhuma conduta cirúrgica associada</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Detalhes da Conduta Selecionada */}
                {selectedApproach && (
                  <div className="border rounded-lg p-6 bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        Detalhes da Conduta: {procedureApproaches?.find((a: any) => a.id === selectedApproach)?.name}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCloneModalOpen(true)}
                          data-testid="button-clone-approach-associations"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Clonar Associações
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApproach(null)}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>


                    {isLoadingApproachDetails ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Carregando detalhes da conduta...
                      </div>
                    ) : approachDetails ? (
                      <div className="space-y-6">
                        {/* CID-10 */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">C</span>
                            Códigos CID-10 ({approachDetails.cidCodes?.length || 0})
                          </h4>
                          
                          {/* Campo para buscar e adicionar novo CID */}
                          <div className="mb-4">
                            <Label htmlFor="cid-search">Buscar e Adicionar CID-10</Label>
                            <div className="relative">
                              <Input
                                id="cid-search"
                                type="text"
                                placeholder="Digite o código ou descrição do CID-10 (ex: M75.1, manguito, rotador)..."
                                value={cidSearchTerm}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Aplicar formatação automática se parecer ser um código CID-10
                                  if (/^[A-Za-z][0-9]{3}$/.test(value.replace(/[^A-Za-z0-9]/g, ''))) {
                                    const formatted = formatCidCode(value);
                                    setCidSearchTerm(formatted);
                                  } else {
                                    setCidSearchTerm(value);
                                  }
                                }}
                                className="pr-10"
                              />
                              <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            </div>
                            
                            {/* Resultados da busca de CID */}
                            {cidLoading && (
                              <div className="mt-2 text-sm text-muted-foreground">Buscando...</div>
                            )}
                            
                            {cidSearchTerm.length >= 2 && !cidLoading && cidSearchResults.length > 0 && (
                              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                                {cidSearchResults
                                  .filter((cid: any) => 
                                    !approachDetails.cidCodes?.some((ac: any) => ac.id === cid.id)
                                  )
                                  .map((cid: any) => (
                                    <div
                                      key={cid.id}
                                      className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                      onClick={() => {
                                        if (selectedApproach && selectedProcedure) {
                                          addCidMutation.mutate({
                                            procedureId: selectedProcedure,
                                            approachId: selectedApproach,
                                            cidId: cid.id
                                          });
                                          setCidSearchTerm("");
                                          setCidSearchResults([]);
                                        }
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">{cid.code}</div>
                                        <div className="text-xs text-muted-foreground">{cid.description}</div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={addCidMutation.isPending}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                ))}
                              </div>
                            )}
                            
                            {cidSearchTerm.length >= 2 && !cidLoading && cidSearchResults.filter((cid: any) => 
                              !approachDetails.cidCodes?.some((ac: any) => ac.id === cid.id)
                            ).length === 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Nenhum CID-10 encontrado para "{cidSearchTerm}" que não esteja já associado.
                              </div>
                            )}
                          </div>

                          {approachDetails.cidCodes?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {approachDetails.cidCodes.map((cid: any, index: number) => (
                                <div key={`cid-detail-${cid.id}-${selectedApproach}-${selectedProcedure}-${index}`} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div>
                                    <div className="font-medium text-sm">{cid.code}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{cid.description}</div>
                                    {cid.isPrimary && (
                                      <div className="mt-1">
                                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                          Principal
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (selectedApproach && selectedProcedure) {
                                        removeCidMutation.mutate({
                                          procedureId: selectedProcedure,
                                          approachId: selectedApproach,
                                          cidId: cid.id
                                        });
                                      }
                                    }}
                                    disabled={removeCidMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum código CID-10 associado</p>
                          )}
                        </div>

                        {/* CBHPM */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">P</span>
                            Procedimentos CBHPM ({approachDetails.cbhpmProcedures?.length || 0})
                          </h4>
                          
                          {/* Campo para buscar e adicionar novo CBHPM */}
                          <div className="mb-4">
                            <Label htmlFor="cbhpm-search">Buscar e Adicionar CBHPM</Label>
                            <div className="relative">
                              <Input
                                id="cbhpm-search"
                                type="text"
                                placeholder="Digite o código ou nome do procedimento CBHPM (mín. 3 caracteres)..."
                                value={cbhpmSearchTerm}
                                onChange={(e) => setCbhpmSearchTerm(e.target.value)}
                                className="pr-10"
                              />
                              <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            </div>
                            
                            {/* Resultados da busca de CBHPM */}
                            {cbhpmLoading && (
                              <div className="mt-2 text-sm text-muted-foreground">Buscando...</div>
                            )}
                            
                            {cbhpmSearchTerm.length >= 3 && !cbhpmLoading && cbhpmSearchResults.length > 0 && (
                              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                                {cbhpmSearchResults
                                  .filter((cbhpm: any) => 
                                    !approachDetails.cbhpmProcedures?.some((ac: any) => ac.id === cbhpm.id)
                                  )
                                  .map((cbhpm: any) => (
                                    <div
                                      key={cbhpm.id}
                                      className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                      onClick={() => {
                                        if (selectedApproach && selectedProcedure) {
                                          addCbhpmMutation.mutate({
                                            procedureId: selectedProcedure,
                                            approachId: selectedApproach,
                                            cbhpmId: cbhpm.id
                                          });
                                          setCbhpmSearchTerm("");
                                          setCbhpmSearchResults([]);
                                        }
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">{cbhpm.code}</div>
                                        <div className="text-xs text-muted-foreground">{cbhpm.name}</div>
                                        {cbhpm.porte && (
                                          <div className="text-xs text-muted-foreground mt-1">Porte: {cbhpm.porte}</div>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={addCbhpmMutation.isPending}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                ))}
                              </div>
                            )}
                            
                            {cbhpmSearchTerm.length >= 3 && !cbhpmLoading && cbhpmSearchResults.filter((cbhpm: any) => 
                              !approachDetails.cbhpmProcedures?.some((ac: any) => ac.id === cbhpm.id)
                            ).length === 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Nenhum CBHPM encontrado para "{cbhpmSearchTerm}" que não esteja já associado.
                              </div>
                            )}
                          </div>

                          {approachDetails.cbhpmProcedures?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {approachDetails.cbhpmProcedures.map((proc: any, index: number) => (
                                <div key={`cbhpm-detail-${proc.id}-${selectedApproach}-${selectedProcedure}-${index}`} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                  <div>
                                    <div className="font-medium text-sm">{proc.code}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{proc.name}</div>
                                    <div className="flex gap-2 mt-2 items-center">
                                      {/* Campo sempre editável de quantidade CBHPM */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-purple-800">Qtd:</span>
                                        <Input
                                          type="number"
                                          min="1"
                                          className="w-16 h-6 text-xs"
                                          defaultValue={proc.quantity || 1}
                                          onBlur={(e) => {
                                            const newQuantity = parseInt(e.target.value) || 1;
                                            if (newQuantity !== (proc.quantity || 1) && selectedApproach && selectedProcedure) {
                                              updateCbhpmQuantityMutation.mutate({
                                                procedureId: selectedProcedure,
                                                approachId: selectedApproach,
                                                cbhpmId: proc.id,
                                                quantity: newQuantity
                                              });
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          disabled={updateCbhpmQuantityMutation.isPending}
                                        />
                                      </div>
                                      {proc.porte && (
                                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                          Porte: {proc.porte}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (selectedApproach && selectedProcedure) {
                                        removeCbhpmMutation.mutate({
                                          procedureId: selectedProcedure,
                                          approachId: selectedApproach,
                                          cbhpmId: proc.id
                                        });
                                      }
                                    }}
                                    disabled={removeCbhpmMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum procedimento CBHPM associado</p>
                          )}
                        </div>

                        {/* OPME */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">O</span>
                            Itens OPME ({approachDetails.opmeItems?.length || 0})
                          </h4>
                          
                          {/* Campo para buscar e adicionar novo OPME */}
                          <div className="mb-4">
                            <Label htmlFor="opme-search">Buscar e Adicionar OPME</Label>
                            <div className="relative">
                              <Input
                                id="opme-search"
                                type="text"
                                placeholder="Digite o nome técnico ou comercial do item OPME (mín. 3 caracteres)..."
                                value={opmeSearchTerm}
                                onChange={(e) => setOpmeSearchTerm(e.target.value)}
                                className="pr-10"
                              />
                              <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            </div>
                            
                            {/* Resultados da busca de OPME */}
                            {opmeLoading && (
                              <div className="mt-2 text-sm text-muted-foreground">Buscando...</div>
                            )}
                            
                            {opmeSearchTerm.length >= 3 && !opmeLoading && opmeSearchResults.length > 0 && (
                              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                                {opmeSearchResults
                                  .filter((opme: any) => 
                                    !approachDetails.opmeItems?.some((ao: any) => ao.id === opme.id)
                                  )
                                  .map((opme: any) => (
                                    <div
                                      key={opme.id}
                                      className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                      onClick={() => {
                                        if (selectedApproach && selectedProcedure) {
                                          addOpmeMutation.mutate({
                                            procedureId: selectedProcedure,
                                            approachId: selectedApproach,
                                            opmeId: opme.id
                                          });
                                          setOpmeSearchTerm("");
                                          setOpmeSearchResults([]);
                                        }
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">{opme.technicalName}</div>
                                        {opme.commercialName && (
                                          <div className="text-xs text-muted-foreground">{opme.commercialName}</div>
                                        )}
                                        {opme.riskClass && (
                                          <div className="text-xs text-muted-foreground mt-1">Classe: {opme.riskClass}</div>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={addOpmeMutation.isPending}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                ))}
                              </div>
                            )}
                            
                            {opmeSearchTerm.length >= 3 && !opmeLoading && opmeSearchResults.filter((opme: any) => 
                              !approachDetails.opmeItems?.some((ao: any) => ao.id === opme.id)
                            ).length === 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Nenhum item OPME encontrado para "{opmeSearchTerm}" que não esteja já associado.
                              </div>
                            )}
                          </div>

                          {approachDetails.opmeItems?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {approachDetails.opmeItems.map((opme: any, index: number) => (
                                <div key={`opme-detail-${opme.id}-${selectedApproach}-${selectedProcedure}-${index}`} className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{opme.technicalName}</div>
                                    {opme.commercialName && (
                                      <div className="text-xs text-muted-foreground mt-1">{opme.commercialName}</div>
                                    )}
                                    <div className="flex gap-2 mt-2 items-center flex-wrap">
                                      {/* Campo sempre editável de quantidade OPME */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-orange-800">Qtd:</span>
                                        <Input
                                          type="number"
                                          min="1"
                                          className="w-16 h-6 text-xs"
                                          defaultValue={opme.quantity || 1}
                                          onBlur={(e) => {
                                            const newQuantity = parseInt(e.target.value) || 1;
                                            if (newQuantity !== (opme.quantity || 1) && selectedApproach && selectedProcedure) {
                                              updateOpmeQuantityMutation.mutate({
                                                procedureId: selectedProcedure,
                                                approachId: selectedApproach,
                                                opmeId: opme.id,
                                                quantity: newQuantity
                                              });
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          disabled={updateOpmeQuantityMutation.isPending}
                                        />
                                      </div>

                                      {/* Campo editável de ordem de apresentação OPME */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-orange-800">Ordem:</span>
                                        <Input
                                          type="number"
                                          min="0"
                                          className="w-16 h-6 text-xs"
                                          defaultValue={opme.displayOrder || 0}
                                          onBlur={(e) => {
                                            const newDisplayOrder = parseInt(e.target.value) || 0;
                                            if (newDisplayOrder !== (opme.displayOrder || 0) && selectedApproach && selectedProcedure) {
                                              updateOpmeDisplayOrderMutation.mutate({
                                                procedureId: selectedProcedure,
                                                approachId: selectedApproach,
                                                opmeId: opme.id,
                                                displayOrder: newDisplayOrder
                                              });
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          disabled={updateOpmeDisplayOrderMutation.isPending}
                                        />
                                      </div>

                                      {opme.isRequired && (
                                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                          Obrigatório
                                        </span>
                                      )}
                                      {opme.riskClass && (
                                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                          Classe: {opme.riskClass}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (selectedApproach && selectedProcedure) {
                                        removeOpmeMutation.mutate({
                                          procedureId: selectedProcedure,
                                          approachId: selectedApproach,
                                          opmeId: opme.id
                                        });
                                      }
                                    }}
                                    disabled={removeOpmeMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum item OPME associado</p>
                          )}
                        </div>

                        {/* Fornecedores */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">F</span>
                            Fornecedores ({approachDetails.suppliers?.length || 0})
                          </h4>
                          
                          {/* Campo para buscar e adicionar novo Fornecedor */}
                          <div className="mb-4">
                            <Label htmlFor="supplier-search">Buscar e Adicionar Fornecedor</Label>
                            <div className="relative">
                              <Input
                                id="supplier-search"
                                type="text"
                                placeholder="Digite o nome ou CNPJ do fornecedor (mín. 2 caracteres)..."
                                value={supplierSearchTerm}
                                onChange={(e) => setSupplierSearchTerm(e.target.value)}
                                className="pr-10"
                              />
                              <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            </div>
                            
                            {/* Resultados da busca de Fornecedores */}
                            {supplierLoading && (
                              <div className="mt-2 text-sm text-muted-foreground">Buscando...</div>
                            )}
                            
                            {supplierSearchTerm.length >= 2 && !supplierLoading && supplierSearchResults.length > 0 && (
                              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                                {supplierSearchResults
                                  .filter((supplier: any) => 
                                    !approachDetails.suppliers?.some((as: any) => as.id === supplier.id)
                                  )
                                  .map((supplier: any) => (
                                    <div
                                      key={supplier.id}
                                      className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                      onClick={() => {
                                        if (selectedApproach && selectedProcedure) {
                                          addSupplierMutation.mutate({
                                            procedureId: selectedProcedure,
                                            approachId: selectedApproach,
                                            supplierId: supplier.id
                                          });
                                          setSupplierSearchTerm("");
                                          setSupplierSearchResults([]);
                                        }
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">{supplier.tradeName || supplier.companyName}</div>
                                        {supplier.tradeName && supplier.companyName && supplier.tradeName !== supplier.companyName && (
                                          <div className="text-xs text-muted-foreground">{supplier.companyName}</div>
                                        )}
                                        {supplier.cnpj && (
                                          <div className="text-xs text-muted-foreground">CNPJ: {supplier.cnpj}</div>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={addSupplierMutation.isPending}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                ))}
                              </div>
                            )}
                            
                            {supplierSearchTerm.length >= 2 && !supplierLoading && supplierSearchResults.filter((supplier: any) => 
                              !approachDetails.suppliers?.some((as: any) => as.id === supplier.id)
                            ).length === 0 && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Nenhum fornecedor encontrado para "{supplierSearchTerm}" que não esteja já associado.
                              </div>
                            )}
                          </div>

                          {approachDetails.suppliers?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {approachDetails.suppliers.map((supplier: any, index: number) => (
                                <div key={`supplier-detail-${supplier.id}-${selectedApproach}-${selectedProcedure}-${index}`} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{supplier.companyName}</div>
                                    {supplier.tradeName && supplier.tradeName !== supplier.companyName && (
                                      <div className="text-xs text-muted-foreground mt-1">Nome fantasia: {supplier.tradeName}</div>
                                    )}
                                    {supplier.cnpj && (
                                      <div className="text-xs text-muted-foreground mt-1">CNPJ: {supplier.cnpj}</div>
                                    )}

                                    {/* Campo editável para prioridade */}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Label htmlFor={`priority-${supplier.id}`} className="text-xs text-muted-foreground">
                                        Prioridade:
                                      </Label>
                                      <Input
                                        id={`priority-${supplier.id}`}
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-16 h-6 text-xs"
                                        defaultValue={supplier.priority || 1}
                                        onBlur={(e) => {
                                          const newPriority = parseInt(e.target.value) || 1;
                                          if (newPriority !== (supplier.priority || 1) && selectedApproach && selectedProcedure) {
                                            updateSupplierPriorityMutation.mutate({
                                              procedureId: selectedProcedure,
                                              approachId: selectedApproach,
                                              supplierId: supplier.id,
                                              priority: newPriority
                                            });
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={updateSupplierPriorityMutation.isPending}
                                      />
                                    </div>

                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      {supplier.isPreferred && (
                                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                          Preferencial
                                        </span>
                                      )}
                                      {supplier.anvisaCode && (
                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                          ANVISA: {supplier.anvisaCode}
                                        </span>
                                      )}
                                      {!supplier.active && (
                                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                          Inativo
                                        </span>
                                      )}
                                    </div>
                                    {(supplier.phone || supplier.email) && (
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        {supplier.phone && <div>📞 {supplier.phone}</div>}
                                        {supplier.email && <div>✉️ {supplier.email}</div>}
                                      </div>
                                    )}
                                    {supplier.notes && (
                                      <div className="mt-2 text-xs text-muted-foreground border-t border-blue-200 pt-2">
                                        <strong>Observações:</strong> {supplier.notes}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (selectedApproach && selectedProcedure) {
                                        removeSupplierMutation.mutate({
                                          procedureId: selectedProcedure,
                                          approachId: selectedApproach,
                                          supplierId: supplier.id
                                        });
                                      }
                                    }}
                                    disabled={removeSupplierMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum fornecedor associado</p>
                          )}
                        </div>

                        {/* Justificativa Clínica */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs">J</span>
                            Justificativa Clínica
                          </h4>

                          {/* Campo único para justificativa */}
                          <div className="mb-4">
                            <div className="space-y-2">
                              <RichTextEditor
                                value={(() => {
                                  const existingJustification = approachDetails.clinicalJustifications?.[0];
                                  return editingJustification === existingJustification?.id 
                                    ? justificationContent 
                                    : existingJustification?.content || newJustificationContent;
                                })()}
                                onChange={(value) => {
                                  const existingJustification = approachDetails.clinicalJustifications?.[0];
                                  if (existingJustification) {
                                    if (editingJustification !== existingJustification.id) {
                                      setEditingJustification(existingJustification.id);
                                      setJustificationContent(existingJustification.content);
                                    }
                                    setJustificationContent(value);
                                  } else {
                                    setNewJustificationContent(value);
                                  }
                                }}
                                placeholder="Digite a justificativa clínica para esta combinação procedimento + conduta..."
                                minHeight="min-h-[150px]"
                                className="border-teal-200"
                              />
                              <div className="flex gap-2">
                                {(() => {
                                  const existingJustification = approachDetails.clinicalJustifications?.[0];
                                  
                                  if (existingJustification && editingJustification === existingJustification.id) {
                                    // Modo de edição
                                    return (
                                      <>
                                        <Button
                                          onClick={() => {
                                            if (justificationContent.trim()) {
                                              updateJustificationMutation.mutate({
                                                justificationId: existingJustification.id,
                                                content: justificationContent.trim()
                                              });
                                            }
                                          }}
                                          disabled={updateJustificationMutation.isPending || !justificationContent.trim()}
                                          size="sm"
                                          className="bg-teal-600 hover:bg-teal-700"
                                        >
                                          {updateJustificationMutation.isPending ? "Salvando..." : "Salvar"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setEditingJustification(null);
                                            setJustificationContent("");
                                          }}
                                          size="sm"
                                        >
                                          Cancelar
                                        </Button>
                                      </>
                                    );
                                  } else if (existingJustification) {
                                    // Justificativa existente - modo visualização
                                    return (
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setEditingJustification(existingJustification.id);
                                          setJustificationContent(existingJustification.content);
                                        }}
                                        size="sm"
                                      >
                                        Editar
                                      </Button>
                                    );
                                  } else {
                                    // Nova justificativa
                                    return (
                                      <Button
                                        onClick={() => {
                                          if (newJustificationContent.trim()) {
                                            createJustificationMutation.mutate({
                                              content: newJustificationContent.trim()
                                            });
                                          }
                                        }}
                                        disabled={createJustificationMutation.isPending || !newJustificationContent.trim()}
                                        size="sm"
                                        className="bg-teal-600 hover:bg-teal-700"
                                      >
                                        {createJustificationMutation.isPending ? "Salvando..." : "Salvar Justificativa"}
                                      </Button>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Erro ao carregar detalhes da conduta</p>
                    )}
                  </div>
                )}

                {/* Informação sobre próximos passos */}
                {!selectedApproach && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Como usar:</h4>
                    <p className="text-blue-800 text-sm">
                      1. Selecione um procedimento cirúrgico na lista à esquerda
                    </p>
                    <p className="text-blue-800 text-sm">
                      2. Veja as regiões anatômicas e condutas associadas
                    </p>
                    <p className="text-blue-800 text-sm">
                      3. Clique em uma conduta para ver os detalhes (CID-10, CBHPM, OPME, Fornecedores, Justificativas Clínicas)
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para criar novo procedimento */}
      <CreateProcedureModal
        isOpen={isCreateProcedureModalOpen}
        onOpenChange={setIsCreateProcedureModalOpen}
        onSuccess={(createdProcedure) => {
          // Invalidar query para atualizar a lista
          queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-procedures"] });
          
          // Selecionar automaticamente o procedimento recém criado
          setSelectedProcedure(createdProcedure.id);
          
          // Limpar termo de busca para mostrar o novo procedimento
          setSearchTerm("");
        }}
      />

      {/* Modal para criar nova conduta */}
      <CreateApproachModal
        isOpen={isCreateApproachModalOpen}
        onOpenChange={setIsCreateApproachModalOpen}
        onSuccess={(createdApproach) => {
          // Invalidar query para atualizar a lista
          queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-approaches"] });
          
          // Se há um procedimento selecionado, associar automaticamente a nova conduta
          if (selectedProcedure && createdApproach) {
            addApproachMutation.mutate({
              procedureId: selectedProcedure,
              approachId: createdApproach.id
            }, {
              onSuccess: () => {
                // Limpar termo de busca para mostrar a nova conduta associada
                setApproachSearchTerm("");
              }
            });
          }
        }}
      />

      {/* Modal para clonar associações */}
      <CloneAssociationsModal
        isOpen={isCloneModalOpen}
        onOpenChange={setIsCloneModalOpen}
        sourceProcedureId={selectedProcedure}
        sourceApproachId={selectedApproach}
        approaches={procedureApproaches || []}
        onSuccess={() => {
          // Atualizar as queries após clonagem bem-sucedida
          queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-associations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-approaches"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-regions"] });
        }}
      />

    </div>
  );
}