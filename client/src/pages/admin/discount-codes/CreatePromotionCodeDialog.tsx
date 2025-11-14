import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useCreatePromotionCode, useCoupons, CreatePromotionCodeData } from "@/hooks/admin/discounts";

export function CreatePromotionCodeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreatePromotionCodeData>({
    code: "",
    couponId: 0,
    maxRedemptions: undefined,
    expiresAt: undefined,
    firstTimeTransaction: false,
    minimumAmountCents: undefined,
    metadata: {},
    notes: "",
  });

  const createMutation = useCreatePromotionCode();
  const { data: coupons = [], isLoading: isLoadingCoupons } = useCoupons({ isActive: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.couponId) {
      return; // Select deve validar
    }

    // Buscar o cupom selecionado para pegar o stripeCouponId
    const selectedCoupon = coupons.find(c => c.id === formData.couponId);
    if (!selectedCoupon) {
      return;
    }

    // Enviar com stripeCouponId ao invés de couponId
    const payload = {
      ...formData,
      stripeCouponId: selectedCoupon.stripeCouponId,
      couponId: undefined, // Remover couponId
    };

    createMutation.mutate(payload as any, {
      onSuccess: () => {
        setIsOpen(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setFormData({
      code: "",
      couponId: 0,
      maxRedemptions: undefined,
      expiresAt: undefined,
      firstTimeTransaction: false,
      minimumAmountCents: undefined,
      metadata: {},
      notes: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-promotion-code">
          <Plus className="w-4 h-4 mr-2" />
          Novo Código
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Código Promocional</DialogTitle>
          <DialogDescription>
            Crie um código digitável (ex: BLACKFRIDAY) vinculado a um cupom existente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              data-testid="input-promotion-code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="BLACKFRIDAY2024"
              required
            />
            <p className="text-xs text-muted-foreground">
              Código que o cliente digitará no checkout
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="couponId">Cupom Vinculado *</Label>
            <Select
              value={formData.couponId ? String(formData.couponId) : ""}
              onValueChange={(value) => setFormData(prev => ({ ...prev, couponId: parseInt(value) }))}
              required
            >
              <SelectTrigger data-testid="select-coupon">
                <SelectValue placeholder={isLoadingCoupons ? "Carregando..." : "Selecione um cupom"} />
              </SelectTrigger>
              <SelectContent>
                {coupons.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    Nenhum cupom ativo. Crie um cupom primeiro.
                  </div>
                )}
                {coupons.map((coupon) => (
                  <SelectItem key={coupon.id} value={String(coupon.id)}>
                    {coupon.name} ({coupon.discountType === 'percent' ? `${coupon.percentOff}%` : `R$ ${(coupon.amountOffCents! / 100).toFixed(2)}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxRedemptions">Limite de Usos (opcional)</Label>
              <Input
                id="maxRedemptions"
                data-testid="input-max-redemptions-promo"
                type="number"
                min="1"
                value={formData.maxRedemptions || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxRedemptions: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="Ilimitado"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expira em (opcional)</Label>
              <Input
                id="expiresAt"
                data-testid="input-expires-at"
                type="datetime-local"
                value={formData.expiresAt || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  expiresAt: e.target.value || undefined
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumAmount">Valor Mínimo (R$) - opcional</Label>
            <Input
              id="minimumAmount"
              data-testid="input-minimum-amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.minimumAmountCents ? formData.minimumAmountCents / 100 : ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                minimumAmountCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined 
              }))}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Pedido mínimo para usar este código
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="firstTime"
              data-testid="switch-first-time"
              checked={formData.firstTimeTransaction}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, firstTimeTransaction: checked }))}
            />
            <div>
              <Label htmlFor="firstTime">Apenas primeira transação do cliente</Label>
              <p className="text-xs text-muted-foreground">
                Código válido somente para novos clientes
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input
              id="notes"
              data-testid="input-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ex: Campanha Black Friday 2024"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || coupons.length === 0}
              data-testid="button-submit-promotion-code"
            >
              {createMutation.isPending ? "Criando..." : "Criar Código"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
