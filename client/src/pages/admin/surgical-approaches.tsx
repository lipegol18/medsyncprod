import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type SurgicalApproach = {
  id: number;
  name: string;
  description?: string;
};

type CreateSurgicalApproachData = {
  name: string;
  description?: string;
};

export default function SurgicalApproachesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingApproach, setEditingApproach] = useState<SurgicalApproach | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<CreateSurgicalApproachData>({
    name: "",
    description: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar condutas cirúrgicas
  const { data: approaches = [], isLoading } = useQuery({
    queryKey: ["/api/admin/surgical-approaches"],
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-approaches"] });
      setIsCreateOpen(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Sucesso",
        description: "Conduta cirúrgica criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar conduta cirúrgica.",
        variant: "destructive",
      });
    },
  });

  // Atualizar conduta cirúrgica
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CreateSurgicalApproachData }) => {
      const response = await fetch(`/api/admin/surgical-approaches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar conduta");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-approaches"] });
      setIsEditOpen(false);
      setEditingApproach(null);
      setFormData({ name: "", description: "" });
      toast({
        title: "Sucesso",
        description: "Conduta cirúrgica atualizada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar conduta cirúrgica.",
        variant: "destructive",
      });
    },
  });

  // Deletar conduta cirúrgica
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/surgical-approaches/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar conduta");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/surgical-approaches"] });
      toast({
        title: "Sucesso",
        description: "Conduta cirúrgica removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover conduta cirúrgica.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (approach: SurgicalApproach) => {
    setEditingApproach(approach);
    setFormData({
      name: approach.name,
      description: approach.description || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (editingApproach) {
      updateMutation.mutate({ id: editingApproach.id, data: formData });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta conduta cirúrgica?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredApproaches = approaches.filter((approach: SurgicalApproach) =>
    approach.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Condutas Cirúrgicas</h1>
          <p className="text-muted-foreground">
            Gerencie as condutas cirúrgicas disponíveis no sistema
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conduta
            </Button>
          </DialogTrigger>
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
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lista de Condutas
          </CardTitle>
          <CardDescription>
            Total de {filteredApproaches.length} condutas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar condutas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredApproaches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Nenhuma conduta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredApproaches.map((approach: SurgicalApproach) => (
                  <TableRow key={approach.id}>
                    <TableCell className="font-medium">{approach.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {approach.description || "Sem descrição"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(approach)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(approach.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Conduta Cirúrgica</DialogTitle>
            <DialogDescription>
              Atualize as informações da conduta cirúrgica.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Conduta</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Artroscopia, Cirurgia Aberta"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da conduta cirúrgica"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Atualizando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}