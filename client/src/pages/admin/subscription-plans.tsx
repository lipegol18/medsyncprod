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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, ToggleLeft, DollarSign, Users, Clock, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type SubscriptionPlan = {
  id: number;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  features: string[];
  trialDays: number;
  productId?: string;
  priceIdMonthly?: string;
  priceIdYearly?: string;
  isPopular: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreateSubscriptionPlanData = {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  features: string[];
  trialDays: number;
  productId?: string;
  priceIdMonthly?: string;
  priceIdYearly?: string;
  isPopular: boolean;
  isActive: boolean;
};

export default function AdminSubscriptionPlansPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<CreateSubscriptionPlanData>({
    name: "",
    description: "",
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 1,
    features: [],
    trialDays: 0,
    productId: "",
    priceIdMonthly: "",
    priceIdYearly: "",
    isPopular: false,
    isActive: true,
  });
  const [featureInput, setFeatureInput] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar planos de assinatura
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  // Criar plano de assinatura
  const createMutation = useMutation({
    mutationFn: async (data: CreateSubscriptionPlanData) => {
      const response = await fetch("/api/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar plano");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Plano de assinatura criado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar plano de assinatura
  const updateMutation = useMutation({
    mutationFn: async (data: CreateSubscriptionPlanData & { id: number }) => {
      const response = await fetch(`/api/subscription-plans/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar plano");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setIsEditOpen(false);
      setEditingPlan(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Plano de assinatura atualizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar plano de assinatura
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/subscription-plans/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao deletar plano");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Sucesso",
        description: "Plano de assinatura deletado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Alternar status do plano
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/subscription-plans/${id}/toggle-status`, {
        method: "PATCH",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao alternar status do plano");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Sucesso",
        description: "Status do plano alterado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 1,
      features: [],
      trialDays: 0,
      productId: "",
      priceIdMonthly: "",
      priceIdYearly: "",
      isPopular: false,
      isActive: true,
    });
    setFeatureInput("");
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(priceInCents / 100);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxUsers: plan.maxUsers,
      features: plan.features,
      trialDays: plan.trialDays,
      productId: plan.productId || "",
      priceIdMonthly: plan.priceIdMonthly || "",
      priceIdYearly: plan.priceIdYearly || "",
      isPopular: plan.isPopular,
      isActive: plan.isActive,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Erro",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ ...formData, id: editingPlan.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }));
      setFeatureInput("");
    }
  };

  const removeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  };

  const filteredPlans = plans.filter((plan: SubscriptionPlan) =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="admin-subscription-plans-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Planos de Assinatura</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os planos de assinatura da plataforma
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-plan">
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{plans.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Planos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ToggleLeft className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-2xl font-bold">
                {plans.filter((p: SubscriptionPlan) => p.isActive).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Planos Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">
                {plans.filter((p: SubscriptionPlan) => p.isPopular).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Com Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-purple-500 mr-2" />
              <span className="text-2xl font-bold">
                {plans.filter((p: SubscriptionPlan) => p.trialDays > 0).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              data-testid="input-search-plans"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planos de Assinatura ({filteredPlans.length})</CardTitle>
          <CardDescription>
            Lista de todos os planos de assinatura cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Preço Mensal</TableHead>
                  <TableHead>Preço Anual</TableHead>
                  <TableHead>Max Usuários</TableHead>
                  <TableHead>Trial (dias)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      Carregando planos...
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      Nenhum plano encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan: SubscriptionPlan) => (
                    <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{plan.name}</span>
                          {plan.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {plan.description}
                      </TableCell>
                      <TableCell>{formatPrice(plan.priceMonthly)}</TableCell>
                      <TableCell>{formatPrice(plan.priceYearly)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-500" />
                          {plan.maxUsers}
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.trialDays > 0 ? (
                          <Badge variant="outline">{plan.trialDays} dias</Badge>
                        ) : (
                          <span className="text-gray-400">Sem trial</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={plan.isActive ? "default" : "secondary"}
                          data-testid={`status-plan-${plan.id}`}
                        >
                          {plan.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(plan)}
                            data-testid={`button-edit-${plan.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate(plan.id)}
                            data-testid={`button-toggle-${plan.id}`}
                          >
                            <ToggleLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Tem certeza que deseja deletar este plano?')) {
                                deleteMutation.mutate(plan.id);
                              }
                            }}
                            data-testid={`button-delete-${plan.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingPlan(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-plan-form">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar Plano" : "Criar Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? "Atualize as informações do plano de assinatura" 
                : "Adicione um novo plano de assinatura"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Plano Pro"
                  data-testid="input-plan-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Máximo de Usuários</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="1"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 1 }))}
                  data-testid="input-max-users"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do plano..."
                data-testid="input-plan-description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly">Preço Mensal (centavos)</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  min="0"
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceMonthly: parseInt(e.target.value) || 0 }))}
                  placeholder="Ex: 9990 (R$ 99,90)"
                  data-testid="input-price-monthly"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly">Preço Anual (centavos)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  min="0"
                  value={formData.priceYearly}
                  onChange={(e) => setFormData(prev => ({ ...prev, priceYearly: parseInt(e.target.value) || 0 }))}
                  placeholder="Ex: 99900 (R$ 999,00)"
                  data-testid="input-price-yearly"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trialDays">Dias de Trial</Label>
                <Input
                  id="trialDays"
                  type="number"
                  min="0"
                  value={formData.trialDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trialDays: parseInt(e.target.value) || 0 }))}
                  placeholder="Ex: 15"
                  data-testid="input-trial-days"
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label>Funcionalidades</Label>
              <div className="flex space-x-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Digite uma funcionalidade..."
                  onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                  data-testid="input-add-feature"
                />
                <Button type="button" onClick={addFeature} data-testid="button-add-feature">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(feature)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      data-testid={`button-remove-feature-${index}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stripe Integration */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Integração Stripe (Opcional)</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product ID</Label>
                  <Input
                    id="productId"
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                    placeholder="prod_..."
                    data-testid="input-stripe-product"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceIdMonthly">Price ID Mensal</Label>
                    <Input
                      id="priceIdMonthly"
                      value={formData.priceIdMonthly}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceIdMonthly: e.target.value }))}
                      placeholder="price_..."
                      data-testid="input-stripe-price-monthly"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceIdYearly">Price ID Anual</Label>
                    <Input
                      id="priceIdYearly"
                      value={formData.priceIdYearly}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceIdYearly: e.target.value }))}
                      placeholder="price_..."
                      data-testid="input-stripe-price-yearly"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Switches */}
            <div className="flex items-center space-x-6 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="isActive">Ativo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPopular: checked }))}
                  data-testid="switch-is-popular"
                />
                <Label htmlFor="isPopular">Popular</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
                setEditingPlan(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-plan"
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}