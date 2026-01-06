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
import { Search, Tag, Calendar, DollarSign, MoreVertical, Power, Trash2 } from "lucide-react";
import { usePromotionCodes, useTogglePromotionCode, useDeletePromotionCode } from "@/hooks/admin/discounts";
import { CreatePromotionCodeDialog } from "./CreatePromotionCodeDialog";
import { BulkCreateCodesDialog } from "./BulkCreateCodesDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PromotionCodesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: codes = [], isLoading } = usePromotionCodes();
  const toggleMutation = useTogglePromotionCode();
  const deleteMutation = useDeletePromotionCode();

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando códigos...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e botão criar */}
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar códigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-promotion-codes"
          />
        </div>
        <div className="flex gap-2">
          <BulkCreateCodesDialog />
          <CreatePromotionCodeDialog />
        </div>
      </div>

      {/* Tabela de códigos promocionais */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cupom Vinculado</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Restrições</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stripe ID</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {searchTerm ? 'Nenhum código encontrado' : 'Nenhum código criado. Clique em "Novo Código" para começar.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCodes.map((code) => (
                <TableRow key={code.id} data-testid={`row-promotion-code-${code.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-600" />
                      <code className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {code.code}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    {code.coupon ? (
                      <div>
                        <div className="font-medium">{code.coupon.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {code.coupon.discountType === 'percent' 
                            ? `${code.coupon.percentOff}%` 
                            : `R$ ${(code.coupon.amountOffCents! / 100).toFixed(2)}`
                          } off
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {code.timesRedeemed} / {code.maxRedemptions || '∞'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {code.firstTimeTransaction && (
                        <Badge variant="outline" className="text-xs w-fit">
                          Só 1ª compra
                        </Badge>
                      )}
                      {code.minimumAmountCents && (
                        <div className="text-xs text-muted-foreground">
                          Mín: R$ {(code.minimumAmountCents / 100).toFixed(2)}
                        </div>
                      )}
                      {!code.firstTimeTransaction && !code.minimumAmountCents && (
                        <span className="text-xs text-muted-foreground">Nenhuma</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {code.expiresAt ? (
                      <div className="text-sm">
                        {format(new Date(code.expiresAt), "dd MMM yyyy HH:mm", { locale: ptBR })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem expiração</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {code.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {code.stripePromotionCodeId.substring(0, 16)}...
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`actions-code-${code.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate(code.id)}
                          disabled={toggleMutation.isPending}
                          data-testid={`toggle-code-${code.id}`}
                        >
                          <Power className="w-4 h-4 mr-2" />
                          {code.isActive ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                              data-testid={`delete-trigger-code-${code.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o código "{code.code}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(code.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`confirm-delete-code-${code.id}`}
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
