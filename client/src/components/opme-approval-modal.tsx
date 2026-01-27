import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Package, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OpmeItemApproval {
  id: number;
  technicalName: string;
  commercialName: string;
  quantityRequested: number;
  status: 'aprovado' | 'negado' | null;
  quantityApproved: number;
}

interface OpmeApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onApprovalComplete: (approvedCount: number, deniedCount: number, deniedItems?: Array<{name: string, quantity: number}>) => void;
}

export function OpmeApprovalModal({ 
  isOpen, 
  onClose, 
  orderId, 
  onApprovalComplete
}: OpmeApprovalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [opmeApprovals, setOpmeApprovals] = useState<OpmeItemApproval[]>([]);

  const { data: opmeItems, isLoading } = useQuery({
    queryKey: ['/api/medical-orders', orderId, 'opme-items'],
    queryFn: () => apiRequest(`/api/medical-orders/${orderId}/opme-items`, 'GET'),
    enabled: isOpen && !!orderId,
  });

  useEffect(() => {
    if (opmeItems && opmeItems.length > 0) {
      const initialApprovals: OpmeItemApproval[] = opmeItems.map((item: any) => ({
        id: item.id,
        technicalName: item.opmeItem?.technicalName || 'Item OPME',
        commercialName: item.opmeItem?.commercialName || '',
        quantityRequested: item.quantity,
        status: item.status === 'em_analise' ? null : (item.status as 'aprovado' | 'negado'),
        quantityApproved: item.quantityApproved ?? item.quantity,
      }));
      setOpmeApprovals(initialApprovals);
    }
  }, [opmeItems]);

  const saveApprovalsMutation = useMutation({
    mutationFn: async (approvals: OpmeItemApproval[]) => {
      const updates = approvals.map(approval => ({
        id: approval.id,
        status: approval.status,
        quantityApproved: approval.status === 'aprovado' ? approval.quantityApproved : 0
      }));

      const promises = updates.map(update => 
        apiRequest(`/api/medical-order-opme-items/${update.id}/approval`, 'PUT', {
          status: update.status,
          quantityApproved: update.quantityApproved
        })
      );

      await Promise.all(promises);
      return updates;
    },
    onSuccess: () => {
      toast({
        title: "Aprovações OPME salvas",
        description: "As aprovações dos itens OPME foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'opme-items'] });
      
      const approvedCount = opmeApprovals.filter(item => item.status === 'aprovado').length;
      const deniedCount = opmeApprovals.filter(item => item.status === 'negado').length;
      
      // Coletar itens negados com seus nomes para o histórico
      const deniedItems = opmeApprovals
        .filter(item => item.status === 'negado')
        .map(item => ({
          name: item.technicalName || item.commercialName || 'Item OPME',
          quantity: item.quantityRequested
        }));
      
      onApprovalComplete(approvedCount, deniedCount, deniedItems);
    },
    onError: (error) => {
      console.error('Erro ao salvar aprovações OPME:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar as aprovações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (itemId: number, newStatus: 'aprovado' | 'negado') => {
    setOpmeApprovals(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: newStatus,
              quantityApproved: newStatus === 'aprovado' 
                ? Math.max(1, item.quantityApproved) 
                : 0
            }
          : item
      )
    );
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setOpmeApprovals(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              quantityApproved: item.status === 'aprovado' 
                ? Math.max(1, Math.min(quantity, item.quantityRequested))
                : Math.max(0, Math.min(quantity, item.quantityRequested))
            }
          : item
      )
    );
  };

  const handleSave = () => {
    const allItemsHaveStatus = opmeApprovals.every(item => item.status !== null);
    
    if (!allItemsHaveStatus) {
      toast({
        title: "Aprovação incompleta",
        description: "Por favor, defina o status (aprovado ou negado) para todos os itens OPME.",
        variant: "destructive",
      });
      return;
    }

    const approvedWithZeroQuantity = opmeApprovals.find(
      item => item.status === 'aprovado' && item.quantityApproved <= 0
    );

    if (approvedWithZeroQuantity) {
      toast({
        title: "Quantidade inválida",
        description: "Itens aprovados devem ter pelo menos 1 unidade.",
        variant: "destructive",
      });
      return;
    }
    
    saveApprovalsMutation.mutate(opmeApprovals);
  };

  const canSave = opmeApprovals.every(item => item.status !== null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'negado':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const hasOpmeItems = opmeItems && opmeItems.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-2 sm:p-4">
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Package className="h-5 w-5 text-medsync-blue" />
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Aprovação de Itens OPME
              </h3>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Indique quais materiais OPME foram autorizados pela operadora.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Botão para marcar todos como aprovados */}
        {!isLoading && hasOpmeItems && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => {
                setOpmeApprovals(prev => prev.map(item => ({
                  ...item,
                  status: 'aprovado',
                  quantityApproved: item.quantityRequested
                })));
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Marcar todos como Aprovado
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-muted-foreground">Carregando itens OPME...</div>
          </div>
        ) : !hasOpmeItems ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Este pedido não possui itens OPME para aprovar.
            </p>
            <button
              onClick={onClose}
              className="mt-4 btn-medsync-light"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {opmeApprovals.map((item) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-3 sm:p-4 bg-muted/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
                  {/* Informações do Item */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                        <span className="text-xs sm:text-sm font-bold text-accent">
                          OPME
                        </span>
                      </div>
                      {/* Status Visual - Mobile inline */}
                      <div className="sm:hidden ml-auto">
                        {item.status && (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            <span className={`text-xs font-medium ${
                              item.status === 'aprovado' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                            }`}>
                              {item.status === 'aprovado' 
                                ? `${item.quantityApproved}/${item.quantityRequested}` 
                                : 'Negado'}
                            </span>
                          </div>
                        )}
                        {!item.status && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-medium text-foreground text-sm sm:text-base mb-1 sm:mb-2 line-clamp-2">
                      {item.technicalName}
                    </h4>
                    {item.commercialName && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.commercialName}
                      </p>
                    )}
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Qtd. solicitada: <span className="font-medium">{item.quantityRequested}</span>
                    </div>
                  </div>

                  {/* Controles de Aprovação */}
                  <div className="flex flex-col gap-3 sm:gap-4 sm:min-w-[280px]">
                    {/* Botões de Status */}
                    <div>
                      <Label className="text-xs sm:text-sm text-foreground mb-1.5 sm:mb-2 block">Status</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'aprovado')}
                          className={`
                            px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2
                            ${item.status === 'aprovado'
                              ? "bg-emerald-600 border-emerald-500 text-destructive-foreground shadow-lg"
                              : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:border-border"
                            }
                          `}
                        >
                          Aprovado
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'negado')}
                          className={`
                            px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2
                            ${item.status === 'negado'
                              ? "bg-destructive border-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                              : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:border-border"
                            }
                          `}
                        >
                          Negado
                        </button>
                      </div>
                    </div>

                    {/* Campo de Quantidade (só aparece se aprovado) */}
                    {item.status === 'aprovado' && (
                      <div>
                        <Label className="text-xs sm:text-sm text-foreground mb-1.5 sm:mb-2 block">
                          Qtd. Aprovada
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max={item.quantityRequested}
                          value={item.quantityApproved}
                          onChange={(e) => 
                            handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                          }
                          className="bg-input text-foreground border-border focus:border-accent h-9"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Máx: {item.quantityRequested}
                        </p>
                      </div>
                    )}

                    {/* Status Visual - Desktop only */}
                    <div className="hidden sm:flex items-center">
                      {item.status && (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className={`text-sm font-medium ${
                            item.status === 'aprovado' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                          }`}>
                            {item.status === 'aprovado' ? 'Autorizado' : 'Negado'}
                            {item.status === 'aprovado' && (
                              <span className="text-muted-foreground ml-1">
                                ({item.quantityApproved}/{item.quantityRequested})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {!item.status && (
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          Aguardando decisão
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {hasOpmeItems && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-medsync-light w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveApprovalsMutation.isPending || !canSave}
              className="bg-medsync-blue hover:bg-medsync-blue-dark text-white font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {saveApprovalsMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
