import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type CreateSurgicalProcedureData = {
  name: string;
  description?: string;
  isActive: boolean;
};

interface CreateProcedureModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (createdProcedure: any) => void;
}

export function CreateProcedureModal({ 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: CreateProcedureModalProps) {
  const [formData, setFormData] = useState<CreateSurgicalProcedureData>({
    name: "",
    description: "",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Criar procedimento cirúrgico
  const createMutation = useMutation({
    mutationFn: async (data: CreateSurgicalProcedureData) => {
      const response = await fetch("/api/admin/surgical-procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar procedimento");
      return response.json();
    },
    onSuccess: (createdProcedure) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-procedures"] });
      onOpenChange(false);
      setFormData({ name: "", description: "", isActive: true });
      toast({
        title: "Sucesso",
        description: "Procedimento cirúrgico criado com sucesso!",
      });
      
      // Callback para quando um procedimento é criado com sucesso
      if (onSuccess) {
        onSuccess(createdProcedure);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar procedimento cirúrgico.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({ name: "", description: "", isActive: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Procedimento Cirúrgico</DialogTitle>
          <DialogDescription>
            Adicione um novo procedimento cirúrgico ao sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Procedimento</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Reparo do manguito rotador"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional do procedimento"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Ativo</Label>
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