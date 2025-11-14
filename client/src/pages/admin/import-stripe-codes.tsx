import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ImportStripeCodesPage() {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{success: boolean, data: any}>({
    queryKey: ["/api/admin/discounts/fetch-from-stripe"],
  });

  const importMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const response = await fetch("/api/admin/discounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao importar códigos");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts/promotion-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts/fetch-from-stripe"] });
      setSelectedCodes([]);
      toast({
        title: "Sucesso!",
        description: `${data.data.summary.successful} código(s) importado(s) com sucesso!`,
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

  // Combinar cupons e promotion codes em uma lista única
  const stripeCoupons = data?.data?.coupons || [];
  const stripePromoCodes = data?.data?.promotionCodes || [];
  const stripeCodes = [...stripeCoupons, ...stripePromoCodes];

  const toggleCode = (codeId: string) => {
    setSelectedCodes(prev =>
      prev.includes(codeId) ? prev.filter(id => id !== codeId) : [...prev, codeId]
    );
  };

  const toggleAll = () => {
    if (selectedCodes.length === stripeCodes.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(stripeCodes.map((c: any) => c.id));
    }
  };

  const handleImport = () => {
    if (selectedCodes.length === 0) return;
    
    // Encontrar os objetos completos dos códigos selecionados
    const selectedItems = stripeCodes
      .filter((code: any) => selectedCodes.includes(code.id))
      .map((code: any) => ({
        ...code,
        type: code.code !== undefined ? 'promotion_code' : 'coupon'
      }));
    
    importMutation.mutate(selectedItems);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/discount-codes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Códigos do Stripe</h1>
          <p className="text-muted-foreground">
            Selecione os códigos promocionais que deseja importar para o MedSync
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Buscando códigos do Stripe...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-red-600">Erro ao buscar códigos do Stripe</p>
              <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente</p>
            </div>
          </CardContent>
        </Card>
      ) : stripeCodes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Nenhum código promocional encontrado no Stripe</p>
              <p className="text-sm text-muted-foreground">
                Crie códigos promocionais no Stripe Dashboard primeiro
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
                data-testid="button-toggle-all"
              >
                {selectedCodes.length === stripeCodes.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {selectedCodes.length} de {stripeCodes.length} selecionado(s)
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedCodes.length === 0 || importMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Importar {selectedCodes.length > 0 ? `(${selectedCodes.length})` : ''}
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-4">
            {stripeCodes.map((code: any) => {
              const isPromoCode = code.code !== undefined;
              const displayName = isPromoCode ? code.code : (code.name || code.id);
              const isActive = isPromoCode ? code.active : code.valid;
              
              // Extrair informações de desconto corretamente
              let discountInfo = '';
              if (isPromoCode) {
                // Promotion code: desconto vem do cupom vinculado
                const coupon = typeof code.coupon === 'object' ? code.coupon : null;
                if (coupon?.percent_off) {
                  discountInfo = `${coupon.percent_off}% de desconto`;
                } else if (coupon?.amount_off) {
                  discountInfo = `R$ ${(coupon.amount_off / 100).toFixed(2)} de desconto`;
                }
              } else {
                // Coupon direto
                if (code.percent_off) {
                  discountInfo = `${code.percent_off}% de desconto`;
                } else if (code.amount_off) {
                  discountInfo = `R$ ${(code.amount_off / 100).toFixed(2)} de desconto`;
                }
              }
              
              return (
                <Card
                  key={code.id}
                  className={`cursor-pointer transition-colors ${
                    selectedCodes.includes(code.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleCode(code.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedCodes.includes(code.id)}
                        onCheckedChange={() => toggleCode(code.id)}
                        className="mt-1"
                        data-testid={`checkbox-code-${code.id}`}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <code className="text-lg font-bold font-mono">{displayName}</code>
                          {isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                          {isPromoCode && (
                            <Badge variant="outline">Promotion Code</Badge>
                          )}
                          {!isPromoCode && (
                            <Badge variant="outline">Coupon</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {discountInfo && (
                            <p className="text-sm font-medium">
                              {discountInfo}
                            </p>
                          )}
                          
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {code.duration && (
                              <span>
                                <strong>Duração:</strong>{' '}
                                {code.duration === 'once'
                                  ? 'Uma vez'
                                  : code.duration === 'forever'
                                  ? 'Para sempre'
                                  : `${code.duration_in_months} meses`}
                              </span>
                            )}
                            
                            {code.max_redemptions && (
                              <span>
                                <strong>Limite:</strong> {code.max_redemptions} usos 
                                {code.times_redeemed !== undefined && ` (usados: ${code.times_redeemed})`}
                              </span>
                            )}
                            
                            {code.expires_at && (
                              <span>
                                <strong>Expira:</strong> {new Date(code.expires_at * 1000).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
