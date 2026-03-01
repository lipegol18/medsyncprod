import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
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
          <div className="mb-4 sm:mb-6 flex flex-col gap-2">
            {opmeApprovals.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg border transition-colors
                  ${item.status === 'aprovado'
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                    : item.status === 'negado'
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : 'bg-card border-border hover:bg-muted/30'}
                `}
              >
                {/* Ícone OPME */}
                <div className="flex items-center gap-1 shrink-0">
                  <Package className="h-3 w-3 text-accent" />
                  <span className="text-xs font-bold text-accent">OPME</span>
                </div>

                {/* Nome técnico + nome comercial */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm text-foreground truncate">{item.technicalName}</span>
                  {item.commercialName && (
                    <span className="shrink-0 text-xs text-muted-foreground truncate hidden sm:inline">
                      · {item.commercialName}
                    </span>
                  )}
                </div>

                {/* Qtd solicitada */}
                <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
                  Qtd: <span className="font-medium text-foreground">{item.quantityRequested}</span>
                </span>

                {/* Input de quantidade aprovada (inline, só quando aprovado) */}
                {item.status === 'aprovado' && (
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Aprv:</span>
                    <Input
                      type="number"
                      min="1"
                      max={item.quantityRequested}
                      value={item.quantityApproved}
                      onChange={(e) =>
                        handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                      }
                      className="h-7 w-14 text-xs text-center bg-input border-border focus:border-accent px-1"
                    />
                  </div>
                )}

                {/* Botões Aprovado / Negado */}
                <div className="shrink-0 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'aprovado')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all duration-150
                      ${item.status === 'aprovado'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                        : 'bg-muted border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Aprovado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, 'negado')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all duration-150
                      ${item.status === 'negado'
                        ? 'bg-destructive border-destructive text-white shadow-sm'
                        : 'bg-muted border-border text-muted-foreground hover:border-red-400 hover:text-red-700'
                      }`}
                  >
                    <XCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Negado</span>
                  </button>
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
