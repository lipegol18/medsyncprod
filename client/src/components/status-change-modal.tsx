import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Send,
  Check,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Stethoscope,
  Edit,
} from "lucide-react";

interface StatusOption {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  requiresModal?: boolean; // Para casos que precisam de modal adicional (aprovação parcial, valores recebidos)
  disabled?: boolean; // Opção desabilitada por validação
  disabledReason?: string; // Razão pela qual está desabilitada
}

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  currentStatus: string;
  currentStatusLabel: string;
  onStatusChange: (orderId: number, newStatus: string, notes?: string) => void;
  onPartialApproval?: (orderId: number) => void;
  onReceivedValues?: (orderId: number) => void;
  onEditOrder?: (order: any) => void;
  onAppeal?: (orderId: number) => void; // Abrir modal de recurso
  order?: any; // Objeto order completo (inclui surgeryAppointment)
}

// Definição do workflow de estados com próximas etapas lógicas
const workflowSteps: Record<string, StatusOption[]> = {
  em_preenchimento: [],
  aguardando_envio: [
    {
      key: "em_avaliacao",
      label: "Em Análise",
      description: "Operadora está analisando o pedido médico",
      icon: Clock,
      color: "text-accent",
    },
    {
      key: "cancelado",
      label: "Cancelar Pedido",
      description: "Cancelar antes da análise da operadora",
      icon: X,
      color: "text-destructive",
    },
  ],
  em_avaliacao: [
    {
      key: "aceito",
      label: "Autorizar Integralmente",
      description: "Operadora aprovou todos os itens do pedido",
      icon: Check,
      color: "text-emerald-600",
    },
    {
      key: "autorizado_parcial",
      label: "Autorização Parcial",
      description: "Operadora aprovou apenas alguns itens do pedido",
      icon: CheckCircle,
      color: "text-violet-600",
      requiresModal: true,
    },
    {
      key: "pendencia",
      label: "Solicitar Documentação",
      description: "Operadora solicita documentos adicionais",
      icon: AlertCircle,
      color: "text-amber-600",
    },
    {
      key: "cancelado",
      label: "Negar Pedido",
      description: "Operadora recusou o pedido médico",
      icon: X,
      color: "text-destructive",
    },
  ],
  aceito: [
    {
      key: "cirurgia_realizada",
      label: "Cirurgia Realizada",
      description: "Procedimento cirúrgico foi executado com sucesso",
      icon: Stethoscope,
      color: "text-accent",
    },
    {
      key: "cancelado",
      label: "Cancelar Cirurgia",
      description: "Cancelar cirurgia previamente agendada",
      icon: X,
      color: "text-destructive",
    },
  ],
  autorizado_parcial: [
    {
      key: "cirurgia_realizada",
      label: "Cirurgia Realizada",
      description: "Procedimento cirúrgico foi executado com sucesso",
      icon: Stethoscope,
      color: "text-accent",
    },
    {
      key: "cancelado",
      label: "Cancelar Cirurgia",
      description: "Cancelar cirurgia previamente agendada",
      icon: X,
      color: "text-destructive",
    },
  ],

  cirurgia_realizada: [
    {
      key: "recebido",
      label: "Marcar como Recebido",
      description: "Confirmar recebimento dos valores da operadora",
      icon: DollarSign,
      color: "text-emerald-600",
      requiresModal: true,
    },
  ],
  pendencia: [
    {
      key: "edit_order",
      label: "Criar Nova Versão",
      description:
        "Retificar o pedido com as correções solicitadas pela operadora",
      icon: Edit,
      color: "text-medsync-blue",
    },
    {
      key: "aguardando_recurso",
      label: "Gerar Recurso",
      description: "Contestar a decisão com justificativa médica adicional",
      icon: FileText,
      color: "text-rose-600",
    },
    {
      key: "cancelado",
      label: "Cancelar Pedido",
      description: "Encerrar o pedido e registrar o motivo do cancelamento",
      icon: X,
      color: "text-destructive",
    },
  ],
  cancelado: [
    {
      key: "aguardando_recurso",
      label: "Interpor Recurso",
      description: "Contestar decisão de negativa da operadora",
      icon: FileText,
      color: "text-rose-600",
    },
  ],
  aguardando_recurso: [
    {
      key: "em_avaliacao",
      label: "Recurso enviado para análise",
      description: "Recurso enviado para análise por parte da operadora",
      icon: Clock,
      color: "text-accent",
    },
    {
      key: "cancelado",
      label: "Cancelar Pedido",
      description: "Cancelar pedido definitivamente",
      icon: X,
      color: "text-destructive",
    },
  ],
};

export function StatusChangeModal({
  isOpen,
  onClose,
  orderId,
  currentStatus,
  currentStatusLabel,
  onStatusChange,
  onPartialApproval,
  onReceivedValues,
  onEditOrder,
  onAppeal,
  order,
}: StatusChangeModalProps) {
  // Estado para modal de confirmação de cancelamento
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelOptionLabel, setCancelOptionLabel] = useState("");

  // Verificar se a transição para 'cirurgia_realizada' é permitida
  const canTransitionToSurgeryCompleted = (): {
    allowed: boolean;
    reason?: string;
  } => {
    // Priorizar surgeryAppointment (tabela surgery_appointments) sobre order.procedureDate (legado)
    const appointment = order?.surgeryAppointment;
    const appointmentDate = appointment?.scheduledDate;
    const legacyDate = order?.procedureDate;
    const surgeryDate = appointmentDate || legacyDate;

    if (!surgeryDate) {
      return {
        allowed: false,
        reason:
          "É necessário agendar a cirurgia antes de marcá-la como realizada",
      };
    }

    // Comparar a data de agendamento com a data atual
    const scheduledDate = new Date(surgeryDate);

    // Validar se a data é válida
    if (isNaN(scheduledDate.getTime())) {
      return {
        allowed: false,
        reason:
          "Data de agendamento inválida. Atualize o agendamento da cirurgia.",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetar para início do dia
    scheduledDate.setHours(0, 0, 0, 0);

    // A data de agendamento deve ser MENOR que a data atual (não igual)
    // Ou seja, a cirurgia deve ter sido agendada para um dia que já passou
    if (scheduledDate >= today) {
      const formattedDate = scheduledDate.toLocaleDateString("pt-BR");
      const scheduledTime = appointment?.scheduledTime
        ? ` às ${appointment.scheduledTime}`
        : "";
      if (scheduledDate.getTime() === today.getTime()) {
        return {
          allowed: false,
          reason: `A cirurgia está agendada para hoje (${formattedDate}${scheduledTime}). Só será possível marcá-la como realizada a partir de amanhã.`,
        };
      }
      return {
        allowed: false,
        reason: `A cirurgia está agendada para ${formattedDate}${scheduledTime}. Só é possível marcá-la como realizada após essa data.`,
      };
    }

    return { allowed: true };
  };

  const surgeryTransitionCheck = canTransitionToSurgeryCompleted();

  // Filtrar e modificar opções baseado nas validações
  const rawOptions = workflowSteps[currentStatus] || [];
  const availableOptions = rawOptions.map((option) => {
    if (
      option.key === "cirurgia_realizada" &&
      !surgeryTransitionCheck.allowed
    ) {
      return {
        ...option,
        disabled: true,
        disabledReason: surgeryTransitionCheck.reason,
      };
    }
    return option;
  });

  const handleOptionClick = (option: StatusOption & { disabled?: boolean }) => {
    if (option.disabled) {
      return; // Não fazer nada se a opção estiver desabilitada
    }

    // Interceptar opções de cancelamento para mostrar modal de confirmação
    if (option.key === "cancelado") {
      setCancelOptionLabel(option.label);
      setCancelNotes("");
      setShowCancelConfirmation(true);
      return;
    }

    // Interceptar opção de editar pedido
    if (option.key === "edit_order") {
      if (onEditOrder && order) {
        onEditOrder(order);
      }
      onClose();
      return;
    }

    // Interceptar opção de gerar recurso - abrir modal de recurso ao invés de mudar status diretamente
    if (option.key === "aguardando_recurso") {
      if (onAppeal) {
        onAppeal(orderId);
      }
      onClose();
      return;
    }

    if (option.requiresModal) {
      // Casos especiais que requerem modais adicionais
      if (option.key === "autorizado_parcial" && onPartialApproval) {
        onPartialApproval(orderId);
      } else if (option.key === "recebido" && onReceivedValues) {
        onReceivedValues(orderId);
      }
    } else {
      // Mudança direta de status
      onStatusChange(orderId, option.key);
    }
    onClose();
  };

  const handleConfirmCancellation = () => {
    onStatusChange(orderId, "cancelado", cancelNotes || undefined);
    setShowCancelConfirmation(false);
    setCancelNotes("");
    onClose();
  };

  const handleCancelCancellation = () => {
    setShowCancelConfirmation(false);
    setCancelNotes("");
  };

  // Caso especial para pedidos incompletos
  if (currentStatus === "em_preenchimento") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-accent">
              Pedido Incompleto #{orderId}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Status atual:{" "}
              <span className="font-medium text-foreground">
                {currentStatusLabel}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <p className="text-lg text-foreground mb-2">
              Pedido Necessita Preenchimento
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Este pedido não pode ser enviado para análise pois ainda está
              incompleto.
            </p>
            <p className="text-sm text-accent">
              Complete o preenchimento para que possa ser enviado para a
              operadora.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border text-muted-foreground hover:bg-muted/50"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                if (onEditOrder && order) {
                  onEditOrder(order);
                }
                onClose();
              }}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Editar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (availableOptions.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-accent">
              Status do Pedido #{orderId}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Status atual:{" "}
              <span className="font-medium text-foreground">
                {currentStatusLabel}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
            <p className="text-lg text-foreground mb-2">Pedido Finalizado</p>
            <p className="text-sm text-muted-foreground">
              Este pedido atingiu seu estado final e não pode ser alterado.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground hover:bg-muted/50"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-accent">
            Alterar Status do Pedido #{orderId}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Status atual:{" "}
            <span className="font-medium text-foreground">
              {currentStatusLabel}
            </span>
            <br />
            Escolha a próxima etapa do processo:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {availableOptions.map((option) => {
            const IconComponent = option.icon;
            const isDisabled = option.disabled;

            return (
              <Card
                key={option.key}
                className={`transition-colors ${
                  isDisabled
                    ? "cursor-not-allowed border-border/50 bg-muted/30 opacity-60"
                    : "cursor-pointer border-border bg-muted/50 hover:bg-muted/80"
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <IconComponent
                      className={`h-5 w-5 ${isDisabled ? "text-muted-foreground" : option.color} mt-1 flex-shrink-0`}
                    />
                    <div className="flex-1">
                      <h4
                        className={`font-medium mb-1 ${isDisabled ? "text-muted-foreground" : "text-foreground"}`}
                      >
                        {option.label}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {option.description}
                      </p>
                      {isDisabled && option.disabledReason && (
                        <div className="mt-2 flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs">
                          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span className="text-amber-700 dark:text-amber-400">
                            {option.disabledReason}
                          </span>
                        </div>
                      )}
                    </div>
                    {!isDisabled && (
                      <ArrowRight className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="btn-medsync-light">
            Fechar
          </button>
        </div>
      </DialogContent>

      {/* Modal de Confirmação de Cancelamento */}
      <Dialog
        open={showCancelConfirmation}
        onOpenChange={setShowCancelConfirmation}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <X className="h-5 w-5" />
              Confirmar {cancelOptionLabel}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta ação irá alterar o status do pedido #{orderId} para
              cancelado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Tem certeza que deseja continuar? Esta ação pode ser revertida
                posteriormente se necessário.
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="cancel-notes"
                className="text-sm font-medium text-foreground"
              >
                Motivo do cancelamento (opcional)
              </Label>
              <Textarea
                id="cancel-notes"
                placeholder="Descreva o motivo do cancelamento..."
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                className="min-h-[100px] bg-background border-input text-foreground placeholder:text-muted-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Esta informação será registrada no histórico do pedido.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCancelCancellation}
              className="flex-1 border-border text-muted-foreground hover:bg-muted/50"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmCancellation}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
