import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCreateCoupon, CreateCouponData } from "@/hooks/admin/discounts";

export function CreateCouponDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCouponData>({
    name: "",
    description: "",
    discountType: "percent",
    percentOff: undefined,
    amountOffCents: undefined,
    duration: "once",
    durationInMonths: undefined,
    maxRedemptions: undefined,
    applicablePlans: [],
    metadata: {},
  });

  const createMutation = useCreateCoupon();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação: garantir que apenas um tipo de desconto está preenchido
    const cleanData: CreateCouponData = {
      ...formData,
      percentOff: formData.discountType === 'percent' ? formData.percentOff : undefined,
      amountOffCents: formData.discountType === 'amount' ? formData.amountOffCents : undefined,
    };

    createMutation.mutate(cleanData, {
      onSuccess: () => {
        setIsOpen(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      discountType: "percent",
      percentOff: undefined,
      amountOffCents: undefined,
      duration: "once",
      durationInMonths: undefined,
      maxRedemptions: undefined,
      applicablePlans: [],
      metadata: {},
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-coupon">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Cupom Stripe</DialogTitle>
          <DialogDescription>
            Configure o desconto (%, valor fixo, duração). Depois crie códigos promocionais vinculados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cupom</Label>
            <Input
              id="name"
              data-testid="input-coupon-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Desconto Lançamento 2024"
              required
            />
            <p className="text-xs text-muted-foreground">
              Nome exibido no Stripe Dashboard e faturas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              data-testid="textarea-coupon-description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição interna do cupom..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Tipo de Desconto</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: 'percent' | 'amount') => 
                  setFormData(prev => ({ 
                    ...prev, 
                    discountType: value,
                    percentOff: undefined,
                    amountOffCents: undefined,
                  }))
                }
              >
                <SelectTrigger data-testid="select-discount-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Porcentagem (%)</SelectItem>
                  <SelectItem value="amount">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                {formData.discountType === 'percent' ? 'Porcentagem (%)' : 'Valor (R$)'}
              </Label>
              <Input
                id="discountValue"
                data-testid="input-discount-value"
                type="number"
                min="0"
                max={formData.discountType === 'percent' ? 100 : undefined}
                step={formData.discountType === 'percent' ? "1" : "0.01"}
                value={
                  formData.discountType === 'percent' 
                    ? formData.percentOff || '' 
                    : formData.amountOffCents ? formData.amountOffCents / 100 : ''
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (formData.discountType === 'percent') {
                    setFormData(prev => ({ ...prev, percentOff: value || undefined }));
                  } else {
                    setFormData(prev => ({ ...prev, amountOffCents: Math.round(value * 100) || undefined }));
                  }
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração</Label>
              <Select
                value={formData.duration}
                onValueChange={(value: 'once' | 'repeating' | 'forever') => 
                  setFormData(prev => ({ 
                    ...prev, 
                    duration: value,
                    durationInMonths: value === 'repeating' ? 12 : undefined
                  }))
                }
              >
                <SelectTrigger data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Uma vez (primeira fatura)</SelectItem>
                  <SelectItem value="repeating">Recorrente (X meses)</SelectItem>
                  <SelectItem value="forever">Para sempre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.duration === 'repeating' && (
              <div className="space-y-2">
                <Label htmlFor="durationInMonths">Duração (meses)</Label>
                <Input
                  id="durationInMonths"
                  data-testid="input-duration-months"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.durationInMonths || 12}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    durationInMonths: parseInt(e.target.value) || 12
                  }))}
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRedemptions">Limite de Resgates (opcional)</Label>
            <Input
              id="maxRedemptions"
              data-testid="input-max-redemptions"
              type="number"
              min="1"
              value={formData.maxRedemptions || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxRedemptions: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              placeholder="Deixe vazio para ilimitado"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-coupon">
              {createMutation.isPending ? "Criando..." : "Criar Cupom"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
