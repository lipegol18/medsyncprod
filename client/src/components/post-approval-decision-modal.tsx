import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Check, AlertTriangle } from "lucide-react";

interface DeniedItem {
  type: 'cbhpm' | 'opme';
  code?: string;
  name: string;
  quantityRequested: number;
}

interface PostApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  approvedItems: number;
  deniedItems: number;
  deniedItemsList?: DeniedItem[];
  onGenerateAppeal: () => void;
  onAcceptGloss: () => void;
  onDecideLater?: (deniedItemsList: DeniedItem[]) => void;
}

export function PostApprovalDecisionModal({
  isOpen,
  onClose,
  orderId,
  approvedItems,
  deniedItems,
  deniedItemsList = [],
  onGenerateAppeal,
  onAcceptGloss,
  onDecideLater
}: PostApprovalDecisionModalProps) {

  const handleGenerateAppeal = () => {
    onGenerateAppeal();
    onClose();
  };

  const handleAcceptGloss = () => {
    onAcceptGloss();
    onClose();
  };

  const handleDecideLater = () => {
    if (onDecideLater) {
      onDecideLater(deniedItemsList);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Aprovação Parcial Registrada
          </h2>
          <p className="text-muted-foreground text-sm">
            Pedido #{orderId} teve aprovação parcial processada
          </p>
        </div>

        {/* Status Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <Card className="border-emerald-200 dark:border-emerald-900/20">
            <CardContent className="p-4 text-center">
              <Check className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-600">{approvedItems}</p>
              <p className="text-sm text-muted-foreground">Itens Autorizados</p>
            </CardContent>
          </Card>
          
          <Card className="border-destructive/20">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-bold text-destructive">{deniedItems}</p>
              <p className="text-sm text-muted-foreground">Itens Negados</p>
            </CardContent>
          </Card>
        </div>

        {/* Decision Question */}
        <div className="mb-6">
          <h3 className="font-medium text-foreground mb-2">
            O que você gostaria de fazer com os itens negados?
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha uma das opções abaixo para continuar o processo:
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {/* Gerar Recurso */}
          <Card className="hover:border-rose-300 dark:hover:border-rose-700 transition-colors cursor-pointer group" onClick={handleGenerateAppeal}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/20 group-hover:bg-rose-200 dark:group-hover:bg-rose-900/30 transition-colors">
                  <FileText className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">
                    Gerar Recurso
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Contestar os itens negados com justificativa médica adicional. 
                    O pedido será enviado para reanálise da operadora.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aceitar Glosas */}
          <Card className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors cursor-pointer group" onClick={handleAcceptGloss}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/30 transition-colors">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">
                    Aceitar Glosas
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Prosseguir apenas com os itens autorizados. 
                    O pedido ficará pronto para agendamento da cirurgia.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleDecideLater}
            className="btn-medsync-light"
          >
            Decidir Depois
          </button>
        </div>
      </div>
    </div>
  );
}