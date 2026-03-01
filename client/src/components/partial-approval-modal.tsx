import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Hash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PostApprovalDecisionModal } from "@/components/post-approval-decision-modal";
import { OpmeApprovalModal } from "@/components/opme-approval-modal";

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
  const [showOpmeModal, setShowOpmeModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [opmeApprovedCount, setOpmeApprovedCount] = useState(0);
  const [opmeDeniedCount, setOpmeDeniedCount] = useState(0);
  const [deniedOpmeItems, setDeniedOpmeItems] = useState<Array<{name: string, quantity: number}>>([]);

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
        title: "Aprovações de procedimentos salvas",
        description: "Agora vamos verificar os itens OPME.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders', orderId, 'procedures'] });
      
      // Mostrar modal de OPME antes do modal de decisão
      setShowOpmeModal(true);
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

  // Calcular estatísticas para o modal de decisão (procedimentos + OPME)
  const approvedItems = procedureApprovals.filter(proc => proc.status === 'aprovado').length + opmeApprovedCount;
  const deniedItems = procedureApprovals.filter(proc => proc.status === 'negado').length + opmeDeniedCount;

  // Função para lidar com a conclusão do modal OPME
  const handleOpmeApprovalComplete = (opmeApproved: number, opmeDenied: number, deniedItems?: Array<{name: string, quantity: number}>) => {
    setOpmeApprovedCount(opmeApproved);
    setOpmeDeniedCount(opmeDenied);
    if (deniedItems) {
      setDeniedOpmeItems(deniedItems);
    }
    setShowOpmeModal(false);
    // Agora mostrar o modal de decisão final
    setShowDecisionModal(true);
  };

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

  // Função para lidar com "Decidir Depois" - muda status para pendencia com histórico detalhado
  const handleDecideLater = async (deniedItemsList: Array<{type: 'cbhpm' | 'opme', code?: string, name: string, quantityRequested: number}>) => {
    try {
      // Construir nota com lista de itens negados
      let notesContent = 'Decisão pendente sobre itens negados pela operadora.\n\n';
      
      const cbhpmDenied = deniedItemsList.filter(item => item.type === 'cbhpm');
      const opmeDenied = deniedItemsList.filter(item => item.type === 'opme');
      
      if (cbhpmDenied.length > 0) {
        notesContent += '**Procedimentos CBHPM negados:**\n';
        cbhpmDenied.forEach(item => {
          notesContent += `- ${item.code ? `[${item.code}] ` : ''}${item.name} (Qtd: ${item.quantityRequested})\n`;
        });
        notesContent += '\n';
      }
      
      if (opmeDenied.length > 0) {
        notesContent += '**Itens OPME negados:**\n';
        opmeDenied.forEach(item => {
          notesContent += `- ${item.name} (Qtd: ${item.quantityRequested})\n`;
        });
      }

      // Alterar status para pendencia com as notas dos itens negados
      const response = await fetch(`/api/medical-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'pendencia',
          notes: notesContent.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status do pedido');
      }

      console.log(`Status do pedido ${orderId} alterado para: pendencia (itens negados registrados)`);
      
      // Invalidar queries para atualizar dados do cache
      await queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      
      toast({
        title: "Pendência registrada",
        description: "O pedido foi movido para pendência. Você pode decidir sobre os itens negados posteriormente.",
      });
      
      setShowDecisionModal(false);
      onApprovalComplete();
      onClose();
      
    } catch (error) {
      console.error('Erro ao registrar pendência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a pendência.",
        variant: "destructive",
      });
    }
  };

  // Construir lista de itens negados para o modal de decisão
  const deniedItemsList = [
    ...procedureApprovals
      .filter(proc => proc.status === 'negado')
      .map(proc => ({
        type: 'cbhpm' as const,
        code: proc.code,
        name: proc.name,
        quantityRequested: proc.quantityRequested
      })),
    ...deniedOpmeItems.map(item => ({
      type: 'opme' as const,
      name: item.name,
      quantityRequested: item.quantity
    }))
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-2 sm:p-4">
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
              Aprovação de procedimentos CBHPM
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Indique quais procedimentos CBHPM foram autorizados pela operadora.
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
        {!isLoading && procedureApprovals.length > 0 && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => {
                setProcedureApprovals(prev => prev.map(proc => ({
                  ...proc,
                  status: 'aprovado',
                  quantityApproved: proc.quantityRequested
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
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground text-sm">Carregando procedimentos...</div>
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 flex flex-col gap-2">
            {procedureApprovals.map((procedure) => (
              <div
                key={procedure.id}
                className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg border transition-colors
                  ${procedure.status === 'aprovado'
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                    : procedure.status === 'negado'
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : 'bg-card border-border hover:bg-muted/30'}
                `}
              >
                {/* Código */}
                <div className="flex items-center gap-1 shrink-0">
                  <Hash className="h-3 w-3 text-accent" />
                  <span className="text-xs font-bold text-accent">{procedure.code}</span>
                </div>

                {/* Nome + badge Principal */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm text-foreground truncate">{procedure.name}</span>
                  {procedure.isMain && (
                    <span className="shrink-0 inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] rounded-full leading-none">
                      Principal
                    </span>
                  )}
                </div>

                {/* Qtd solicitada */}
                <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
                  Qtd: <span className="font-medium text-foreground">{procedure.quantityRequested}</span>
                </span>

                {/* Input de quantidade aprovada (inline, só quando aprovado) */}
                {procedure.status === 'aprovado' && (
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Aprv:</span>
                    <Input
                      type="number"
                      min="1"
                      max={procedure.quantityRequested}
                      value={procedure.quantityApproved}
                      onChange={(e) =>
                        handleQuantityChange(procedure.id, parseInt(e.target.value) || 1)
                      }
                      className="h-7 w-14 text-xs text-center bg-input border-border focus:border-accent px-1"
                    />
                  </div>
                )}

                {/* Botões Aprovado / Negado */}
                <div className="shrink-0 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(procedure.id, 'aprovado')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all duration-150
                      ${procedure.status === 'aprovado'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                        : 'bg-muted border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Aprovado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(procedure.id, 'negado')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all duration-150
                      ${procedure.status === 'negado'
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

      {/* Modal de Aprovação OPME */}
      <OpmeApprovalModal
        isOpen={showOpmeModal}
        onClose={() => {
          // Se o usuário fechar sem salvar OPME, ir direto para decisão
          setShowOpmeModal(false);
          setShowDecisionModal(true);
        }}
        orderId={orderId}
        onApprovalComplete={handleOpmeApprovalComplete}
      />

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
        deniedItemsList={deniedItemsList}
        onGenerateAppeal={handleGenerateAppeal}
        onAcceptGloss={handleAcceptGloss}
        onDecideLater={handleDecideLater}
      />
    </div>
  );
}