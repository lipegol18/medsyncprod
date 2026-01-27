import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, StickyNote, Loader2, FileText, Download, Undo2, CalendarDays } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StatusHistoryRecord {
  id: number;
  orderId: number;
  statusId: number | null;
  statusCode: string | null;
  statusName: string | null;
  statusColor: string | null;
  changedBy: number | null;
  changedByName: string | null;
  changedAt: string;
  notes: string | null;
  deadlineDate: string | null;
  recordType: string;
}

interface OrderHistoryTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
}

const getStatusDotColor = (statusCode: string | null): string => {
  if (!statusCode) return 'bg-gray-400';
  const colors: Record<string, string> = {
    'em_preenchimento': 'bg-gray-400',
    'aguardando_envio': 'bg-orange-400',
    'em_avaliacao': 'bg-yellow-400',
    'aceito': 'bg-green-500',
    'autorizado_parcial': 'bg-green-400',
    'pendencia': 'bg-red-400',
    'aguardando_recurso': 'bg-red-500',
    'cirurgia_realizada': 'bg-blue-500',
    'recebido': 'bg-purple-500',
    'cancelado': 'bg-gray-500',
    'autorizacao_pos': 'bg-green-500',
  };
  return colors[statusCode] || 'bg-gray-400';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getActionDescription = (record: StatusHistoryRecord): string => {
  if (record.recordType === 'note') {
    return '';
  }
  
  const descriptions: Record<string, string> = {
    'em_preenchimento': 'Pedido criado',
    'aguardando_envio': 'Pedido pronto para envio',
    'em_avaliacao': 'Enviado para análise da operadora',
    'aceito': 'Autorizado integralmente',
    'autorizado_parcial': 'Autorizado parcialmente',
    'pendencia': 'Pendência solicitada',
    'aguardando_recurso': 'Recurso enviado',
    'cirurgia_realizada': 'Cirurgia realizada',
    'recebido': 'Valores recebidos',
    'cancelado': 'Pedido cancelado',
    'autorizacao_pos': 'Autorização pós-cirurgia',
  };
  
  if (record.notes && record.notes.includes('Status desfeito')) {
    return 'Status revertido';
  }
  
  return descriptions[record.statusCode || ''] || 'Status alterado';
};

export function OrderHistoryTimeline({ isOpen, onClose, orderId }: OrderHistoryTimelineProps) {
  const [newNote, setNewNote] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: history, isLoading } = useQuery<StatusHistoryRecord[]>({
    queryKey: [`/api/medical-orders/${orderId}/status-history`],
    enabled: isOpen && orderId > 0,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (notes: string) => {
      return await apiRequest(`/api/medical-orders/${orderId}/notes`, "POST", { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}/status-history`] });
      setNewNote("");
      setShowNoteForm(false);
      toast({
        title: "Nota adicionada",
        description: "Sua nota foi registrada no histórico do pedido.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar nota",
        description: error.message || "Não foi possível salvar a nota. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  const reversedHistory = history ? [...history].reverse() : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex flex-col gap-3">
            <DialogTitle className="text-lg font-semibold">
              Histórico da Solicitação
            </DialogTitle>
            <Button
              size="sm"
              className="bg-medsync-blue hover:bg-medsync-blue-dark text-white font-semibold w-fit"
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Adicionar Nota
            </Button>
          </div>
        </DialogHeader>

        {showNoteForm && (
          <div className="px-6 py-4 border-b bg-blue-50/50 dark:bg-blue-900/10">
            <div className="space-y-3">
              <Textarea
                placeholder="Digite sua nota aqui... (ex: Cirurgia reagendada por conflito de agenda)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
                  onClick={() => {
                    setShowNoteForm(false);
                    setNewNote("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-medsync-blue hover:bg-medsync-blue-dark text-white font-semibold"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Nota"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6">
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-medsync-blue data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Histórico da Solicitação
            </TabsTrigger>
            <TabsTrigger 
              value="changes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-medsync-blue data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Histórico de Alterações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="m-0 p-6 overflow-y-auto max-h-[calc(80vh-220px)]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : reversedHistory && reversedHistory.length > 0 ? (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gray-200 dark:bg-gray-700" />
                
                <div className="space-y-6">
                  {reversedHistory.map((record) => (
                    <div key={record.id} className="relative flex gap-4">
                      {record.recordType === 'note' ? (
                        <div className="relative z-10 h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-900/30 ring-4 ring-background flex items-center justify-center">
                          <StickyNote className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                        </div>
                      ) : record.recordType === 'pdf_version' ? (
                        <div className="relative z-10 h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/30 ring-4 ring-background flex items-center justify-center">
                          <FileText className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : record.recordType === 'appeal_pdf_version' ? (
                        <div className="relative z-10 h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-900/30 ring-4 ring-background flex items-center justify-center">
                          <FileText className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                        </div>
                      ) : record.recordType === 'status_undo' ? (
                        <div className="relative z-10 h-4 w-4 rounded-full bg-orange-100 dark:bg-orange-900/30 ring-4 ring-background flex items-center justify-center">
                          <Undo2 className="h-2.5 w-2.5 text-orange-600 dark:text-orange-400" />
                        </div>
                      ) : record.recordType === 'scheduling' ? (
                        <div className="relative z-10 h-4 w-4 rounded-full bg-sky-100 dark:bg-sky-900/30 ring-4 ring-background flex items-center justify-center">
                          <CalendarDays className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" />
                        </div>
                      ) : (
                        <div className={`relative z-10 h-4 w-4 rounded-full ${getStatusDotColor(record.statusCode)} ring-4 ring-background`} />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {record.recordType === 'note' ? (
                              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                    Nota
                                  </span>
                                  {record.changedByName && (
                                    <span className="text-xs text-muted-foreground">
                                      por {record.changedByName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground">{record.notes}</p>
                              </div>
                            ) : record.recordType === 'pdf_version' ? (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                    Nova Versão
                                  </span>
                                  {record.changedByName && (
                                    <span className="text-xs text-muted-foreground">
                                      por {record.changedByName}
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const notes = record.notes || '';
                                  const versionMatch = notes.match(/\(v(\d+)\)/);
                                  const fileMatch = notes.match(/Arquivo: (.+\.pdf)/);
                                  const version = versionMatch ? versionMatch[1] : '?';
                                  const fileName = fileMatch ? fileMatch[1] : null;
                                  const filePath = fileName ? `/uploads/orders/${orderId}/documentos/${fileName}` : null;
                                  
                                  return (
                                    <div className="text-sm text-foreground">
                                      <span>Nova versão do pedido gerada (v{version})</span>
                                      {filePath && (
                                        <a
                                          href={filePath}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 mt-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                        >
                                          <Download className="h-3 w-3" />
                                          <span>{fileName}</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : record.recordType === 'appeal_pdf_version' ? (
                              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                    Recurso
                                  </span>
                                  {record.changedByName && (
                                    <span className="text-xs text-muted-foreground">
                                      por {record.changedByName}
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const notes = record.notes || '';
                                  const versionMatch = notes.match(/\(v(\d+)\)/);
                                  const fileMatch = notes.match(/Arquivo: (.+\.pdf)/);
                                  const version = versionMatch ? versionMatch[1] : '?';
                                  const fileName = fileMatch ? fileMatch[1] : null;
                                  const filePath = fileName ? `/uploads/orders/${orderId}/documentos/${fileName}` : null;
                                  
                                  return (
                                    <div className="text-sm text-foreground">
                                      <span>Recurso de glosa gerado (v{version})</span>
                                      {filePath && (
                                        <a
                                          href={filePath}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 mt-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline"
                                        >
                                          <Download className="h-3 w-3" />
                                          <span>{fileName}</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : record.recordType === 'status_undo' ? (
                              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                                    Desfeito
                                  </span>
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: record.statusColor || '#6B7280' }}
                                  >
                                    {record.statusName}
                                  </span>
                                  {record.changedByName && (
                                    <span className="text-xs text-muted-foreground">
                                      por {record.changedByName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground">{record.notes}</p>
                              </div>
                            ) : record.recordType === 'scheduling' ? (
                              <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                                    Agendamento
                                  </span>
                                  {record.changedByName && (
                                    <span className="text-xs text-muted-foreground">
                                      por {record.changedByName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground">{record.notes}</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: record.statusColor || '#6B7280' }}
                                  >
                                    {record.statusName}
                                  </span>
                                  <span className="text-sm text-foreground">
                                    {getActionDescription(record)}
                                    {record.changedByName && (
                                      <span className="text-muted-foreground"> por {record.changedByName}</span>
                                    )}
                                  </span>
                                </div>
                                
                                {record.notes && !record.notes.includes('Status alterado de') && (
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    <span className="text-amber-600 dark:text-amber-400">Observação: </span>
                                    {record.notes}
                                  </div>
                                )}
                                
                                {record.deadlineDate && (
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    <span className="text-blue-600 dark:text-blue-400">Prazo: </span>
                                    {formatDate(record.deadlineDate)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(record.changedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhum histórico disponível para este pedido.
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes" className="m-0 p-6 overflow-y-auto max-h-[calc(80vh-220px)]">
            <div className="text-center text-muted-foreground py-8">
              Histórico de alterações em campos será implementado em breve.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
