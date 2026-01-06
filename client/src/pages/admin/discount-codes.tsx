import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, Tag, CheckCircle, TrendingUp, Download } from "lucide-react";
import { useCoupons, usePromotionCodes } from "@/hooks/admin/discounts";
import { CouponsTab } from "./discount-codes/CouponsTab";
import { PromotionCodesTab } from "./discount-codes/PromotionCodesTab";
import { Link } from "wouter";

export default function AdminDiscountCodesPage() {
  const { data: coupons = [] } = useCoupons();
  const { data: codes = [] } = usePromotionCodes();

  const activeCoupons = coupons.filter(c => c.isActive).length;
  const activeCodes = codes.filter(c => c.isActive).length;
  const totalRedemptions = codes.reduce((sum, code) => sum + (code.timesRedeemed || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Descontos Stripe</h1>
          <p className="text-muted-foreground">
            Gerencie cupons e códigos promocionais com sincronização automática
          </p>
        </div>
        <Link href="/admin/import-stripe-codes">
          <Button variant="outline" data-testid="button-import-stripe">
            <Download className="w-4 h-4 mr-2" />
            Importar do Stripe
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupons Ativos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-active-coupons">
              {activeCoupons}
            </div>
            <p className="text-xs text-muted-foreground">
              de {coupons.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Códigos Ativos</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-active-codes">
              {activeCodes}
            </div>
            <p className="text-xs text-muted-foreground">
              de {codes.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Resgates</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-redemptions">
              {totalRedemptions}
            </div>
            <p className="text-xs text-muted-foreground">
              Códigos utilizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Uso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-usage-rate">
              {codes.length > 0 ? Math.round((totalRedemptions / codes.length) * 10) / 10 : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Resgates por código
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Cupons e Códigos */}
      <Tabs defaultValue="coupons" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="coupons" data-testid="tab-coupons">
            <DollarSign className="w-4 h-4 mr-2" />
            Cupons ({coupons.length})
          </TabsTrigger>
          <TabsTrigger value="codes" data-testid="tab-codes">
            <Tag className="w-4 h-4 mr-2" />
            Códigos ({codes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cupons Stripe</CardTitle>
              <CardDescription>
                Cupons definem o tipo de desconto (%, valor fixo) e a duração. 
                Crie códigos promocionais vinculados para distribuir aos clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CouponsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Códigos Promocionais</CardTitle>
              <CardDescription>
                Códigos digitáveis (ex: BLACKFRIDAY) vinculados a cupons existentes. 
                Você pode criar múltiplos códigos para o mesmo cupom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromotionCodesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
