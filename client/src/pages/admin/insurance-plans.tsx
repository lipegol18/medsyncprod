import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { HealthInsurancePlan, HealthInsuranceProvider } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Pencil, Plus, Trash2, Search, Filter, Building2, FileText, MapPin, Calendar, CreditCard, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { cn } from "@/lib/utils";
import { normalizeText } from "@/lib/normalize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { InsurancePlanFormDialog } from "@/components/admin/insurance-plans/insurance-plan-form-dialog";

export default function InsurancePlansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("all");
  const [providerComboboxOpen, setProviderComboboxOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<HealthInsurancePlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    document.title = "Planos de Saúde | MedSync";
  }, []);

  const isAdmin = user?.roleId === 1;
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="mt-4">
          Você não tem permissão para acessar esta página. Esta funcionalidade é exclusiva para administradores.
        </p>
      </div>
    );
  }

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<HealthInsuranceProvider[]>({
    queryKey: ["/api/health-insurance-providers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const shouldFetchPlans = selectedProviderId !== "all" || searchTerm.length >= 3;

  const { data: plans = [], isLoading: isLoadingPlans, isFetching: isFetchingPlans } = useQuery<HealthInsurancePlan[]>({
    queryKey: ["/api/health-insurance-plans", selectedProviderId, searchTerm],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: shouldFetchPlans,
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/health-insurance-plans/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurance-plans"] });
      toast({
        title: "Plano excluído com sucesso",
        description: "O plano de saúde foi removido do sistema.",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setFormMode("create");
    setIsFormOpen(true);
  };

  const handleEditPlan = (plan: HealthInsurancePlan) => {
    setSelectedPlan(plan);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleDeletePlan = (plan: HealthInsurancePlan) => {
    setSelectedPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPlan) {
      deletePlanMutation.mutate(selectedPlan.id);
    }
  };

  const getProviderByAnsCode = (ansCode: string) => {
    return providers.find(p => p.ansCode === ansCode);
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = 
      (plan.nmPlano || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.cdPlano.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.registroAns.includes(searchTerm);
    
    const matchesProvider = selectedProviderId === "all" || plan.registroAns === selectedProviderId;
    
    return matchesSearch && matchesProvider;
  });

  const getStatusBadge = (situacao: string | null) => {
    if (!situacao) return null;
    const isActive = situacao.toLowerCase().includes("ativ");
    return (
      <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-100 text-green-800" : ""}>
        {situacao}
      </Badge>
    );
  };

  const getSegmentacaoBadge = (segmentacao: string | null) => {
    if (!segmentacao) return null;
    const colors: Record<string, string> = {
      "ambulatorial": "bg-blue-100 text-blue-800",
      "hospitalar": "bg-purple-100 text-purple-800",
      "obstetrícia": "bg-pink-100 text-pink-800",
      "odontológico": "bg-cyan-100 text-cyan-800",
      "referência": "bg-amber-100 text-amber-800",
    };
    const colorClass = Object.entries(colors).find(([key]) => 
      segmentacao.toLowerCase().includes(key)
    )?.[1] || "bg-gray-100 text-gray-800";
    
    return <Badge variant="outline" className={colorClass}>{segmentacao}</Badge>;
  };

  const isLoading = isLoadingProviders || (shouldFetchPlans && isLoadingPlans);
  const showInitialState = !shouldFetchPlans && plans.length === 0;

  return (
    <>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Planos de Saúde</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os planos de saúde associados às operadoras cadastradas
            </p>
          </div>
          <Button onClick={handleCreatePlan} data-testid="button-add-plan">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Plano
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código ou registro ANS..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-plan"
                  />
                </div>
              </div>
              <div className="w-full md:w-80">
                <Popover open={providerComboboxOpen} onOpenChange={setProviderComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={providerComboboxOpen}
                      className="w-full justify-between"
                      data-testid="select-provider-filter"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {selectedProviderId === "all"
                            ? "Todas as operadoras"
                            : providers.find((p) => p.ansCode === selectedProviderId)?.name || "Selecionar operadora"}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command filter={(value, search) => {
                      if (!search) return 1;
                      return normalizeText(value).includes(normalizeText(search)) ? 1 : 0;
                    }}>
                      <CommandInput placeholder="Buscar operadora..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma operadora encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedProviderId("all");
                              setProviderComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProviderId === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todas as operadoras
                          </CommandItem>
                          {providers.map((provider) => (
                            <CommandItem
                              key={provider.id}
                              value={`${provider.name} ${provider.ansCode}`}
                              onSelect={() => {
                                setSelectedProviderId(provider.ansCode);
                                setProviderComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProviderId === provider.ansCode ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{provider.name}</span>
                                <span className="text-xs text-muted-foreground">ANS: {provider.ansCode}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lista de Planos
                {isFetchingPlans && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground animate-pulse">
                    Carregando...
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {shouldFetchPlans ? `${filteredPlans.length} plano(s) encontrado(s)` : "Aguardando filtros"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : showInitialState ? (
              <div className="text-center py-10 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Selecione uma operadora ou digite pelo menos 3 caracteres</p>
                <p className="text-sm mt-2">
                  Para melhor performance, os planos são carregados apenas quando você filtra por operadora ou busca.
                </p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum plano de saúde encontrado</p>
                {searchTerm || selectedProviderId !== "all" ? (
                  <p className="text-sm mt-2">Tente ajustar os filtros de busca</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Plano</TableHead>
                      <TableHead>Operadora</TableHead>
                      <TableHead>Segmentação</TableHead>
                      <TableHead>Contratação</TableHead>
                      <TableHead>Abrangência</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => {
                      const provider = getProviderByAnsCode(plan.registroAns);
                      return (
                        <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{plan.nmPlano || "—"}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {plan.cdPlano}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{provider?.name || "—"}</span>
                              <span className="text-xs text-muted-foreground">ANS: {plan.registroAns}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSegmentacaoBadge(plan.segmentacao)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{plan.tipoContratacao || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {plan.abrangenciaGeografica || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(plan.situacao)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPlan(plan)}
                                data-testid={`button-edit-plan-${plan.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePlan(plan)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-plan-${plan.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InsurancePlanFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        plan={selectedPlan}
        mode={formMode}
        providers={providers}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{selectedPlan?.nmPlano || selectedPlan?.cdPlano}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
