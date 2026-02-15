import { useState, useRef, useEffect } from "react";
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
import { Plus, Edit, Trash2, Search, Bone, Upload, X, Image, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getAnatomicalRegionIcon } from "@/components/AnatomicalRegionIcons";

type AnatomicalRegion = {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  iconKey?: string | null;
};

type MedicalSpecialty = {
  id: number;
  name: string;
  isActive: boolean;
};

type FormData = {
  name: string;
  title: string;
  description: string;
};

const emptyForm: FormData = { name: "", title: "", description: "" };

export default function AnatomicalRegionsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isIconUploadOpen, setIsIconUploadOpen] = useState(false);
  const [isSpecialtyOpen, setIsSpecialtyOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<AnatomicalRegion | null>(null);
  const [iconUploadRegion, setIconUploadRegion] = useState<AnatomicalRegion | null>(null);
  const [specialtyRegion, setSpecialtyRegion] = useState<AnatomicalRegion | null>(null);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [grayFile, setGrayFile] = useState<File | null>(null);
  const [blueFile, setBlueFile] = useState<File | null>(null);
  const [grayPreview, setGrayPreview] = useState<string | null>(null);
  const [bluePreview, setBluePreview] = useState<string | null>(null);
  const grayInputRef = useRef<HTMLInputElement>(null);
  const blueInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["/api/admin/anatomical-regions"],
  });

  const { data: allSpecialties = [] } = useQuery<MedicalSpecialty[]>({
    queryKey: ["/api/admin/medical-specialties"],
  });

  const { data: regionSpecialties = [], refetch: refetchRegionSpecialties } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/admin/anatomical-regions", specialtyRegion?.id, "specialties"],
    queryFn: async () => {
      if (!specialtyRegion) return [];
      const res = await fetch(`/api/admin/anatomical-regions/${specialtyRegion.id}/specialties`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!specialtyRegion,
  });

  useEffect(() => {
    if (regionSpecialties && specialtyRegion) {
      setSelectedSpecialtyIds(regionSpecialties.map(s => s.id));
    }
  }, [regionSpecialties, specialtyRegion]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/anatomical-regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar região anatômica");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anatomical-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anatomical-regions"] });
      setIsCreateOpen(false);
      setFormData(emptyForm);
      toast({ title: "Sucesso", description: "Região anatômica criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/admin/anatomical-regions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao atualizar região anatômica");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anatomical-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anatomical-regions"] });
      setIsEditOpen(false);
      setEditingRegion(null);
      setFormData(emptyForm);
      toast({ title: "Sucesso", description: "Região anatômica atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/anatomical-regions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao remover região anatômica");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anatomical-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anatomical-regions"] });
      toast({ title: "Sucesso", description: "Região anatômica removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const uploadIconsMutation = useMutation({
    mutationFn: async ({ regionId, gray, blue }: { regionId: number; gray: File | null; blue: File | null }) => {
      const fd = new FormData();
      if (gray) fd.append("gray", gray);
      if (blue) fd.append("blue", blue);
      const response = await fetch(`/api/admin/anatomical-regions/${regionId}/upload-icons`, {
        method: "POST",
        body: fd,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao enviar ícones");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anatomical-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anatomical-regions"] });
      setIsIconUploadOpen(false);
      setIconUploadRegion(null);
      resetIconFiles();
      toast({ title: "Sucesso", description: "Ícones atualizados com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteIconsMutation = useMutation({
    mutationFn: async (regionId: number) => {
      const response = await fetch(`/api/admin/anatomical-regions/${regionId}/icons`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao remover ícones");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anatomical-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anatomical-regions"] });
      toast({ title: "Sucesso", description: "Ícones removidos com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateSpecialtiesMutation = useMutation({
    mutationFn: async ({ regionId, specialtyIds }: { regionId: number; specialtyIds: number[] }) => {
      const response = await fetch(`/api/admin/anatomical-regions/${regionId}/specialties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialtyIds }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao atualizar especialidades");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anatomical-regions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anatomical-regions"] });
      refetchRegionSpecialties();
      setIsSpecialtyOpen(false);
      setSpecialtyRegion(null);
      toast({ title: "Sucesso", description: "Especialidades atualizadas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetIconFiles = () => {
    setGrayFile(null);
    setBlueFile(null);
    setGrayPreview(null);
    setBluePreview(null);
    if (grayInputRef.current) grayInputRef.current.value = "";
    if (blueInputRef.current) blueInputRef.current.value = "";
  };

  const handleFileSelect = (file: File, variant: "gray" | "blue") => {
    if (!file.name.endsWith(".svg")) {
      toast({ title: "Erro", description: "Apenas arquivos SVG são permitidos.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (variant === "gray") { setGrayFile(file); setGrayPreview(content); }
      else { setBlueFile(file); setBluePreview(content); }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (region: AnatomicalRegion) => {
    setEditingRegion(region);
    setFormData({ name: region.name, title: region.title || "", description: region.description || "" });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    if (editingRegion) updateMutation.mutate({ id: editingRegion.id, data: formData });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta região anatômica?")) deleteMutation.mutate(id);
  };

  const handleOpenIconUpload = (region: AnatomicalRegion) => {
    setIconUploadRegion(region);
    resetIconFiles();
    setIsIconUploadOpen(true);
  };

  const handleUploadIcons = () => {
    if (!iconUploadRegion) return;
    if (!grayFile && !blueFile) {
      toast({ title: "Erro", description: "Selecione pelo menos um ícone.", variant: "destructive" });
      return;
    }
    uploadIconsMutation.mutate({ regionId: iconUploadRegion.id, gray: grayFile, blue: blueFile });
  };

  const handleDeleteIcons = (region: AnatomicalRegion) => {
    if (confirm(`Remover os ícones de "${region.name}"?`)) deleteIconsMutation.mutate(region.id);
  };

  const handleOpenSpecialties = (region: AnatomicalRegion) => {
    setSpecialtyRegion(region);
    setIsSpecialtyOpen(true);
  };

  const handleSaveSpecialties = () => {
    if (!specialtyRegion) return;
    updateSpecialtiesMutation.mutate({ regionId: specialtyRegion.id, specialtyIds: selectedSpecialtyIds });
  };

  const toggleSpecialty = (id: number) => {
    setSelectedSpecialtyIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredRegions = (regions as AnatomicalRegion[]).filter((region) =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (region.title && region.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`${isEdit ? "edit-" : ""}region-name`}>Nome da Região *</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}region-name`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Ombro, Joelho, Coluna Lombar"
        />
      </div>
      <div>
        <Label htmlFor={`${isEdit ? "edit-" : ""}region-title`}>Título</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}region-title`}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Articulação do Ombro"
        />
      </div>
      <div>
        <Label htmlFor={`${isEdit ? "edit-" : ""}region-description`}>Descrição</Label>
        <Textarea
          id={`${isEdit ? "edit-" : ""}region-description`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição opcional da região anatômica"
        />
      </div>
    </div>
  );

  const renderIconPreview = (region: AnatomicalRegion) => {
    const grayIcon = getAnatomicalRegionIcon(region.id, false, region.iconKey);
    const blueIcon = getAnatomicalRegionIcon(region.id, true, region.iconKey);
    if (!grayIcon && !blueIcon) return <span className="text-muted-foreground text-xs">Sem ícone</span>;
    return (
      <div className="flex items-center gap-2">
        {grayIcon && <img src={grayIcon} alt={`${region.name} cinza`} className="h-8 w-8 rounded bg-muted p-1" />}
        {blueIcon && <img src={blueIcon} alt={`${region.name} azul`} className="h-8 w-8 rounded bg-muted p-1" />}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Regiões Anatômicas</h1>
          <p className="text-muted-foreground">
            Gerencie regiões anatômicas, ícones e especialidades associadas
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setFormData(emptyForm); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Região
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Região Anatômica</DialogTitle>
              <DialogDescription>Adicione uma nova região anatômica ao sistema.</DialogDescription>
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
            <Bone className="h-5 w-5" />
            Lista de Regiões Anatômicas
          </CardTitle>
          <CardDescription>Total de {filteredRegions.length} regiões encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar regiões..."
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
                <TableHead>Título</TableHead>
                <TableHead>Ícones</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredRegions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Nenhuma região encontrada</TableCell>
                </TableRow>
              ) : (
                filteredRegions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="text-muted-foreground">{region.id}</TableCell>
                    <TableCell className="font-medium">{region.name}</TableCell>
                    <TableCell className="text-muted-foreground">{region.title || "—"}</TableCell>
                    <TableCell>{renderIconPreview(region)}</TableCell>
                    <TableCell>
                      {region.iconKey ? <Badge variant="secondary">{region.iconKey}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleOpenSpecialties(region)} title="Especialidades">
                          <Stethoscope className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenIconUpload(region)} title="Ícones">
                          <Image className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(region)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(region.id)} className="text-destructive hover:text-destructive" title="Remover">
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
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingRegion(null); setFormData(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Região Anatômica</DialogTitle>
            <DialogDescription>Atualize as informações da região anatômica.</DialogDescription>
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

      {/* Dialog Ícones */}
      <Dialog open={isIconUploadOpen} onOpenChange={(open) => { setIsIconUploadOpen(open); if (!open) { setIconUploadRegion(null); resetIconFiles(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Ícones - {iconUploadRegion?.name}</DialogTitle>
            <DialogDescription>Envie arquivos SVG (cinza = inativo, azul = selecionado). Máx: 500KB.</DialogDescription>
          </DialogHeader>
          {iconUploadRegion && (
            <div className="space-y-6">
              {iconUploadRegion.iconKey && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ícones atuais</Label>
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <img src={getAnatomicalRegionIcon(iconUploadRegion.id, false, iconUploadRegion.iconKey) || ''} alt="Cinza" className="h-16 w-16 rounded bg-background p-2 border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-xs text-muted-foreground mt-1 block">Cinza</span>
                    </div>
                    <div className="text-center">
                      <img src={getAnatomicalRegionIcon(iconUploadRegion.id, true, iconUploadRegion.iconKey) || ''} alt="Azul" className="h-16 w-16 rounded bg-background p-2 border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-xs text-muted-foreground mt-1 block">Azul</span>
                    </div>
                    <div className="ml-auto">
                      <Button variant="outline" size="sm" onClick={() => handleDeleteIcons(iconUploadRegion)} className="text-destructive hover:text-destructive" disabled={deleteIconsMutation.isPending}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ícone Cinza (inativo)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => grayInputRef.current?.click()}>
                    {grayPreview ? (
                      <div className="relative">
                        <img src={grayPreview} alt="Preview cinza" className="h-16 w-16 mx-auto" />
                        <button onClick={(e) => { e.stopPropagation(); setGrayFile(null); setGrayPreview(null); if (grayInputRef.current) grayInputRef.current.value = ""; }} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-xs text-muted-foreground mt-2">{grayFile?.name}</p>
                      </div>
                    ) : (
                      <div><Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">Clique para enviar SVG</p></div>
                    )}
                  </div>
                  <input ref={grayInputRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0], "gray"); }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ícone Azul (selecionado)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => blueInputRef.current?.click()}>
                    {bluePreview ? (
                      <div className="relative">
                        <img src={bluePreview} alt="Preview azul" className="h-16 w-16 mx-auto" />
                        <button onClick={(e) => { e.stopPropagation(); setBlueFile(null); setBluePreview(null); if (blueInputRef.current) blueInputRef.current.value = ""; }} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-xs text-muted-foreground mt-2">{blueFile?.name}</p>
                      </div>
                    ) : (
                      <div><Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">Clique para enviar SVG</p></div>
                    )}
                  </div>
                  <input ref={blueInputRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0], "blue"); }} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIconUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUploadIcons} disabled={uploadIconsMutation.isPending || (!grayFile && !blueFile)}>
              <Upload className="mr-2 h-4 w-4" />
              {uploadIconsMutation.isPending ? "Enviando..." : "Enviar Ícones"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Especialidades */}
      <Dialog open={isSpecialtyOpen} onOpenChange={(open) => { setIsSpecialtyOpen(open); if (!open) { setSpecialtyRegion(null); setSelectedSpecialtyIds([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Especialidades - {specialtyRegion?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione quais especialidades médicas podem ver esta região anatômica no passo 3 do pedido. Se nenhuma for selecionada, todas as especialidades verão esta região.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto py-2">
            {(allSpecialties as MedicalSpecialty[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma especialidade médica cadastrada.</p>
            ) : (
              (allSpecialties as MedicalSpecialty[]).map((specialty) => (
                <div key={specialty.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors">
                  <Checkbox
                    id={`spec-${specialty.id}`}
                    checked={selectedSpecialtyIds.includes(specialty.id)}
                    onCheckedChange={() => toggleSpecialty(specialty.id)}
                  />
                  <Label htmlFor={`spec-${specialty.id}`} className={`cursor-pointer flex-1 text-sm ${!specialty.isActive ? "text-muted-foreground" : ""}`}>
                    {specialty.name}
                    {!specialty.isActive && <span className="ml-2 text-xs text-orange-500">(Inativa)</span>}
                  </Label>
                </div>
              ))
            )}
          </div>

          {selectedSpecialtyIds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {selectedSpecialtyIds.map(id => {
                const spec = (allSpecialties as MedicalSpecialty[]).find(s => s.id === id);
                return spec ? (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {spec.name}
                    <button onClick={() => toggleSpecialty(id)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSpecialtyOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSpecialties} disabled={updateSpecialtiesMutation.isPending}>
              {updateSpecialtiesMutation.isPending ? "Salvando..." : "Salvar Especialidades"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
