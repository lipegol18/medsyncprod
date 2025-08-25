import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { handleCBHPMCodeInput, handleCID10CodeInput, formatCID10Code, formatCBHPMCode } from "@/lib/formatters";
import { CidCode, Procedure } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Search, Link2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface CidCbhpmAssociation {
  id: number;
  cidCodeId: number;
  procedureId: number;
  cidCode: CidCode;
  procedure: Procedure;
  createdAt: string;
}

export default function CidCbhpmAssociationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Estados
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCidId, setSelectedCidId] = useState<string>("");
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("");
  const [deleteAssociationId, setDeleteAssociationId] = useState<number | null>(null);
  const [cidSearchTerm, setCidSearchTerm] = useState("");
  const [procedureSearchTerm, setProcedureSearchTerm] = useState("");
  const [cidPopoverOpen, setCidPopoverOpen] = useState(false);
  const [procedurePopoverOpen, setProcedurePopoverOpen] = useState(false);

  // Função de normalização de texto (igual aos campos do pedido cirúrgico)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Verificar se é administrador
  if (user?.roleId !== 1) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Acesso negado. Esta página é restrita a administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Queries
  const { data: associationsData, isLoading: loadingAssociations } = useQuery({
    queryKey: ["/api/cid-cbhpm-associations"],
  });

  const { data: cidCodesData, isLoading: loadingCids } = useQuery({
    queryKey: ["/api/cid-codes"],
  });

  const { data: proceduresData, isLoading: loadingProcedures } = useQuery({
    queryKey: ["/api/procedures"],
  });

  // Garantir que os dados sejam arrays
  const associations = Array.isArray(associationsData) ? associationsData : [];
  const cidCodes = Array.isArray(cidCodesData) ? cidCodesData : [];
  const procedures = Array.isArray(proceduresData) ? proceduresData : [];

  console.log('Debug - associationsData:', associationsData);
  console.log('Debug - associations after array check:', associations);

  // Listas filtradas com normalização e mínimo de 3 caracteres
  const filteredCidCodes = useMemo(() => {
    if (cidSearchTerm.length < 3) return cidCodes;
    
    const normalizedSearch = normalizeText(cidSearchTerm);
    return cidCodes.filter((cid: CidCode) => {
      const normalizedCode = normalizeText(cid.code);
      const normalizedDescription = normalizeText(cid.description);
      return normalizedCode.includes(normalizedSearch) || 
             normalizedDescription.includes(normalizedSearch);
    });
  }, [cidCodes, cidSearchTerm]);

  const filteredProcedures = useMemo(() => {
    if (procedureSearchTerm.length < 3) return procedures;
    
    const normalizedSearch = normalizeText(procedureSearchTerm);
    return procedures.filter((procedure: Procedure) => {
      const normalizedCode = normalizeText(procedure.code);
      const normalizedName = normalizeText(procedure.name);
      return normalizedCode.includes(normalizedSearch) || 
             normalizedName.includes(normalizedSearch);
    });
  }, [procedures, procedureSearchTerm]);

  // Mutations
  const createAssociationMutation = useMutation({
    mutationFn: async (data: { cidCodeId: number; procedureId: number }) => {
      return apiRequest("/api/cid-cbhpm-associations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cid-cbhpm-associations"] });
      // Manter o CID-10 selecionado, apenas limpar o procedimento
      setSelectedProcedureId("");
      setProcedureSearchTerm("");
      setProcedurePopoverOpen(false);
      toast({
        title: "Sucesso",
        description: "Associação criada com sucesso! Você pode adicionar outro procedimento para o mesmo CID.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Erro ao criar associação";
      toast({
        variant: "destructive",
        title: errorMessage.includes("já existe") ? "Associação Duplicada" : "Erro",
        description: errorMessage,
      });
    },
  });

  const deleteAssociationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/cid-cbhpm-associations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cid-cbhpm-associations"] });
      setDeleteAssociationId(null);
      toast({
        title: "Sucesso",
        description: "Associação removida com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao remover associação",
      });
    },
  });

  // Handlers
  const handleCreateAssociation = () => {
    if (!selectedCidId || !selectedProcedureId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um código CID e um procedimento CBHPM",
      });
      return;
    }

    createAssociationMutation.mutate({
      cidCodeId: parseInt(selectedCidId),
      procedureId: parseInt(selectedProcedureId),
    });
  };

  const handleDeleteAssociation = (id: number) => {
    setDeleteAssociationId(id);
  };

  // Filtrar associações com base no CID selecionado e na busca
  const filteredAssociations = useMemo(() => {
    if (!Array.isArray(associations)) {
      console.warn('associations is not an array:', associations);
      return [];
    }
    
    let filtered = associations;
    
    // Filtrar pelo CID-10 selecionado se houver um
    if (selectedCidId) {
      filtered = filtered.filter((association: CidCbhpmAssociation) =>
        association.cidCodeId.toString() === selectedCidId
      );
    }
    
    // Aplicar filtro de busca se houver
    if (searchTerm) {
      filtered = filtered.filter((association: CidCbhpmAssociation) =>
        association.cidCode?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        association.cidCode?.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        association.procedure?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        association.procedure?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [associations, searchTerm, selectedCidId]);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="h-6 w-6" />
              Associações CID-10 / CBHPM
            </CardTitle>
            <p className="text-muted-foreground">
              Gerencie as associações entre códigos CID-10 e procedimentos CBHPM.
              Um código CID pode ter múltiplos procedimentos associados.
            </p>
          </CardHeader>
        </Card>

        {/* Formulário de criação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nova Associação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              
              {/* Seleção do CID com busca dinâmica */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Código CID-10</label>
                <Popover open={cidPopoverOpen} onOpenChange={setCidPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-auto min-h-[40px] whitespace-normal text-left p-3"
                    >
                      <span className="flex-1 pr-2">
                        {selectedCidId && cidCodes.find((cid: CidCode) => cid.id.toString() === selectedCidId)
                          ? `${cidCodes.find((cid: CidCode) => cid.id.toString() === selectedCidId)?.code} - ${cidCodes.find((cid: CidCode) => cid.id.toString() === selectedCidId)?.description}`
                          : "Buscar código CID-10..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Digite código CID-10 (M75) ou descrição..." 
                        value={cidSearchTerm}
                        onValueChange={(value) => {
                          // Se parece ser um código CID-10 (letra seguida de números), aplica formatação
                          if (/^[A-Za-z][0-9]/.test(value)) {
                            setCidSearchTerm(formatCID10Code(value));
                          } else {
                            // Caso contrário, permite entrada livre para busca por descrição
                            setCidSearchTerm(value);
                          }
                        }}
                      />
                      <CommandEmpty>
                        {cidSearchTerm.length < 3 
                          ? "Digite pelo menos 3 caracteres para buscar" 
                          : "Nenhum código CID-10 encontrado"}
                      </CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {filteredCidCodes.map((cid: CidCode) => (
                          <CommandItem
                            key={cid.id}
                            value={`${cid.code} ${cid.description}`}
                            onSelect={() => {
                              setSelectedCidId(cid.id.toString());
                              setCidSearchTerm("");
                              setCidPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCidId === cid.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cid.code} - {cid.description}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Seleção do Procedimento com busca dinâmica */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Procedimento CBHPM</label>
                <Popover open={procedurePopoverOpen} onOpenChange={setProcedurePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-auto min-h-[40px] whitespace-normal text-left p-3"
                    >
                      <span className="flex-1 pr-2">
                        {selectedProcedureId && procedures.find((proc: Procedure) => proc.id.toString() === selectedProcedureId)
                          ? `${procedures.find((proc: Procedure) => proc.id.toString() === selectedProcedureId)?.code} - ${procedures.find((proc: Procedure) => proc.id.toString() === selectedProcedureId)?.name}`
                          : "Buscar procedimento CBHPM..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[700px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Digite código CBHPM (31603017) ou nome..." 
                        value={procedureSearchTerm}
                        onValueChange={(value) => handleCBHPMCodeInput(value, setProcedureSearchTerm)}
                      />
                      <CommandEmpty>
                        {procedureSearchTerm.length < 3 
                          ? "Digite pelo menos 3 caracteres para buscar" 
                          : "Nenhum procedimento encontrado"}
                      </CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {filteredProcedures.map((procedure: Procedure) => (
                          <CommandItem
                            key={procedure.id}
                            value={`${procedure.code} ${procedure.name}`}
                            onSelect={() => {
                              setSelectedProcedureId(procedure.id.toString());
                              setProcedureSearchTerm("");
                              setProcedurePopoverOpen(false);
                              
                              // Criar associação automaticamente
                              if (selectedCidId) {
                                createAssociationMutation.mutate({
                                  cidCodeId: parseInt(selectedCidId),
                                  procedureId: procedure.id,
                                });
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProcedureId === procedure.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {procedure.code} - {procedure.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>


            </div>
          </CardContent>
        </Card>

        {/* Lista de associações */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="text-lg">
                {selectedCidId ? (
                  <>
                    Procedimentos Associados ao CID{" "}
                    <span className="font-mono text-blue-600">
                      {formatCID10Code(cidCodes.find((cid: CidCode) => cid.id.toString() === selectedCidId)?.code || '')}
                    </span>
                  </>
                ) : (
                  "Associações Existentes"
                )}
              </CardTitle>
              
              {/* Campo de busca */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por CID ou código CBHPM (31603017)..."
                  value={searchTerm}
                  onChange={(e) => handleCBHPMCodeInput(e.target.value, setSearchTerm)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAssociations ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando associações...
              </div>
            ) : filteredAssociations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhuma associação encontrada" : "Nenhuma associação cadastrada"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código CID-10</TableHead>
                      <TableHead>Descrição CID</TableHead>
                      <TableHead>Código CBHPM</TableHead>
                      <TableHead>Procedimento</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssociations.map((association: CidCbhpmAssociation) => (
                      <TableRow key={association.id}>
                        <TableCell className="font-mono">
                          {association.cidCode?.code ? formatCID10Code(association.cidCode.code) : ''}
                        </TableCell>
                        <TableCell>
                          {association.cidCode?.description}
                        </TableCell>
                        <TableCell className="font-mono">
                          {association.procedure?.code ? formatCBHPMCode(association.procedure.code) : ''}
                        </TableCell>
                        <TableCell>
                          {association.procedure?.name}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAssociation(association.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteAssociationId !== null} onOpenChange={() => setDeleteAssociationId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta associação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAssociationId && deleteAssociationMutation.mutate(deleteAssociationId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAssociationMutation.isPending ? "Removendo..." : "Remover"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}