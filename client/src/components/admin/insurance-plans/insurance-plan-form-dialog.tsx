import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { HealthInsurancePlan, HealthInsuranceProvider } from "@shared/schema";
import { Building2, FileText, MapPin, Calendar, CreditCard, Settings, Check, ChevronsUpDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";
import { normalizeText } from "@/lib/normalize";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  registroAns: z.string().min(1, "Selecione uma operadora"),
  cdPlano: z.string().min(1, "Código do plano é obrigatório"),
  nmPlano: z.string().optional(),
  modalidade: z.string().optional(),
  segmentacao: z.string().optional(),
  acomodacao: z.string().optional(),
  tipoContratacao: z.string().optional(),
  abrangenciaGeografica: z.string().optional(),
  situacao: z.string().optional(),
  dtInicioComercializacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InsurancePlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: HealthInsurancePlan | null;
  mode: "create" | "edit";
  providers: HealthInsuranceProvider[];
}

const MODALIDADES = [
  "Medicina de Grupo",
  "Cooperativa Médica",
  "Autogestão",
  "Seguradora Especializada em Saúde",
  "Filantropia",
  "Administradora de Benefícios",
];

const SEGMENTACOES = [
  "Ambulatorial",
  "Hospitalar com obstetrícia",
  "Hospitalar sem obstetrícia",
  "Odontológico",
  "Referência",
  "Ambulatorial + Hospitalar com obstetrícia",
  "Ambulatorial + Hospitalar sem obstetrícia",
];

const ACOMODACOES = [
  "Apartamento",
  "Enfermaria",
  "Não se aplica",
];

const TIPOS_CONTRATACAO = [
  "Individual ou familiar",
  "Coletivo empresarial",
  "Coletivo por adesão",
];

const ABRANGENCIAS = [
  "Municipal",
  "Grupo de Municípios",
  "Estadual",
  "Grupo de Estados",
  "Nacional",
];

const SITUACOES = [
  "Ativo",
  "Suspenso",
  "Cancelado",
  "Transferido",
];

export function InsurancePlanFormDialog({
  open,
  onOpenChange,
  plan,
  mode,
  providers,
}: InsurancePlanFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      registroAns: "",
      cdPlano: "",
      nmPlano: "",
      modalidade: "",
      segmentacao: "",
      acomodacao: "",
      tipoContratacao: "",
      abrangenciaGeografica: "",
      situacao: "",
      dtInicioComercializacao: "",
    },
  });

  const [providerComboboxOpen, setProviderComboboxOpen] = useState(false);

  useEffect(() => {
    if (plan && mode === "edit") {
      form.reset({
        registroAns: plan.registroAns || "",
        cdPlano: plan.cdPlano || "",
        nmPlano: plan.nmPlano || "",
        modalidade: plan.modalidade || "",
        segmentacao: plan.segmentacao || "",
        acomodacao: plan.acomodacao || "",
        tipoContratacao: plan.tipoContratacao || "",
        abrangenciaGeografica: plan.abrangenciaGeografica || "",
        situacao: plan.situacao || "",
        dtInicioComercializacao: plan.dtInicioComercializacao || "",
      });
    } else {
      form.reset({
        registroAns: "",
        cdPlano: "",
        nmPlano: "",
        modalidade: "",
        segmentacao: "",
        acomodacao: "",
        tipoContratacao: "",
        abrangenciaGeografica: "",
        situacao: "Ativo",
        dtInicioComercializacao: "",
      });
    }
  }, [plan, mode, open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("/api/health-insurance-plans", "POST", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurance-plans"] });
      toast({
        title: "Plano criado com sucesso",
        description: "O novo plano de saúde foi adicionado ao sistema.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest(`/api/health-insurance-plans/${plan?.id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-insurance-plans"] });
      toast({
        title: "Plano atualizado com sucesso",
        description: "As informações do plano foram atualizadas.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === "create" ? "Novo Plano de Saúde" : "Editar Plano de Saúde"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Preencha as informações para cadastrar um novo plano de saúde."
              : "Atualize as informações do plano de saúde."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registroAns"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      Operadora *
                    </FormLabel>
                    <Popover open={providerComboboxOpen} onOpenChange={setProviderComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={providerComboboxOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-provider"
                          >
                            {field.value
                              ? providers.find((p) => p.ansCode === field.value)?.name || "Selecione a operadora"
                              : "Selecione a operadora"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command filter={(value, search) => {
                          if (!search) return 1;
                          return normalizeText(value).includes(normalizeText(search)) ? 1 : 0;
                        }}>
                          <CommandInput placeholder="Buscar operadora..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma operadora encontrada.</CommandEmpty>
                            <CommandGroup>
                              {providers.map((provider) => (
                                <CommandItem
                                  key={provider.id}
                                  value={`${provider.name} ${provider.ansCode}`}
                                  onSelect={() => {
                                    field.onChange(provider.ansCode);
                                    setProviderComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === provider.ansCode ? "opacity-100" : "opacity-0"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cdPlano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      Código do Plano *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 123456789"
                        {...field}
                        data-testid="input-plan-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nmPlano"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Plano</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Plano Premium Empresarial"
                        {...field}
                        data-testid="input-plan-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modalidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      Modalidade
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-modalidade">
                          <SelectValue placeholder="Selecione a modalidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODALIDADES.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segmentacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmentação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-segmentacao">
                          <SelectValue placeholder="Selecione a segmentação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEGMENTACOES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acomodacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acomodação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-acomodacao">
                          <SelectValue placeholder="Selecione a acomodação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACOMODACOES.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoContratacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contratação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tipo-contratacao">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS_CONTRATACAO.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="abrangenciaGeografica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Abrangência Geográfica
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-abrangencia">
                          <SelectValue placeholder="Selecione a abrangência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ABRANGENCIAS.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-situacao">
                          <SelectValue placeholder="Selecione a situação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SITUACOES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dtInicioComercializacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Data Início Comercialização
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-data-inicio"
                      />
                    </FormControl>
                    <FormDescription>
                      Data em que o plano começou a ser comercializado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Salvando..." : mode === "create" ? "Criar Plano" : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
