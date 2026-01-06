import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, IdCard, AlertTriangle, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import medSyncLogo from '@/assets/medsync-logo-new.svg';

interface CrmRequiredModalProps {
  isOpen: boolean;
  userId: number;
  onSuccess: () => void;
}

export function CrmRequiredModal({ isOpen, userId, onSuccess }: CrmRequiredModalProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClearPreview = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('crm', selectedFile);

      const response = await fetch(`/api/users/${userId}/crm`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao fazer upload do cartão CRM");
      }

      const result = await response.json();

      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, crmUrl: result.url };
        }
        return oldData;
      });

      toast({
        title: "Cartão CRM enviado!",
        description: "Seu cartão CRM foi cadastrado com sucesso",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o cartão CRM",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px] bg-white border-none p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#2ca8e0] to-[#36a9e1] p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <img 
              src={medSyncLogo} 
              alt="MedSync" 
              className="h-10 brightness-0 invert"
            />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center text-white flex items-center justify-center gap-2">
              <IdCard className="h-6 w-6" />
              Cadastro do Cartão CRM
            </DialogTitle>
            <DialogDescription className="text-white/90 text-center mt-2">
              Para continuar usando o MedSync, precisamos da foto do seu cartão CRM.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Por que precisamos do seu cartão CRM?</p>
              <p className="mt-1 text-amber-700">
                Utilizamos o cartão CRM para validar suas credenciais médicas e garantir a segurança 
                das informações dos pacientes no sistema.
              </p>
            </div>
          </div>

          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative bg-slate-50 rounded-lg p-4 border border-slate-200">
                <button
                  onClick={handleClearPreview}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-slate-100"
                  data-testid="button-clear-crm-preview"
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>
                <img 
                  src={previewUrl} 
                  alt="Preview do cartão CRM" 
                  className="max-w-full max-h-48 object-contain mx-auto rounded"
                />
              </div>
              <p className="text-sm text-slate-600 text-center">
                {selectedFile?.name}
              </p>
            </div>
          ) : (
            <div
              className={`flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                isDragOver 
                  ? 'border-[#2ca8e0] bg-[#2ca8e0]/5' 
                  : 'border-slate-300 hover:border-[#2ca8e0]/50 hover:bg-slate-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('crm-modal-upload')?.click()}
            >
              <ImageIcon className={`w-12 h-12 mb-3 ${isDragOver ? 'text-[#2ca8e0]' : 'text-slate-400'}`} />
              <p className={`text-sm font-medium mb-1 ${isDragOver ? 'text-[#2ca8e0]' : 'text-slate-700'}`}>
                {isDragOver ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique para selecionar'}
              </p>
              <p className="text-xs text-slate-500">
                JPG, PNG ou GIF • Máximo 5MB
              </p>
              <input
                id="crm-modal-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-crm-file"
              />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full text-white font-bold py-3"
            style={{ 
              background: selectedFile && !isUploading 
                ? 'linear-gradient(135deg, #2ca8e0 0%, #36a9e1 100%)' 
                : undefined
            }}
            data-testid="button-upload-crm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Enviar Cartão CRM
              </>
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            🔒 Seus dados são protegidos e utilizados apenas para validação
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
