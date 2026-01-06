import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
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
  Scissors
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
            Pedido médico #{orderId} foi aprovado pela operadora.
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
                <div className="space-y-6">
                  {supplierGroups.map((group) => (
                    <div key={group.key} className="space-y-3">
                      {/* Cabeçalho do grupo: Procedimento → Conduta */}
                      <div className="flex items-center gap-2 pb-2 border-b border-accent/30">
                        <Scissors className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold text-accent text-base">
                          {group.procedureName || 'Sem Procedimento'} 
                          <span className="mx-2 text-muted-foreground">→</span> 
                          {group.approachName || 'Sem Conduta'}
                        </h3>
                        <Badge variant="outline" className="ml-auto border-accent/50 text-accent text-xs">
                          {group.suppliers.length} fornecedor{group.suppliers.length > 1 ? 'es' : ''}
                        </Badge>
                      </div>

                      {/* Lista de fornecedores do grupo */}
                      <div className="grid gap-3 pl-4">
                        {group.suppliers.map((orderSupplier: OrderSupplier) => {
                          const supplier = orderSupplier.supplier;
                          const isSelected = selectedSupplierIds.includes(supplier.id);
                          const isAlreadyApproved = orderSupplier.isApproved;

                          return (
                            <Card 
                              key={orderSupplier.id}
                              className={`cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-green-500 bg-green-100/20 dark:bg-green-900/20 shadow-lg' 
                                  : isAlreadyApproved
                                  ? 'border-green-400 dark:border-green-700 bg-green-50/20 dark:bg-green-900/10'
                                  : 'border-border bg-muted/50 hover:bg-muted/80'
                              }`}
                              onClick={() => handleSupplierSelect(supplier.id)}
                              data-testid={`supplier-card-${orderSupplier.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-4 flex-1">
                                    {/* Checkbox de seleção múltipla */}
                                    <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mt-1 ${
                                      isSelected 
                                        ? 'border-green-500 bg-green-500' 
                                        : isAlreadyApproved
                                        ? 'border-green-400 bg-green-400'
                                        : 'border-muted-foreground'
                                    }`}>
                                      {(isSelected || isAlreadyApproved) && (
                                        <Check className="h-4 w-4 text-white" />
                                      )}
                                    </div>

                                    {/* Informações do fornecedor */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3">
                                        <Building2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        <div>
                                          <h3 className="font-semibold text-foreground text-lg">{supplier.name}</h3>
                                          <p className="text-sm text-muted-foreground">CNPJ: {supplier.cnpj}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Badge de status */}
                                  <div className="flex-shrink-0 ml-4">
                                    {isSelected ? (
                                      <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                                        Selecionado
                                      </Badge>
                                    ) : isAlreadyApproved ? (
                                      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                                        Aprovado Anteriormente
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-border text-muted-foreground">
                                        Disponível
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão para adicionar novo fornecedor */}
                {!showAddSupplier && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddSupplier(true)}
                      className="w-full border-accent text-accent hover:bg-accent/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Outro Fornecedor
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Use esta opção se a operadora aprovou um fornecedor que não estava na lista original
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Seção para adicionar novo fornecedor */}
            {showAddSupplier && (
              <div className="mt-6 p-4 bg-amber-50/20 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">Adicionar Novo Fornecedor</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddSupplier(false);
                      setSupplierSearchTerm('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite o nome ou CNPJ do fornecedor..."
                      value={supplierSearchTerm}
                      onChange={(e) => setSupplierSearchTerm(e.target.value)}
                      className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {supplierSearchTerm.length >= 2 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {isLoadingSuppliers ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-amber-600 dark:text-amber-400" />
                          <span className="ml-2 text-muted-foreground">Buscando fornecedores...</span>
                        </div>
                      ) : allSuppliers.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum fornecedor encontrado para "{supplierSearchTerm}"
                        </p>
                      ) : (
                        allSuppliers
                          .filter((supplier: Supplier) => 
                            !orderSuppliers.some((os: OrderSupplier) => os.supplier.id === supplier.id)
                          )
                          .map((supplier: Supplier) => (
                            <Card
                              key={supplier.id}
                              className="cursor-pointer transition-all duration-200 border-amber-300 dark:border-amber-800/50 bg-amber-50/10 dark:bg-amber-900/10 hover:bg-amber-100/20 dark:hover:bg-amber-900/20"
                              onClick={() => handleAddNewSupplier(supplier.id)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <div>
                                      <h4 className="font-medium text-foreground">
                                        {supplier.name || supplier.companyName}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        {supplier.companyName && supplier.name !== supplier.companyName && (
                                          <span>{supplier.companyName} • </span>
                                        )}
                                        CNPJ: {supplier.cnpj}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                                    Adicionar
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      )}
                    </div>
                  )}

                  {supplierSearchTerm.length < 2 && supplierSearchTerm.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Digite pelo menos 2 caracteres para buscar
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Informações adicionais */}
            <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-accent font-medium mb-1">Informação Importante:</p>
                  <p className="text-muted-foreground">
                    Selecione o fornecedor que foi oficialmente aprovado pela operadora de saúde. 
                    Você pode alterar sua seleção a qualquer momento antes de confirmar.
                    Esta informação será registrada no sistema para controle e auditoria.
                  </p>
                </div>
              </div>
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