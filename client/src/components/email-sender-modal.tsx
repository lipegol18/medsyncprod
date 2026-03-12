import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Check,
  Plus,
  Trash2,
  Building2,
  Package,
  User as UserIcon,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type EmailRecipientType = "hospital" | "fornecedor" | "custom";

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  type: EmailRecipientType;
}

export interface EmailSenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Destinatários pré-populados (hospital, fornecedores, etc.) */
  initialRecipients: EmailRecipient[];

  /** Título do dialog (opcional) */
  title?: string;

  /** Descrição/subtítulo do dialog (opcional) */
  description?: string;

  /**
   * Função chamada para obter o PDF a enviar.
   * Deve retornar o conteúdo em base64 e o nome do ficheiro.
   */
  getPdf: () => Promise<{ base64: string; filename: string }>;

  /** Assunto do email (opcional) */
  subject?: string;

  /** Corpo do email pré-preenchido (opcional) */
  bodyText?: string;
}

// ─── Tipo interno (com campo `selected`) ──────────────────────────────────────

interface InternalRecipient extends EmailRecipient {
  selected: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64ToBlob(base64: string, mimeType = "application/pdf"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildMailtoLink(
  emails: string[],
  subject: string,
  body: string
): string {
  const to = emails.join(",");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function EmailSenderModal({
  open,
  onOpenChange,
  initialRecipients,
  title = "Enviar por Email",
  description,
  getPdf,
  subject = "Pedido Cirúrgico — MedSync",
  bodyText,
}: EmailSenderModalProps) {
  const { toast } = useToast();

  const [recipients, setRecipients] = useState<InternalRecipient[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState("select");

  // Sincroniza destinatários toda vez que o dialog abre
  useEffect(() => {
    if (open) {
      setRecipients(initialRecipients.map((r) => ({ ...r, selected: true })));
      setNewName("");
      setNewEmail("");
      setStep("select");
    }
  }, [open, initialRecipients]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const toggleRecipient = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const removeCustomRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const addCustomRecipient = () => {
    const emailTrimmed = newEmail.trim().toLowerCase();
    const nameTrimmed = newName.trim();

    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    if (recipients.some((r) => r.email.toLowerCase() === emailTrimmed)) {
      toast({ title: "Email já adicionado", variant: "destructive" });
      return;
    }

    setRecipients((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: nameTrimmed || emailTrimmed,
        email: emailTrimmed,
        type: "custom",
        selected: true,
      },
    ]);
    setNewName("");
    setNewEmail("");
  };

  const handleSend = async () => {
    const selected = recipients.filter((r) => r.selected);
    if (selected.length === 0) {
      toast({
        title: "Selecione pelo menos um destinatário",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Obter e baixar o PDF
      const { base64, filename } = await getPdf();
      const blob = base64ToBlob(base64);
      triggerDownload(blob, filename);

      // 2. Abrir o cliente de email do usuário via mailto
      const defaultBody =
        bodyText ||
        `Prezado(a),\n\nSegue em anexo o pedido cirúrgico gerado pela plataforma MedSync.\n\nPor favor, verifique o arquivo PDF anexado.\n\nAtenciosamente`;

      const mailtoLink = buildMailtoLink(
        selected.map((r) => r.email),
        subject,
        defaultBody
      );

      window.location.href = mailtoLink;

      // 3. Fechar modal directamente
      onOpenChange(false);
    } catch (err: any) {
      console.error("[EmailSenderModal]", err);
      toast({
        title: "Erro ao gerar o PDF",
        description: err?.message || "Tente gerar o PDF primeiro.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = recipients.filter((r) => r.selected).length;

  const typeLabel: Record<EmailRecipientType, string> = {
    hospital: "Hospital",
    fornecedor: "Fornecedor",
    custom: "Outro",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-medsync-blue" />
            {title}
          </DialogTitle>
          {description && step === "select" && (
            <DialogDescription dangerouslySetInnerHTML={{ __html: description }} />
          )}
        </DialogHeader>

        {/* ── Passo 1: Selecionar destinatários ── */}
        {step === "select" && (
          <div className="space-y-4 py-2">
            {recipients.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                Nenhum email pré-cadastrado. Adicione um destinatário abaixo.
              </div>
            )}

            {recipients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Destinatários
                </p>
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      recipient.selected
                        ? "border-medsync-blue/50 bg-medsync-blue/5"
                        : "border-border bg-muted/20"
                    }`}
                    onClick={() => toggleRecipient(recipient.id)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        recipient.selected
                          ? "bg-medsync-blue border-medsync-blue"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {recipient.selected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {recipient.type === "hospital" && (
                        <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      {recipient.type === "fornecedor" && (
                        <Package className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      {recipient.type === "custom" && (
                        <UserIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {recipient.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {recipient.email}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {typeLabel[recipient.type]}
                    </span>

                    {recipient.type === "custom" && (
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomRecipient(recipient.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Adicionar outro destinatário
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nome"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomRecipient()}
                  className="flex-1 h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCustomRecipient}
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Nota explicativa sobre o fluxo */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                O seu programa de email será aberto com os destinatários, assunto e corpo já preenchidos — incluindo o link para o destinatário aceder directamente ao PDF do pedido.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isLoading || selectedCount === 0}
            className="bg-medsync-blue hover:bg-medsync-blue-dark text-white gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Abrir email com {selectedCount} destinatário{selectedCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
