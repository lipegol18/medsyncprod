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
import { Plus, Edit, Trash2, Search, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type MedicalSpecialty = {
  id: number;
  name: string;
  description?: string | null;
  code?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  name: string;
  description: string;
  code: string;
  isActive: boolean;
};

const emptyForm: FormData = { name: "", description: "", code: "", isActive: true };

export default function MedicalSpecialtiesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<MedicalSpecialty | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: specialties = [], isLoading } = useQuery<MedicalSpecialty[]>({
    queryKey: ["/api/admin/medical-specialties"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/medical-specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar especialidade");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/medical-specialties"] });
      setIsCreateOpen(false);
      setFormData(emptyForm);
      toast({ title: "Sucesso", description: "Especialidade criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/admin/medical-specialties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao atualizar especialidade");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/medical-specialties"] });
      setIsEditOpen(false);
      setEditingSpecialty(null);
      setFormData(emptyForm);
      toast({ title: "Sucesso", description: "Especialidade atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/medical-specialties/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao remover especialidade");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/medical-specialties"] });
      toast({ title: "Sucesso", description: "Especialidade removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (specialty: MedicalSpecialty) => {
    setEditingSpecialty(specialty);
    setFormData({
      name: specialty.name,
      description: specialty.description || "",
      code: specialty.code || "",
      isActive: specialty.isActive,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    if (editingSpecialty) updateMutation.mutate({ id: editingSpecialty.id, data: formData });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta especialidade médica?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSpecialties = specialties.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`${isEdit ? "edit-" : ""}spec-name`}>Nome da Especialidade *</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}spec-name`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Ortopedista, Neurocirurgião"
        />
      </div>
      <div>
        <Label htmlFor={`${isEdit ? "edit-" : ""}spec-code`}>Código</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}spec-code`}
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="Ex: ORTO, NEURO"
        />
      </div>
      <div>
        <Label htmlFor={`${isEdit ? "edit-" : ""}spec-description`}>Descrição</Label>
        <Textarea
          id={`${isEdit ? "edit-" : ""}spec-description`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição opcional da especialidade"
        />
      </div>
      <div className="flex items-center space-x-3">
        <Switch
          id={`${isEdit ? "edit-" : ""}spec-active`}
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          className="data-[state=checked]:bg-blue-500"
        />
        <Label htmlFor={`${isEdit ? "edit-" : ""}spec-active`}>Ativa</Label>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Especialidades Médicas</h1>
          <p className="text-muted-foreground">
            Gerencie as especialidades médicas disponíveis no sistema
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setFormData(emptyForm); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Especialidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Especialidade Médica</DialogTitle>
              <DialogDescription>Adicione uma nova especialidade médica ao sistema.</DialogDescription>
            </DialogHeader>
            {renderForm(false)}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
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
            <Stethoscope className="h-5 w-5" />
            Lista de Especialidades Médicas
          </CardTitle>
          <CardDescription>Total de {filteredSpecialties.length} especialidades encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar especialidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredSpecialties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Nenhuma especialidade encontrada</TableCell>
                </TableRow>
              ) : (
                filteredSpecialties.map((specialty) => (
                  <TableRow key={specialty.id}>
                    <TableCell className="text-muted-foreground">{specialty.id}</TableCell>
                    <TableCell className="font-medium">{specialty.name}</TableCell>
                    <TableCell>
                      {specialty.code ? (
                        <Badge variant="secondary">{specialty.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {specialty.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={specialty.isActive ? "default" : "outline"}>
                        {specialty.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(specialty)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(specialty.id)} className="text-destructive hover:text-destructive" title="Remover">
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

      {/* Dialog Editar */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingSpecialty(null); setFormData(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Especialidade Médica</DialogTitle>
            <DialogDescription>Atualize as informações da especialidade médica.</DialogDescription>
          </DialogHeader>
          {renderForm(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Atualizando..." : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
