import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ConsentDialog = () => {
  const { user, acceptConsentMutation } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (user && !user.consentAccepted) {
      console.log("Mostrando diálogo de consentimento para o usuário:", user.username);
      console.log("Status do consentimento:", user.consentAccepted);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [user]);

  const handleAccept = async () => {
    if (!confirmed) return;
    
    try {
      await acceptConsentMutation.mutateAsync();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao aceitar termo:", error);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Não permite fechar o diálogo sem aceitar o termo
        if (!user?.consentAccepted) {
          return;
        }
        setOpen(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[600px] bg-card border-border" onEscapeKeyDown={(e) => {
        // Bloqueia o fechamento com ESC se não aceitou o termo
        if (!user?.consentAccepted) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground font-proxima-semibold">
            Termo de Consentimento para Tratamento de Dados Pessoais
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Por favor, leia atentamente os termos abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[400px] overflow-y-auto text-sm space-y-4 my-4 p-4 border-border border rounded-md bg-secondary/20">
          <p className="font-medium text-foreground font-proxima-semibold">1. INTRODUÇÃO</p>
          <p className="text-foreground">
            Este Termo de Consentimento descreve como seus dados pessoais serão tratados ao utilizar o sistema MedSync.
            Ao aceitar este termo, você concorda com a coleta, uso, armazenamento e compartilhamento dos seus dados 
            pessoais conforme descrito aqui.
          </p>
          
          <p className="font-medium text-foreground font-proxima-semibold">2. DADOS COLETADOS</p>
          <p className="text-foreground">
            Coletamos dados necessários para o funcionamento do sistema, incluindo, mas não limitado a:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-foreground">
            <li>Dados de identificação (nome, e-mail, etc.)</li>
            <li>Dados profissionais (CRM)</li>
            <li>Dados de acesso e utilização do sistema</li>
          </ul>
          
          <p className="font-medium text-foreground font-proxima-semibold">3. FINALIDADE DO TRATAMENTO</p>
          <p className="text-foreground">
            Seus dados serão utilizados para:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-foreground">
            <li>Viabilizar o acesso e uso correto do sistema</li>
            <li>Processar solicitações de autorização médica</li>
            <li>Melhorar nossos serviços</li>
            <li>Cumprir obrigações legais</li>
            <li>Enviar comunicações relevantes sobre o serviço</li>
          </ul>
          
          <p className="font-medium text-foreground font-proxima-semibold">4. COMPARTILHAMENTO DE DADOS</p>
          <p className="text-foreground">
            Seus dados podem ser compartilhados com:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-foreground">
            <li>Hospitais e instituições de saúde envolvidas no processo</li>
            <li>Fornecedores de serviços essenciais ao funcionamento do sistema</li>
            <li>Autoridades quando exigido por lei</li>
          </ul>
          
          <p className="font-medium text-foreground font-proxima-semibold">5. SEUS DIREITOS</p>
          <p className="text-foreground">
            Você tem direito a:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-foreground">
            <li>Acessar seus dados</li>
            <li>Corrigir dados incompletos ou incorretos</li>
            <li>Solicitar a exclusão de seus dados (quando aplicável)</li>
            <li>Revogar seu consentimento</li>
          </ul>
          
          <p className="font-medium text-foreground font-proxima-semibold">6. SEGURANÇA DOS DADOS</p>
          <p className="text-foreground">
            Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados pessoais
            contra acesso não autorizado, perda ou destruição acidental.
          </p>
          
          <p className="font-medium text-foreground font-proxima-semibold">7. ALTERAÇÕES NO TERMO</p>
          <p className="text-foreground">
            Este Termo pode ser atualizado periodicamente. Você será notificado sobre alterações significativas
            e poderá ser solicitado a fornecer um novo consentimento.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 my-2">
          <Checkbox 
            id="confirm-consent" 
            checked={confirmed} 
            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            className="border-[hsl(var(--medsync-blue))] data-[state=checked]:bg-white data-[state=checked]:border-[hsl(var(--medsync-blue))] data-[state=checked]:text-[hsl(var(--medsync-blue))]"
          />
          <Label htmlFor="confirm-consent" className="text-foreground cursor-pointer">
            Eu li e aceito os termos de consentimento para tratamento dos meus dados pessoais
          </Label>
        </div>
        
        <DialogFooter className="mt-4">
          <Button 
            onClick={handleAccept}
            disabled={!confirmed || acceptConsentMutation.isPending}
            className="bg-[hsl(var(--medsync-blue))] hover:bg-[hsl(var(--medsync-dark-blue))] text-white font-proxima-semibold"
          >
            {acceptConsentMutation.isPending ? "Processando..." : "Aceitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentDialog;