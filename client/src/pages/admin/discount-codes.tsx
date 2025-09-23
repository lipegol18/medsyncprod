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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Search, RefreshCw, DollarSign, Calendar, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DiscountCode = {
  id: number;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  validFrom: string;
  validUntil?: string;
  applicablePlans?: number[];
  isActive: boolean;
  paymentProvider: string;
  stripeCouponId?: string;
  stripePromotionCodeId?: string;
  syncStatus: 'pending' | 'synced' | 'error';
  syncErrorMessage?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
};

type CreateDiscountCodeData = {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxUses?: number;
  validFrom: string;
  validUntil?: string;
  applicablePlans?: number[];
  isActive: boolean;
  paymentProvider: string;
  stripeMinimumAmount?: number;
  stripeFirstTimeTransaction: boolean;
};

export default function AdminDiscountCodesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<CreateDiscountCodeData>({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    validFrom: new Date().toISOString().split('T')[0],
    isActive: true,
    paymentProvider: "stripe",
    stripeFirstTimeTransaction: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar códigos de desconto
  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["/api/admin/discount-codes"],
  });

  // Buscar planos de assinatura para o select
  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });

  // Criar código de desconto
  const createMutation = useMutation({
    mutationFn: async (data: CreateDiscountCodeData) => {
      const response = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar código de desconto");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Código de desconto criado com sucesso!",
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

  // Atualizar código de desconto
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateDiscountCodeData> }) => {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar código de desconto");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      setIsEditOpen(false);
      setEditingCode(null);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Código de desconto atualizado com sucesso!",
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

  // Excluir código de desconto
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir código de desconto");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({
        title: "Sucesso",
        description: "Código de desconto excluído com sucesso!",
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

  // Sincronizar com Stripe
  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/discount-codes/${id}/sync`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro na sincronização");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({
        title: "Sucesso",
        description: "Código sincronizado com Stripe!",
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
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      validFrom: new Date().toISOString().split('T')[0],
      isActive: true,
      paymentProvider: "stripe",
      stripeFirstTimeTransaction: false,
    });
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description,
      discountType: code.discountType,
      discountValue: code.discountValue,
      maxUses: code.maxUses,
      validFrom: code.validFrom.split('T')[0],
      validUntil: code.validUntil?.split('T')[0],
      applicablePlans: code.applicablePlans,
      isActive: code.isActive,
      paymentProvider: code.paymentProvider,
      stripeFirstTimeTransaction: false,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return formatCurrency(value);
  };

  const getSyncStatusBadge = (status: string, errorMessage?: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sincronizado</Badge>;
      case 'error':
        return <Badge variant="destructive" title={errorMessage}><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCodesCount = codes.filter(code => code.isActive).length;
  const stripeCodesCount = codes.filter(code => code.paymentProvider === 'stripe').length;
  const syncedCodesCount = codes.filter(code => code.syncStatus === 'synced').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Códigos de Desconto</h1>
          <p className="text-muted-foreground">
            Gerencie cupons de desconto e integrações com Stripe
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-discount-code">
              <Plus className="w-4 h-4 mr-2" />
              Novo Código
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Código de Desconto</DialogTitle>
              <DialogDescription>
                Adicione um novo código de desconto ao sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    data-testid="input-code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="DESCONTO10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentProvider">Provedor</Label>
                  <Select
                    value={formData.paymentProvider}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentProvider: value }))}
                  >
                    <SelectTrigger data-testid="select-payment-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  data-testid="textarea-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do desconto..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType">Tipo de Desconto</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: 'percentage' | 'fixed_amount') => 
                      setFormData(prev => ({ ...prev, discountType: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Valor {formData.discountType === 'percentage' ? '(%)' : '(R$)'}
                  </Label>
                  <Input
                    id="discountValue"
                    data-testid="input-discount-value"
                    type="number"
                    min="0"
                    max={formData.discountType === 'percentage' ? 100 : undefined}
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discountValue: formData.discountType === 'fixed_amount' 
                        ? Math.round(parseFloat(e.target.value) * 100)
                        : parseInt(e.target.value)
                    }))}
                    step={formData.discountType === 'fixed_amount' ? "0.01" : "1"}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Válido a partir de</Label>
                  <Input
                    id="validFrom"
                    data-testid="input-valid-from"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Válido até (opcional)</Label>
                  <Input
                    id="validUntil"
                    data-testid="input-valid-until"
                    type="date"
                    value={formData.validUntil || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value || undefined }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Máximo de usos (opcional)</Label>
                <Input
                  id="maxUses"
                  data-testid="input-max-uses"
                  type="number"
                  min="1"
                  value={formData.maxUses || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              {formData.paymentProvider === 'stripe' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">Configurações Stripe</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stripeMinimumAmount">Valor mínimo (R$) - opcional</Label>
                    <Input
                      id="stripeMinimumAmount"
                      data-testid="input-stripe-minimum"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.stripeMinimumAmount ? formData.stripeMinimumAmount / 100 : ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        stripeMinimumAmount: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined 
                      }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="stripeFirstTime"
                      data-testid="switch-stripe-first-time"
                      checked={formData.stripeFirstTimeTransaction}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, stripeFirstTimeTransaction: checked }))}
                    />
                    <Label htmlFor="stripeFirstTime">Apenas primeira transação do cliente</Label>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  data-testid="switch-is-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Código ativo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? "Criando..." : "Criar Código"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Códigos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-codes">{codes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Códigos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-active-codes">{activeCodesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrados Stripe</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-stripe-codes">{stripeCodesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="stat-synced-codes">{syncedCodesCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Buscar códigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sincronização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Carregando códigos de desconto...
                  </TableCell>
                </TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Nenhum código de desconto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((code) => (
                  <TableRow key={code.id} data-testid={`row-discount-code-${code.id}`}>
                    <TableCell className="font-medium">{code.code}</TableCell>
                    <TableCell className="max-w-xs truncate" title={code.description}>
                      {code.description}
                    </TableCell>
                    <TableCell>{formatDiscount(code.discountType, code.discountValue)}</TableCell>
                    <TableCell>
                      {code.currentUses}/{code.maxUses || '∞'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>De: {new Date(code.validFrom).toLocaleDateString('pt-BR')}</div>
                        {code.validUntil && (
                          <div>Até: {new Date(code.validUntil).toLocaleDateString('pt-BR')}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.paymentProvider === 'stripe' ? 'default' : 'secondary'}>
                        {code.paymentProvider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.isActive ? 'default' : 'secondary'}>
                        {code.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getSyncStatusBadge(code.syncStatus, code.syncErrorMessage)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {code.paymentProvider === 'stripe' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncMutation.mutate(code.id)}
                            disabled={syncMutation.isPending}
                            data-testid={`button-sync-${code.id}`}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(code)}
                          data-testid={`button-edit-${code.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este código de desconto?")) {
                              deleteMutation.mutate(code.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${code.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Código de Desconto</DialogTitle>
            <DialogDescription>
              Atualize as informações do código de desconto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Same form fields as create, but with edit context */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Código</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="DESCONTO10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-provider">Provedor</Label>
                <Select
                  value={formData.paymentProvider}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paymentProvider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="internal">Interno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-isActive">Código ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Atualizando..." : "Atualizar Código"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}