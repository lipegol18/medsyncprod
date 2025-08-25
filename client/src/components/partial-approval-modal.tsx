import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Hash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
}

export function PartialApprovalModal({ 
  isOpen, 
  onClose, 
  orderId, 
  onApprovalComplete 
}: PartialApprovalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [procedureApprovals, setProcedureApprovals] = useState<ProcedureApproval[]>([]);

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
        status: null, // Sempre inicializar com null (vazio)
        quantityApproved: proc.quantityRequested, // Valor padrão igual à quantidade solicitada
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
      onApprovalComplete();
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Aprovação Parcial de Procedimentos
            </h3>
            <p className="text-muted-foreground text-sm">
              Indique quais procedimentos foram autorizados e as quantidades aprovadas pela seguradora.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-muted-foreground">Carregando procedimentos...</div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {procedureApprovals.map((procedure) => (
              <div
                key={procedure.id}
                className="border border-border rounded-lg p-4 bg-muted/50"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Informações do Procedimento */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-accent" />
                      <span className="text-sm font-bold text-accent">
                        {procedure.code}
                      </span>
                      {procedure.isMain && (
                        <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-foreground mb-2">
                      {procedure.name}
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      Quantidade solicitada: <span className="font-medium">{procedure.quantityRequested}</span>
                    </div>
                  </div>

                  {/* Controles de Aprovação */}
                  <div className="flex flex-col gap-4 min-w-[280px]">
                    {/* Botões de Status */}
                    <div>
                      <Label className="text-sm text-foreground mb-2 block">Status da Aprovação</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(procedure.id, 'aprovado')}
                          className={`
                            px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2
                            ${procedure.status === 'aprovado'
                              ? "bg-emerald-600 border-emerald-500 text-primary-foreground shadow-lg"
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
                            px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2
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
                        <Label className="text-sm text-foreground mb-2 block">
                          Quantidade Aprovada
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max={procedure.quantityRequested}
                          value={procedure.quantityApproved}
                          onChange={(e) => 
                            handleQuantityChange(procedure.id, parseInt(e.target.value) || 1)
                          }
                          className="bg-input text-foreground border-border focus:border-accent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Mínimo: 1 | Máximo: {procedure.quantityRequested}
                        </p>
                      </div>
                    )}

                    {/* Status Visual */}
                    <div className="flex items-center">
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
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted border border-border text-muted-foreground rounded-lg hover:bg-muted/80 hover:border-border transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saveApprovalsMutation.isPending || !canSave}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveApprovalsMutation.isPending ? "Salvando..." : "Salvar Aprovações"}
          </button>
        </div>
      </div>
    </div>
  );
}