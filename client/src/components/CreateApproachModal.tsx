import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type CreateApproachModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (createdApproach: any) => void;
};

type CreateSurgicalApproachData = {
  name: string;
  description?: string;
};

export function CreateApproachModal({ isOpen, onOpenChange, onSuccess }: CreateApproachModalProps) {
  const [formData, setFormData] = useState<CreateSurgicalApproachData>({
    name: "",
    description: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Criar conduta cirúrgica
  const createMutation = useMutation({
    mutationFn: async (data: CreateSurgicalApproachData) => {
      const response = await fetch("/api/admin/surgical-approaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar conduta");
      return response.json();
    },
    onSuccess: (createdApproach) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-approaches"] });
      onOpenChange(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Sucesso",
        description: "Conduta cirúrgica criada com sucesso!",
      });
      
      // Chamar callback se fornecido
      if (onSuccess) {
        onSuccess(createdApproach);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar conduta cirúrgica.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome da conduta é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({ name: "", description: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Conduta Cirúrgica</DialogTitle>
          <DialogDescription>
            Adicione uma nova conduta cirúrgica ao sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Conduta</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Artroscopia, Cirurgia Aberta"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional da conduta cirúrgica"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}