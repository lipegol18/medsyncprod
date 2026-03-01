import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Check, 
  Building2, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Scissors,
  X
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Supplier {
  id: number;
  name: string;
  companyName: string;
  cnpj: string;
  isActive: boolean;
}

interface OrderSupplier {
  id: number;
  orderId: number;
  supplierId: number;
  supplier: Supplier;
  isApproved: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
  surgicalProcedureId: number | null;
  surgicalApproachId: number | null;
  surgicalProcedureName: string | null;
  surgicalApproachName: string | null;
}

interface SupplierGroup {
  key: string;
  procedureName: string | null;
  approachName: string | null;
  suppliers: OrderSupplier[];
}

interface SupplierApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onApprovalComplete: () => void;
}

export function SupplierApprovalModal({
  isOpen,
  onClose,
  orderId,
  onApprovalComplete
}: SupplierApprovalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  // Buscar fornecedores do pedido
  const { data: orderSuppliers = [], isLoading, error } = useQuery({
    queryKey: ['/api/medical-orders', orderId, 'suppliers'],
    enabled: isOpen && !!orderId,
    queryFn: async () => {
      const response = await apiRequest(`/api/medical-orders/${orderId}/suppliers`, 'GET');
      return response;
    }
  });

  // Agrupar fornecedores por procedimento + conduta (usando IDs para chave única)
  const supplierGroups: SupplierGroup[] = useMemo(() => {
    if (!orderSuppliers || orderSuppliers.length === 0) return [];

    const groups = new Map<string, SupplierGroup>();
    
    orderSuppliers.forEach((os: OrderSupplier) => {
      // Chave única baseada em IDs - cada ID é tratado independentemente
      // Se um ID é null, usamos o nome correspondente como fallback para aquele componente
      const procKey = os.surgicalProcedureId !== null 
        ? `pid:${os.surgicalProcedureId}` 
        : `pname:${os.surgicalProcedureName ?? 'none'}`;
      const approachKey = os.surgicalApproachId !== null 
        ? `aid:${os.surgicalApproachId}` 
        : `aname:${os.surgicalApproachName ?? 'none'}`;
      const key = `${procKey}__${approachKey}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          procedureName: os.surgicalProcedureName,
          approachName: os.surgicalApproachName,
          suppliers: []
        });
      }
      groups.get(key)!.suppliers.push(os);
    });

    // Ordenar grupos: primeiro os que têm procedimento+conduta, depois os sem
    return Array.from(groups.values()).sort((a, b) => {
      if (a.procedureName && !b.procedureName) return -1;
      if (!a.procedureName && b.procedureName) return 1;
      if (a.procedureName && b.procedureName) {
        return a.procedureName.localeCompare(b.procedureName);
      }
      return 0;
    });
  }, [orderSuppliers]);

  // Buscar todos os fornecedores disponíveis (para adicionar novo)
  const { data: allSuppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['/api/suppliers', 'search', supplierSearchTerm],
    enabled: showAddSupplier && supplierSearchTerm.length >= 2,
    queryFn: async () => {
      const response = await apiRequest(`/api/suppliers/search?q=${encodeURIComponent(supplierSearchTerm)}`, 'GET');
      return response;
    }
  });

  // Mutação para aprovar múltiplos fornecedores
  const approveMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      // Aprovar múltiplos fornecedores
      await apiRequest(`/api/medical-orders/${orderId}/suppliers/approve-multiple`, 'POST', { supplierIds });
    },
    onSuccess: (_, supplierIds) => {
      const count = supplierIds.length;
      toast({
        title: count === 1 ? 'Fornecedor Aprovado' : 'Fornecedores Aprovados',
        description: count === 1 
          ? 'O fornecedor foi aprovado com sucesso.'
          : `${count} fornecedores foram aprovados com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      onApprovalComplete();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aprovar fornecedores',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  // Mutação para adicionar novo fornecedor ao pedido
  const addSupplierMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      // Adicionar fornecedor (não aprovado automaticamente)
      await apiRequest(`/api/medical-orders/${orderId}/suppliers`, 'POST', { supplierId });
      return supplierId;
    },
    onSuccess: (supplierId) => {
      toast({
        title: 'Fornecedor Adicionado',
        description: 'O fornecedor foi adicionado. Selecione-o para aprovação.',
      });
      // Adicionar o novo fornecedor à lista de selecionados
      setSelectedSupplierIds(prev => [...prev, supplierId]);
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'suppliers'] });
      setShowAddSupplier(false);
      setSupplierSearchTerm('');
      // NÃO fechar o modal - permitir que o usuário continue selecionando
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar fornecedor',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const handleSupplierSelect = (supplierId: number) => {
    setSelectedSupplierIds(prev => {
      if (prev.includes(supplierId)) {
        // Remove se já está selecionado
        return prev.filter(id => id !== supplierId);
      } else {
        // Adiciona se não está selecionado
        return [...prev, supplierId];
      }
    });
  };

  const handleConfirmApproval = () => {
    if (selectedSupplierIds.length > 0) {
      approveMutation.mutate(selectedSupplierIds);
    }
  };

  const handleAddNewSupplier = (supplierId: number) => {
    addSupplierMutation.mutate(supplierId);
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitializedSelection(false);
      setSelectedSupplierIds([]);
      setShowAddSupplier(false);
      setSupplierSearchTerm('');
    }
  }, [isOpen]);

  // Pre-select already approved suppliers ONLY on first load
  useEffect(() => {
    if (isOpen && orderSuppliers.length > 0 && !hasInitializedSelection) {
      const approvedIds = orderSuppliers
        .filter((os: OrderSupplier) => os.isApproved)
        .map((os: OrderSupplier) => os.supplier.id);
      setSelectedSupplierIds(approvedIds);
      setHasInitializedSelection(true);
    }
  }, [isOpen, orderSuppliers, hasInitializedSelection]);

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card border-destructive/50 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">Erro ao Carregar Fornecedores</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Não foi possível carregar os fornecedores para este pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-6">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-green-500 dark:border-green-800/50 text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-600 dark:text-green-400 flex items-center gap-2 text-xl">
            <CheckCircle className="h-6 w-6" />
            Pedido Aprovado - Selecionar Fornecedores
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Pedido foi aprovado integralmente pela operadora.
            <br />
            Selecione os fornecedores que foram aprovados para este pedido (você pode selecionar mais de um):
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-400" />
            <span className="ml-3 text-muted-foreground">Carregando fornecedores...</span>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {orderSuppliers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
                <p className="text-lg text-foreground mb-2">Nenhum Fornecedor Encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Este pedido não possui fornecedores associados.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {supplierGroups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      {/* Cabeçalho do grupo */}
                      <div className="flex items-center gap-2 pb-1.5 border-b border-accent/30">
                        <Scissors className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-accent text-sm">
                          {group.procedureName || 'Sem Procedimento'}
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          {group.approachName || 'Sem Conduta'}
                        </span>
                        <Badge variant="outline" className="ml-auto border-accent/50 text-accent text-xs shrink-0">
                          {group.suppliers.length} fornecedor{group.suppliers.length > 1 ? 'es' : ''}
                        </Badge>
                      </div>

                      {/* Cards compactos de fornecedores */}
                      <div className="flex flex-col gap-1.5 pl-3">
                        {group.suppliers.map((orderSupplier: OrderSupplier) => {
                          const supplier = orderSupplier.supplier;
                          const isSelected = selectedSupplierIds.includes(supplier.id);
                          const isAlreadyApproved = orderSupplier.isApproved;

                          return (
                            <div
                              key={orderSupplier.id}
                              onClick={() => handleSupplierSelect(supplier.id)}
                              data-testid={`supplier-card-${orderSupplier.id}`}
                              className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150
                                ${isSelected
                                  ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
                                  : 'border-border bg-card hover:bg-muted/30'}
                              `}
                            >
                              {/* Checkbox */}
                              <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
                                ${isSelected ? 'border-green-500 bg-green-500' : 'border-muted-foreground'}`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>

                              {/* Ícone + nome + CNPJ */}
                              <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">{supplier.name}</span>
                                <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">CNPJ: {supplier.cnpj}</span>
                              </div>

                              {/* Badge de estado */}
                              {isSelected ? (
                                <Badge variant="outline" className="shrink-0 border-green-500 text-green-600 dark:text-green-400 text-xs">
                                  Selecionado
                                </Badge>
                              ) : isAlreadyApproved ? (
                                <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-600 dark:text-amber-400 text-xs">
                                  Aprovado antes
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="shrink-0 border-border text-muted-foreground text-xs">
                                  Disponível
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão para adicionar novo fornecedor */}
                {!showAddSupplier && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(true)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-medsync-blue hover:bg-medsync-blue-dark text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Outro Fornecedor
                    </button>
                    <p className="text-xs text-muted-foreground mt-1.5 text-center">
                      Use esta opção se a operadora aprovou um fornecedor que não estava na lista original
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Seção para adicionar novo fornecedor */}
            {showAddSupplier && (
              <div className="mt-3 p-3 bg-muted/40 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground">Adicionar Fornecedor</span>
                  <button
                    type="button"
                    onClick={() => { setShowAddSupplier(false); setSupplierSearchTerm(''); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou CNPJ do fornecedor..."
                    value={supplierSearchTerm}
                    onChange={(e) => setSupplierSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {supplierSearchTerm.length >= 2 && (
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {isLoadingSuppliers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
                      </div>
                    ) : allSuppliers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Nenhum fornecedor encontrado para "{supplierSearchTerm}"
                      </p>
                    ) : (
                      allSuppliers
                        .filter((supplier: Supplier) =>
                          !orderSuppliers.some((os: OrderSupplier) => os.supplier.id === supplier.id)
                        )
                        .map((supplier: Supplier) => (
                          <div
                            key={supplier.id}
                            onClick={() => handleAddNewSupplier(supplier.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {supplier.name || supplier.companyName}
                              </span>
                              <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
                                CNPJ: {supplier.cnpj}
                              </span>
                            </div>
                            <Badge variant="outline" className="shrink-0 border-medsync-blue text-medsync-blue text-xs">
                              Adicionar
                            </Badge>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {supplierSearchTerm.length > 0 && supplierSearchTerm.length < 2 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite pelo menos 2 caracteres para buscar
                  </p>
                )}
              </div>
            )}

            {/* Informações adicionais */}
            <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-accent">Atenção: </span>
                Selecione o fornecedor aprovado pela operadora. A seleção pode ser alterada antes de confirmar e será registrada para controle e auditoria.
              </p>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        {!showAddSupplier && (
          <div className="flex justify-between items-center gap-3 pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {selectedSupplierIds.length === 0 
                ? 'Nenhum fornecedor selecionado'
                : selectedSupplierIds.length === 1
                ? '1 fornecedor selecionado'
                : `${selectedSupplierIds.length} fornecedores selecionados`
              }
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={approveMutation.isPending || addSupplierMutation.isPending}
                className="border-border text-muted-foreground hover:bg-muted/50"
                data-testid="button-cancel-approval"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmApproval}
                disabled={selectedSupplierIds.length === 0 || approveMutation.isPending || addSupplierMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                data-testid="button-confirm-approval"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedSupplierIds.length <= 1 
                      ? 'Confirmar Aprovação' 
                      : `Aprovar ${selectedSupplierIds.length} Fornecedores`
                    }
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Loading state para adicionar fornecedor */}
        {addSupplierMutation.isPending && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-400" />
            <span className="ml-3 text-amber-700 dark:text-amber-300">Adicionando fornecedor...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}