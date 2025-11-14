import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Calendar, DollarSign, MoreVertical, Power, Trash2 } from "lucide-react";
import { useCoupons, useToggleCoupon, useDeleteCoupon } from "@/hooks/admin/discounts";
import { CreateCouponDialog } from "./CreateCouponDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CouponsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: coupons = [], isLoading } = useCoupons();
  const toggleMutation = useToggleCoupon();
  const deleteMutation = useDeleteCoupon();

  const formatDiscount = (coupon: any) => {
    if (coupon.discountType === 'percent') {
      return `${coupon.percentOff}% off`;
    }
    return `R$ ${(coupon.amountOffCents / 100).toFixed(2)} off`;
  };

  const formatDuration = (duration: string, durationInMonths?: number) => {
    if (duration === 'once') return 'Uma vez';
    if (duration === 'forever') return 'Para sempre';
    return `${durationInMonths || 12} meses`;
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coupon.description && coupon.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando cupons...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e botão criar */}
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-coupons"
          />
        </div>
        <CreateCouponDialog />
      </div>

      {/* Tabela de cupons */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Stripe ID</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {searchTerm ? 'Nenhum cupom encontrado' : 'Nenhum cupom criado. Clique em "Novo Cupom" para começar.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id} data-testid={`row-coupon-${coupon.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{coupon.name}</div>
                      {coupon.description && (
                        <div className="text-sm text-muted-foreground">{coupon.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {formatDiscount(coupon)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDuration(coupon.duration, coupon.durationInMonths)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {coupon.timesRedeemed} / {coupon.maxRedemptions || '∞'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(coupon.createdAt), "dd MMM yyyy", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {coupon.stripeCouponId}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`actions-coupon-${coupon.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate(coupon.id)}
                          disabled={toggleMutation.isPending}
                          data-testid={`toggle-coupon-${coupon.id}`}
                        >
                          <Power className="w-4 h-4 mr-2" />
                          {coupon.isActive ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                              data-testid={`delete-trigger-coupon-${coupon.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o cupom "{coupon.name}"? Esta ação não pode ser desfeita e também excluirá todos os códigos promocionais vinculados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(coupon.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`confirm-delete-coupon-${coupon.id}`}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
