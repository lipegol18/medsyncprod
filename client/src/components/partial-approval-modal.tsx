import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Hash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PostApprovalDecisionModal } from "@/components/post-approval-decision-modal";

interface ProcedureApproval {
  id: number;
  code: string;
  name: string;
  quantityRequested: number;
  status: 'aprovado' | 'negado' | null;
  quantityApproved: number;
  isMain: boolean;
}

interface PartialApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onApprovalComplete: () => void;
  onGenerateAppeal?: (orderId: number) => void;
  onAcceptGloss?: (orderId: number) => void;
}

export function PartialApprovalModal({ 
  isOpen, 
  onClose, 
  orderId, 
  onApprovalComplete,
  onGenerateAppeal,
  onAcceptGloss
}: PartialApprovalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [procedureApprovals, setProcedureApprovals] = useState<ProcedureApproval[]>([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Buscar procedimentos do pedido
  const { data: procedures, isLoading } = useQuery({
    queryKey: ['/api/medical-orders', orderId, 'procedures'],
    queryFn: () => apiRequest(`/api/medical-orders/${orderId}/procedures`, 'GET'),
    enabled: isOpen && !!orderId,
  });

  // Inicializar estado dos procedimentos quando carregarem
  useEffect(() => {
    if (procedures) {
      const initialApprovals: ProcedureApproval[] = procedures.map((proc: any) => ({
        id: proc.id,
        code: proc.code,
        name: proc.name,
        quantityRequested: proc.quantityRequested,
        // Usar o status real do banco de dados, mapear 'em_analise' para null para permitir edição
        status: proc.status === 'em_analise' ? null : (proc.status as 'aprovado' | 'negado'),
        // Usar quantityApproved do banco se existir, senão usar quantityRequested como padrão
        quantityApproved: proc.quantityApproved ?? proc.quantityRequested,
        isMain: proc.isMain
      }));
      setProcedureApprovals(initialApprovals);
    }
  }, [procedures]);

  // Mutação para salvar aprovações
  const saveApprovalsMutation = useMutation({
    mutationFn: async (approvals: ProcedureApproval[]) => {
      const updates = approvals.map(approval => ({
        id: approval.id,
        status: approval.status,
        quantityApproved: approval.status === 'aprovado' ? approval.quantityApproved : 0
      }));

      // Salvar cada procedimento
      const promises = updates.map(update => 
        apiRequest(`/api/medical-order-procedures/${update.id}/approval`, 'PUT', {
          status: update.status,
          quantityApproved: update.quantityApproved
        })
      );

      await Promise.all(promises);
      return updates;
    },
    onSuccess: () => {
      toast({
        title: "Aprovações salvas",
        description: "As aprovações dos procedimentos foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'procedures'] });
      
      // Mostrar modal de decisão (não fechar o modal principal ainda)
      setShowDecisionModal(true);
    },
    onError: (error) => {
      console.error('Erro ao salvar aprovações:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar as aprovações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (procedureId: number, newStatus: 'aprovado' | 'negado') => {
    setProcedureApprovals(prev => 
      prev.map(proc => 
        proc.id === procedureId 
          ? { 
              ...proc, 
              status: newStatus,
              // Se aprovado, garantir que a quantidade seja pelo menos 1
              quantityApproved: newStatus === 'aprovado' 
                ? Math.max(1, proc.quantityApproved) 
                : 0
            }
          : proc
      )
    );
  };

  const handleQuantityChange = (procedureId: number, quantity: number) => {
    setProcedureApprovals(prev => 
      prev.map(proc => 
        proc.id === procedureId 
          ? { 
              ...proc, 
              quantityApproved: proc.status === 'aprovado' 
                ? Math.max(1, Math.min(quantity, proc.quantityRequested)) // Mínimo 1 se aprovado
                : Math.max(0, Math.min(quantity, proc.quantityRequested))
            }
          : proc
      )
    );
  };

  const handleSave = () => {
    // Verificar se todos os procedimentos têm status definido
    const allProceduresHaveStatus = procedureApprovals.every(proc => proc.status !== null);
    
    if (!allProceduresHaveStatus) {
      toast({
        title: "Aprovação incompleta",
        description: "Por favor, defina o status (aprovado ou negado) para todos os procedimentos.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se procedimentos aprovados têm quantidade válida (maior que zero)
    const approvedWithZeroQuantity = procedureApprovals.find(
      proc => proc.status === 'aprovado' && proc.quantityApproved <= 0
    );

    if (approvedWithZeroQuantity) {
      toast({
        title: "Quantidade inválida",
        description: "Procedimentos aprovados devem ter pelo menos 1 unidade aprovada.",
        variant: "destructive",
      });
      return;
    }
    
    saveApprovalsMutation.mutate(procedureApprovals);
  };

  // Verificar se todos os procedimentos têm status definido para habilitar o botão salvar
  const canSave = procedureApprovals.every(proc => proc.status !== null);

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

  // Calcular estatísticas para o modal de decisão
  const approvedItems = procedureApprovals.filter(proc => proc.status === 'aprovado').length;
  const deniedItems = procedureApprovals.filter(proc => proc.status === 'negado').length;

  // Funções para lidar com as decisões do segundo modal
  const handleGenerateAppeal = async () => {
    try {
      // Alterar status do pedido para "pendencia" antes de abrir tela de recurso
      const response = await fetch(`/api/medical-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'pendencia' })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status do pedido');
      }

      console.log(`Status do pedido ${orderId} alterado para: pendencia`);
      
      // Invalidar queries para atualizar dados do cache
      await queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      await queryClient.refetchQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      
      // Aguardar um pouco para garantir que o cache foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowDecisionModal(false);
      onApprovalComplete();
      onClose();
      
      if (onGenerateAppeal) {
        onGenerateAppeal(orderId);
      }
    } catch (error) {
      console.error('Erro ao alterar status para pendencia:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do pedido.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptGloss = () => {
    setShowDecisionModal(false);
    onApprovalComplete();
    onClose();
    if (onAcceptGloss) {
      onAcceptGloss(orderId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-2 sm:p-4">
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
              Aprovação Parcial
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Indique o status de cada procedimento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-muted-foreground">Carregando procedimentos...</div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {procedureApprovals.map((procedure) => (
              <div
                key={procedure.id}
                className="border border-border rounded-lg p-3 sm:p-4 bg-muted/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
                  {/* Informações do Procedimento */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                        <span className="text-xs sm:text-sm font-bold text-accent">
                          {procedure.code}
                        </span>
                      </div>
                      {procedure.isMain && (
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs rounded-full">
                          Principal
                        </span>
                      )}
                      {/* Status Visual - Mobile inline */}
                      <div className="sm:hidden ml-auto">
                        {procedure.status && (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(procedure.status)}
                            <span className={`text-xs font-medium ${
                              procedure.status === 'aprovado' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                            }`}>
                              {procedure.status === 'aprovado' 
                                ? `${procedure.quantityApproved}/${procedure.quantityRequested}` 
                                : 'Negado'}
                            </span>
                          </div>
                        )}
                        {!procedure.status && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="font-medium text-foreground text-sm sm:text-base mb-1 sm:mb-2 line-clamp-2">
                      {procedure.name}
                    </h4>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Qtd. solicitada: <span className="font-medium">{procedure.quantityRequested}</span>
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
                          onClick={() => handleStatusChange(procedure.id, 'aprovado')}
                          className={`
                            px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2
                            ${procedure.status === 'aprovado'
                              ? "bg-emerald-600 border-emerald-500 text-destructive-foreground shadow-lg"
                              : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:border-border"
                            }
                          `}
                        >
                          Aprovado
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleStatusChange(procedure.id, 'negado')}
                          className={`
                            px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 border-2
                            ${procedure.status === 'negado'
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
                    {procedure.status === 'aprovado' && (
                      <div>
                        <Label className="text-xs sm:text-sm text-foreground mb-1.5 sm:mb-2 block">
                          Qtd. Aprovada
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max={procedure.quantityRequested}
                          value={procedure.quantityApproved}
                          onChange={(e) => 
                            handleQuantityChange(procedure.id, parseInt(e.target.value) || 1)
                          }
                          className="bg-input text-foreground border-border focus:border-accent h-9"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Máx: {procedure.quantityRequested}
                        </p>
                      </div>
                    )}

                    {/* Status Visual - Desktop only */}
                    <div className="hidden sm:flex items-center">
                      {procedure.status && (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(procedure.status)}
                          <span className={`text-sm font-medium ${
                            procedure.status === 'aprovado' ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                          }`}>
                            {procedure.status === 'aprovado' ? 'Autorizado' : 'Negado'}
                            {procedure.status === 'aprovado' && (
                              <span className="text-muted-foreground ml-1">
                                ({procedure.quantityApproved}/{procedure.quantityRequested})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {!procedure.status && (
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
      </div>

      {/* Modal de Decisão Pós-Aprovação */}
      <PostApprovalDecisionModal
        isOpen={showDecisionModal}
        onClose={() => {
          setShowDecisionModal(false);
          onApprovalComplete();
          onClose();
        }}
        orderId={orderId}
        approvedItems={approvedItems}
        deniedItems={deniedItems}
        onGenerateAppeal={handleGenerateAppeal}
        onAcceptGloss={handleAcceptGloss}
      />
    </div>
  );
}