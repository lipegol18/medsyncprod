import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ImportFromStripeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (codes: string[]) => void;
  isPending: boolean;
};

export function ImportFromStripeDialog({ open, onOpenChange, onImport, isPending }: ImportFromStripeDialogProps) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ["/api/admin/discount-codes/fetch-from-stripe"],
    enabled: open,
  });

  const stripeCodes = data?.data || [];

  const toggleCode = (codeId: string) => {
    setSelectedCodes(prev =>
      prev.includes(codeId) ? prev.filter(id => id !== codeId) : [...prev, codeId]
    );
  };

  const toggleAll = () => {
    setSelectedCodes(prev => prev.length === stripeCodes.length ? [] : stripeCodes.map((c: any) => c.id));
  };

  const handleImport = () => {
    onImport(selectedCodes);
    setSelectedCodes([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Códigos do Stripe</DialogTitle>
          <DialogDescription>
            Selecione os códigos promocionais do Stripe para importar
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Carregando códigos do Stripe...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">Erro ao buscar códigos</div>
        ) : stripeCodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum código encontrado no Stripe</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{stripeCodes.length} código(s) disponível(is)</p>
              <Button variant="outline" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                {selectedCodes.length === stripeCodes.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
            </div>

            <div className="border rounded-lg divide-y">
              {stripeCodes.map((code: any) => (
                <div key={code.id} className="p-4 flex items-start gap-4 hover:bg-muted/50 cursor-pointer" onClick={() => toggleCode(code.id)}>
                  <input type="checkbox" checked={selectedCodes.includes(code.id)} onChange={() => toggleCode(code.id)} className="mt-1" data-testid={`checkbox-code-${code.code}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{code.code}</span>
                      {code.active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {code.coupon.percent_off ? `${code.coupon.percent_off}% de desconto` : `R$ ${(code.coupon.amount_off! / 100).toFixed(2)} de desconto`}
                    </p>
                    {code.coupon.duration && (
                      <p className="text-xs text-muted-foreground">
                        Duração: {code.coupon.duration === 'once' ? 'Uma vez' : code.coupon.duration === 'forever' ? 'Para sempre' : `${code.coupon.duration_in_months} meses`}
                      </p>
                    )}
                    {code.max_redemptions && (
                      <p className="text-xs text-muted-foreground">Usos máximos: {code.max_redemptions} (usados: {code.times_redeemed})</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={selectedCodes.length === 0 || isPending} data-testid="button-confirm-import">
                {isPending ? "Importando..." : `Importar ${selectedCodes.length} código(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
