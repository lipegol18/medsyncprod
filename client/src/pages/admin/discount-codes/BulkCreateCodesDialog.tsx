import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBulkCreatePromotionCodes, useCoupons } from "@/hooks/admin/discounts";
import { Loader2, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BulkCreateCodesDialog() {
  const [open, setOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState("");
  const [prefix, setPrefix] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [maxRedemptions, setMaxRedemptions] = useState(1);

  const { data: coupons, isLoading: loadingCoupons } = useCoupons({ isActive: true });
  const bulkCreate = useBulkCreatePromotionCodes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCoupon || !prefix || quantity < 1) {
      return;
    }

    await bulkCreate.mutateAsync({
      couponName: selectedCoupon,
      prefix,
      quantity,
      maxRedemptions,
    });

    setOpen(false);
    setSelectedCoupon("");
    setPrefix("");
    setQuantity(10);
    setMaxRedemptions(1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-bulk-create">
          <Sparkles className="h-4 w-4 mr-2" />
          Criação em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Códigos em Lote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coupon">Cupom Base</Label>
            <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
              <SelectTrigger id="coupon" data-testid="select-coupon">
                <SelectValue placeholder="Selecione um cupom" />
              </SelectTrigger>
              <SelectContent>
                {loadingCoupons ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : coupons && coupons.length > 0 ? (
                  coupons.map((coupon) => (
                    <SelectItem key={coupon.id} value={coupon.name}>
                      {coupon.name} ({coupon.discountType === 'percent' ? `${coupon.percentOff}%` : `R$ ${(coupon.amountOffCents! / 100).toFixed(2)}`})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Nenhum cupom disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix">Prefixo dos Códigos</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="Ex: AMPLUS"
              data-testid="input-prefix"
              required
            />
            <p className="text-xs text-muted-foreground">
              Códigos serão gerados como: {prefix || "PREFIX"}XXXX (4 caracteres aleatórios)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade de Códigos</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              data-testid="input-quantity"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRedemptions">Utilizações por Código</Label>
            <Input
              id="maxRedemptions"
              type="number"
              min={1}
              max={1000}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(parseInt(e.target.value) || 1)}
              data-testid="input-max-redemptions"
              required
            />
            <p className="text-xs text-muted-foreground">
              Número de vezes que cada código pode ser usado (padrão: 1 = uso único)
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={bulkCreate.isPending || !selectedCoupon || !prefix}
              data-testid="button-submit"
            >
              {bulkCreate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>Criar {quantity} Código(s)</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
