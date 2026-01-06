import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SurgicalApproach = {
  id: number;
  name: string;
  description?: string;
};

type CloneAssociationsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProcedureId: number | null;
  sourceApproachId: number | null;
  approaches: SurgicalApproach[];
  onSuccess: () => void;
};

export default function CloneAssociationsModal({
  isOpen,
  onOpenChange,
  sourceProcedureId,
  sourceApproachId,
  approaches,
  onSuccess,
}: CloneAssociationsModalProps) {
  const [targetApproachId, setTargetApproachId] = useState<string>("");
  const { toast } = useToast();

  // Mutation para clonar associações
  const cloneAssociationsMutation = useMutation({
    mutationFn: async (data: { source: { procedureId: number; approachId: number }; target: { procedureId: number; approachId: number } }) => {
      return apiRequest("/api/admin/approach-associations/clone", "POST", data);
    },
    onSuccess: (response) => {
      toast({
        title: "Associações da conduta clonadas com sucesso!",
        description: `${response.totalCloned || 0} associações foram clonadas: ${response.cloned?.cids || 0} CIDs, ${response.cloned?.cbhpm || 0} CBHPM, ${response.cloned?.opme || 0} OPME.`,
        variant: "default",
      });
      
      // Invalidar cache das queries relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approach-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/procedure-associations"] });
      
      onSuccess();
      onOpenChange(false);
      setTargetApproachId("");
    },
    onError: (error: any) => {
      console.error("Erro ao clonar associações:", error);
      toast({
        title: "Erro ao clonar associações",
        description: error?.message || "Ocorreu um erro inesperado ao clonar as associações.",
        variant: "destructive",
      });
    },
  });

  const handleClone = () => {
    if (!sourceProcedureId || !sourceApproachId || !targetApproachId) {
      toast({
        title: "Condutas não selecionadas",
        description: "Por favor, selecione tanto a conduta de origem quanto a de destino.",
        variant: "destructive",
      });
      return;
    }

    const targetId = parseInt(targetApproachId);
    if (sourceApproachId === targetId) {
      toast({
        title: "Condutas iguais",
        description: "A conduta de origem e destino devem ser diferentes.",
        variant: "destructive",
      });
      return;
    }

    cloneAssociationsMutation.mutate({
      source: {
        procedureId: sourceProcedureId,
        approachId: sourceApproachId,
      },
      target: {
        procedureId: sourceProcedureId, // Por enquanto, clonamos dentro do mesmo procedimento
        approachId: targetId,
      },
    });
  };

  // Buscar informações das condutas
  const sourceApproach = approaches.find((a) => a.id === sourceApproachId);
  const availableTargetApproaches = approaches.filter(
    (a) => a.id !== sourceApproachId
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-clone-associations">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Clonar Associações de Conduta
          </DialogTitle>
          <DialogDescription>
            Clone todas as associações (CIDs, CBHPM, OPME, fornecedores e justificativas)
            de uma conduta cirurúrgica para outra conduta do mesmo procedimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conduta de origem */}
          <div className="space-y-2">
            <Label>Conduta de Origem</Label>
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-md">
              <div className="font-medium text-teal-900">
                {sourceApproach?.name || "Nenhuma conduta selecionada"}
              </div>
              {sourceApproach?.description && (
                <div className="text-sm text-teal-700 mt-1">
                  {sourceApproach.description}
                </div>
              )}
            </div>
          </div>

          {/* Conduta de destino */}
          <div className="space-y-2">
            <Label htmlFor="target-approach">Conduta de Destino</Label>
            <Select
              value={targetApproachId}
              onValueChange={setTargetApproachId}
              disabled={cloneAssociationsMutation.isPending}
            >
              <SelectTrigger data-testid="select-target-approach">
                <SelectValue placeholder="Selecione a conduta de destino" />
              </SelectTrigger>
              <SelectContent>
                {availableTargetApproaches.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma conduta disponível
                  </SelectItem>
                ) : (
                  availableTargetApproaches.map((approach) => (
                    <SelectItem key={approach.id} value={approach.id.toString()}>
                      {approach.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Aviso importante */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Importante:</p>
              <ul className="space-y-1">
                <li>• Apenas as associações da conduta selecionada serão clonadas</li>
                <li>• Associações CID-10, CBHPM, OPME e fornecedores serão copiadas</li>
                <li>• Justificativas clínicas também serão clonadas</li>
                <li>• A clonagem ocorrerá dentro do mesmo procedimento</li>
                <li>• Associações duplicadas serão ignoradas</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setTargetApproachId("");
            }}
            disabled={cloneAssociationsMutation.isPending}
            data-testid="button-cancel-clone"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleClone}
            disabled={
              cloneAssociationsMutation.isPending ||
              !sourceProcedureId ||
              !sourceApproachId ||
              !targetApproachId
            }
            data-testid="button-confirm-clone"
          >
            {cloneAssociationsMutation.isPending ? (
              <>
                <Copy className="w-4 h-4 mr-2 animate-spin" />
                Clonando...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Clonar Associações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}