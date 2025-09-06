import { useState, useEffect } from 'react';
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
  Search
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
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');

  // Buscar fornecedores do pedido
  const { data: orderSuppliers = [], isLoading, error } = useQuery({
    queryKey: ['/api/medical-orders', orderId, 'suppliers'],
    enabled: isOpen && !!orderId,
    queryFn: async () => {
      const response = await apiRequest(`/api/medical-orders/${orderId}/suppliers`, 'GET');
      return response;
    }
  });

  // Buscar todos os fornecedores disponíveis (para adicionar novo)
  const { data: allSuppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['/api/suppliers', 'search', supplierSearchTerm],
    enabled: showAddSupplier && supplierSearchTerm.length >= 2,
    queryFn: async () => {
      const response = await apiRequest(`/api/suppliers/search?q=${encodeURIComponent(supplierSearchTerm)}`, 'GET');
      return response;
    }
  });

  // Mutação para aprovar fornecedor
  const approveMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      return apiRequest(`/api/medical-orders/${orderId}/suppliers/${supplierId}/approve`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: 'Fornecedor Aprovado',
        description: 'O fornecedor foi marcado como aprovado pela operadora.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'suppliers'] });
      onApprovalComplete();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aprovar fornecedor',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  // Mutação para adicionar novo fornecedor ao pedido
  const addSupplierMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      return apiRequest(`/api/medical-orders/${orderId}/suppliers`, 'POST', { supplierId });
    },
    onSuccess: () => {
      toast({
        title: 'Fornecedor Adicionado',
        description: 'O fornecedor foi adicionado ao pedido e marcado como aprovado.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'suppliers'] });
      setShowAddSupplier(false);
      setSupplierSearchTerm('');
      onApprovalComplete();
      onClose();
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
    setSelectedSupplierId(supplierId);
  };

  const handleConfirmApproval = () => {
    if (selectedSupplierId) {
      approveMutation.mutate(selectedSupplierId);
    }
  };

  const handleAddNewSupplier = (supplierId: number) => {
    addSupplierMutation.mutate(supplierId);
  };

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSupplierId(null);
      setShowAddSupplier(false);
      setSupplierSearchTerm('');
    }
  }, [isOpen]);

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
            Pedido Aprovado - Selecionar Fornecedor
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Pedido médico #{orderId} foi aprovado pela operadora.
            <br />
            Selecione qual dos fornecedores foi aprovado para este pedido:
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
                <div className="grid gap-4">
                  {orderSuppliers.map((orderSupplier: OrderSupplier) => {
                    const supplier = orderSupplier.supplier;
                    const isSelected = selectedSupplierId === supplier.id;
                    const isAlreadyApproved = orderSupplier.isApproved;

                    return (
                      <Card 
                        key={supplier.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-green-500 bg-green-100/20 dark:bg-green-900/20 shadow-lg' 
                            : isAlreadyApproved
                            ? 'border-green-400 dark:border-green-700 bg-green-50/20 dark:bg-green-900/10'
                            : 'border-border bg-muted/50 hover:bg-muted/80'
                        }`}
                        onClick={() => handleSupplierSelect(supplier.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Ícone de seleção */}
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                                isSelected || isAlreadyApproved
                                  ? 'border-green-500 bg-green-500' 
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
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={approveMutation.isPending || addSupplierMutation.isPending}
              className="border-border text-muted-foreground hover:bg-muted/50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={!selectedSupplierId || approveMutation.isPending || addSupplierMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Aprovação
                </>
              )}
            </Button>
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