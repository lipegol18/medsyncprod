import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, Download, AlertTriangle, Package, Stethoscope, Upload, X, FileText, Image as ImageIcon, ChevronDown, ChevronUp, Paperclip, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AppealPreview } from "@/components/appeal-preview";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import RoboMedSyncIcon from "@/assets/icons/MedSync_Icones_Robo Medsync_Sem_Borda.svg";
import { RichTextEditor } from "@/components/rich-text-editor";
import { calculateAge } from "@/lib/utils";

interface AppealAttachment {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'pdf';
  size?: number;
  uploadedAt?: string;
  file?: File; // Arquivo local antes de enviar ao servidor
  uploaded?: boolean; // Se já foi enviado ao servidor
  isDocumentRatio?: boolean; // Se a proporção é similar a um documento A4
}

// Função helper para calcular se a imagem tem proporção de documento (A4)
// A4 tem proporção de ~0.707 (210mm / 297mm)
// Consideramos documento se a proporção estiver entre 0.6 e 0.85
const calculateIsDocumentRatio = (width: number, height: number): boolean => {
  const aspectRatio = Math.min(width, height) / Math.max(width, height);
  return aspectRatio >= 0.6 && aspectRatio <= 0.85;
};

// Função para obter dimensões de uma imagem
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
};

interface DeniedItem {
  id: number;
  type: 'cbhpm' | 'opme';
  code: string;
  name: string;
  quantityRequested: number;
  quantityApproved: number | null;
  status: string;
}

interface AppealGeneratorProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user?: {
    name?: string;
    crm?: string;
    logoUrl?: string;
    signatureUrl?: string;
    signatureNote?: string;
  };
}

export function AppealGenerator({ 
  orderId, 
  isOpen, 
  onClose, 
  onSuccess,
  user 
}: AppealGeneratorProps) {
  const { toast } = useToast();
  
  const [appealStep, setAppealStep] = useState<number>(1);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [appealJustification, setAppealJustification] = useState<string>("");
  const [isGeneratingAppealAI, setIsGeneratingAppealAI] = useState<boolean>(false);
  const [appealOrderData, setAppealOrderData] = useState<any>(null);
  const [isLoadingAppealOrder, setIsLoadingAppealOrder] = useState<boolean>(false);
  const [isCreatingAppeal, setIsCreatingAppeal] = useState<boolean>(false);
  const [generatedAppealPdfUrl, setGeneratedAppealPdfUrl] = useState<string>("");
  const [isFinalizingAppeal, setIsFinalizingAppeal] = useState<boolean>(false);
  const [isLoadingDeniedItems, setIsLoadingDeniedItems] = useState<boolean>(false);
  const [deniedItems, setDeniedItems] = useState<DeniedItem[]>([]);
  const [appealAttachments, setAppealAttachments] = useState<AppealAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [showAttachmentSection, setShowAttachmentSection] = useState<boolean>(false);
  const [selectedDeniedItemIds, setSelectedDeniedItemIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados do pedido quando o modal abrir
  useEffect(() => {
    if (isOpen && orderId) {
      loadDeniedItems();
    }
  }, [isOpen, orderId]);

  // Carregar itens negados/glosados do pedido
  const loadDeniedItems = async () => {
    if (!orderId) return;
    
    try {
      setIsLoadingDeniedItems(true);
      
      // Buscar dados do pedido, procedimentos e itens OPME em paralelo
      const [orderResponse, proceduresResponse, opmeResponse] = await Promise.all([
        fetch(`/api/medical-orders/${orderId}`),
        fetch(`/api/medical-orders/${orderId}/procedures`),
        fetch(`/api/medical-orders/${orderId}/opme-items`)
      ]);
      
      if (!orderResponse.ok) {
        throw new Error('Erro ao buscar dados do pedido');
      }
      
      const orderData = await orderResponse.json();
      setAppealOrderData(orderData);
      
      // Extrair itens negados ou com glosa parcial
      const items: DeniedItem[] = [];
      
      // Procedimentos CBHPM negados ou com glosa
      if (proceduresResponse.ok) {
        const procedures = await proceduresResponse.json();
        if (Array.isArray(procedures)) {
          procedures.forEach((proc: any) => {
            const isPartiallyApproved = proc.quantityApproved !== null && 
              proc.quantityApproved < proc.quantityRequested;
            const isDenied = proc.status === 'negado' || proc.quantityApproved === 0;
            
            if (isDenied || isPartiallyApproved) {
              items.push({
                id: proc.id,
                type: 'cbhpm',
                code: proc.code || proc.procedureId?.toString() || '',
                name: proc.procedureName || proc.name || 'Procedimento CBHPM',
                quantityRequested: proc.quantityRequested || 1,
                quantityApproved: proc.quantityApproved,
                status: isDenied ? 'negado' : 'parcial',
              });
            }
          });
        }
      }
      
      // Itens OPME negados ou com glosa
      if (opmeResponse.ok) {
        const opmeItems = await opmeResponse.json();
        if (Array.isArray(opmeItems)) {
          opmeItems.forEach((item: any) => {
            const isPartiallyApproved = item.quantityApproved !== null && 
              item.quantityApproved < item.quantity;
            const isDenied = item.status === 'negado' || item.quantityApproved === 0;
            
            if (isDenied || isPartiallyApproved) {
              // A API retorna estrutura aninhada: opmeItem.technicalName, opmeItem.commercialName
              const opmeItemData = item.opmeItem || {};
              items.push({
                id: item.id,
                type: 'opme',
                code: opmeItemData.anvisaRegistrationNumber || item.opmeItemId?.toString() || '',
                name: opmeItemData.technicalName || opmeItemData.commercialName || 'Item OPME',
                quantityRequested: item.quantity || 1,
                quantityApproved: item.quantityApproved,
                status: isDenied ? 'negado' : 'parcial',
              });
            }
          });
        }
      }
      
      console.log('Itens negados encontrados:', items);
      setDeniedItems(items);
      // Auto-selecionar todos os itens negados por padrão
      const allIds = new Set(items.map(item => `${item.type}-${item.id}`));
      setSelectedDeniedItemIds(allIds);
    } catch (error) {
      console.error("Erro ao carregar itens negados:", error);
    } finally {
      setIsLoadingDeniedItems(false);
    }
  };

  // Funções de manipulação de arquivos
  const acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFilesAdd(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Adicionar arquivos localmente (sem upload imediato)
  const handleFilesAdd = async (files: File[]) => {
    const newAttachments: AppealAttachment[] = [];
    
    for (const file of files) {
      if (!acceptedFileTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: `${file.name} não é um tipo de arquivo aceito (JPG, PNG, GIF ou PDF)`,
          variant: "destructive",
        });
        continue;
      }
      
      if (file.size > maxFileSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB`,
          variant: "destructive",
        });
        continue;
      }

      const isImage = file.type.startsWith('image/');
      
      // Calcular proporção para imagens
      let isDocumentRatio = false;
      if (isImage) {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width > 0 && dimensions.height > 0) {
          isDocumentRatio = calculateIsDocumentRatio(dimensions.width, dimensions.height);
          console.log(`📐 Imagem "${file.name}": ${dimensions.width}x${dimensions.height}, proporção documento: ${isDocumentRatio}`);
        }
      }
      
      newAttachments.push({
        id: Math.random().toString(36).substr(2, 9),
        filename: file.name,
        url: URL.createObjectURL(file), // Preview local temporário
        type: isImage ? 'image' : 'pdf',
        size: file.size,
        file: file, // Guardar o arquivo para upload posterior
        uploaded: false,
        isDocumentRatio,
      });
    }

    if (newAttachments.length > 0) {
      setAppealAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // Fazer upload dos anexos pendentes para o servidor
  const uploadPendingAttachments = async (): Promise<boolean> => {
    if (!orderId) return false;
    
    const pendingAttachments = appealAttachments.filter(att => !att.uploaded && att.file);
    if (pendingAttachments.length === 0) return true;
    
    setIsUploadingAttachment(true);
    let allSuccess = true;
    
    const updatedAttachments = [...appealAttachments];
    
    for (const attachment of pendingAttachments) {
      if (!attachment.file) continue;
      
      try {
        const formData = new FormData();
        formData.append('file', attachment.file);
        
        const response = await fetch(`/api/upload-attachment/${orderId}`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Erro no upload');
        }
        
        const result = await response.json();
        
        // Atualizar o anexo com a URL do servidor
        const index = updatedAttachments.findIndex(a => a.id === attachment.id);
        if (index !== -1) {
          // Revogar URL temporária
          if (updatedAttachments[index].url.startsWith('blob:')) {
            URL.revokeObjectURL(updatedAttachments[index].url);
          }
          updatedAttachments[index] = {
            ...updatedAttachments[index],
            url: result.url,
            uploaded: true,
            file: undefined, // Limpar referência ao arquivo
            uploadedAt: new Date().toISOString(),
          };
        }
        
        console.log(`📤 Anexo do recurso enviado: ${attachment.filename} -> ${result.url}`);
      } catch (error) {
        console.error(`Erro no upload de ${attachment.filename}:`, error);
        allSuccess = false;
      }
    }
    
    setAppealAttachments(updatedAttachments);
    setIsUploadingAttachment(false);
    
    if (!allSuccess) {
      toast({
        title: "Erro parcial no upload",
        description: "Alguns arquivos não puderam ser enviados",
        variant: "destructive",
      });
    }
    
    return allSuccess;
  };

  const removeAttachment = (index: number) => {
    setAppealAttachments(prev => {
      const newAttachments = [...prev];
      // Revogar URL temporária se for blob
      if (newAttachments[index]?.url.startsWith('blob:')) {
        URL.revokeObjectURL(newAttachments[index].url);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const resetState = () => {
    setAppealStep(1);
    setRejectionReason("");
    setAppealJustification("");
    setAppealOrderData(null);
    setGeneratedAppealPdfUrl("");
    setDeniedItems([]);
    setSelectedDeniedItemIds(new Set());
    setAppealAttachments([]);
  };

  const handleClose = async () => {
    // Se o PDF já foi gerado (step 4), atualizar o status para "Aguardando Recurso" antes de fechar
    if (appealStep === 4 && orderId) {
      try {
        await apiRequest(`/api/medical-orders/${orderId}/status`, "PATCH", {
          status: "aguardando_recurso"
        });

        toast({
          title: "✅ Status atualizado!",
          description: "O pedido foi atualizado para 'Aguardando Envio de Recurso'.",
          duration: 3000,
        });

        // Invalidar cache para atualizar a lista de pedidos
        queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
        onSuccess?.();
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
      }
    }
    
    resetState();
    onClose();
  };

  const generateAppealPDF = async () => {
    if (!orderId || !appealJustification.trim() || !appealOrderData) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para gerar o recurso",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingAppeal(true);
      
      toast({
        title: "Gerando PDF do Recurso",
        description: "Criando documento...",
      });

      const { pdf } = await import('@react-pdf/renderer');
      const { AppealPDFDocument } = await import('@/components/appeal-pdf-document');

      if (typeof window !== 'undefined' && !(window as any).Buffer) {
        const { Buffer } = await import('buffer');
        (window as any).Buffer = Buffer;
      }

      // Separar anexos de imagem e PDF
      const imageAttachments = appealAttachments.filter(att => att.type === 'image' && att.uploaded);
      const pdfAttachments = appealAttachments.filter(att => att.type === 'pdf' && att.uploaded);
      
      console.log(`📎 Anexos do recurso: ${imageAttachments.length} imagens, ${pdfAttachments.length} PDFs`);

      // Gerar PDF principal com imagens incluídas
      const mainPdfBlob = await pdf(
        <AppealPDFDocument 
          patient={appealOrderData.patient}
          hospital={appealOrderData.hospital}
          appealJustification={appealJustification}
          orderId={orderId}
          user={user ? {
            name: user.name,
            crm: user.crm?.toString() || undefined,
            logoUrl: user.logoUrl || undefined,
            signatureUrl: user.signatureUrl || undefined,
            signatureNote: user.signatureNote || undefined,
          } : undefined}
          attachments={imageAttachments}
        />
      ).toBlob();

      console.log("✅ PDF do recurso gerado! Tamanho:", mainPdfBlob.size, "bytes");

      // Processar PDF: fazer merge com anexos e adicionar rodapé em TODAS as páginas
      let finalPdfBlob = mainPdfBlob;
      const MEDSYNC_VERSION = '2.5.3';
      
      try {
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
        
        const mainPdfBytes = await mainPdfBlob.arrayBuffer();
        const finalPdfDoc = await PDFDocument.load(mainPdfBytes);
        
        // Carregar fonte para o rodapé
        const helveticaFont = await finalPdfDoc.embedFont(StandardFonts.Helvetica);
        
        // Fazer merge com PDFs anexados (se houver)
        if (pdfAttachments.length > 0) {
          toast({
            title: "Fazendo merge dos PDFs",
            description: `Adicionando ${pdfAttachments.length} documento(s) PDF anexo(s)...`,
          });
          
          for (let i = 0; i < pdfAttachments.length; i++) {
            const attachment = pdfAttachments[i];
            
            try {
              console.log(`📄 Fazendo merge do PDF ${i + 1}/${pdfAttachments.length}:`, attachment.filename);
              
              const pdfResponse = await fetch(attachment.url, {
                credentials: 'include'
              });
              
              if (!pdfResponse.ok) {
                console.warn(`⚠️ Falha ao carregar anexo PDF: ${attachment.filename}`);
                continue;
              }
              
              const attachmentPdfBytes = await pdfResponse.arrayBuffer();
              const attachmentPdf = await PDFDocument.load(attachmentPdfBytes);
              
              const pageIndices = attachmentPdf.getPageIndices();
              const copiedPages = await finalPdfDoc.copyPages(attachmentPdf, pageIndices);
              
              copiedPages.forEach((page) => finalPdfDoc.addPage(page));
              
              console.log(`✅ PDF ${i + 1} merged: ${attachment.filename} (${pageIndices.length} páginas)`);
              
            } catch (error) {
              console.error(`❌ Erro ao fazer merge do PDF ${attachment.filename}:`, error);
            }
          }
        }
        
        // Adicionar rodapé em TODAS as páginas (após merge, para paginação correta)
        const totalPages = finalPdfDoc.getPageCount();
        const allPages = finalPdfDoc.getPages();
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        console.log(`📝 Adicionando rodapé em ${totalPages} páginas...`);
        
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const page = allPages[pageIndex];
          const { width } = page.getSize();
          
          // Texto do rodapé
          const footerText = `Recurso de glosa do Pedido #${orderId} - Gerado em ${currentDate} através do MedSync v${MEDSYNC_VERSION}`;
          const pageNumberText = `Página ${pageIndex + 1} de ${totalPages}`;
          
          // Calcular posições
          const fontSize = 8;
          const footerTextWidth = helveticaFont.widthOfTextAtSize(footerText, fontSize);
          const pageNumberWidth = helveticaFont.widthOfTextAtSize(pageNumberText, 7);
          
          // Desenhar linha separadora
          page.drawLine({
            start: { x: 30, y: 35 },
            end: { x: width - 30, y: 35 },
            thickness: 0.5,
            color: rgb(0.89, 0.91, 0.94), // #e2e8f0
          });
          
          // Desenhar texto do rodapé (centralizado)
          page.drawText(footerText, {
            x: (width - footerTextWidth) / 2,
            y: 22,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.39, 0.45, 0.55), // #64748b
          });
          
          // Desenhar número da página (centralizado, abaixo)
          page.drawText(pageNumberText, {
            x: (width - pageNumberWidth) / 2,
            y: 12,
            size: 7,
            font: helveticaFont,
            color: rgb(0.61, 0.64, 0.69), // #9ca3af
          });
        }
        
        const finalPdfBytes = await finalPdfDoc.save();
        finalPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        
        console.log(`✅ PDF finalizado com rodapé. Total de páginas: ${totalPages}`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar PDF:`, error);
        toast({
          title: "Erro ao processar PDF",
          description: "Houve um problema ao adicionar rodapé/anexos",
          variant: "destructive"
        });
      }

      const fileName = `recurso_glosa_${orderId}_${appealOrderData.patient?.fullName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      const formData = new FormData();
      formData.append('pdf', finalPdfBlob, fileName);
      formData.append('orderId', orderId.toString());
      formData.append('patientName', appealOrderData.patient?.fullName || 'Paciente');
      formData.append('type', 'appeal');
      
      console.log("📤 Enviando PDF do recurso para servidor...");
      
      const uploadResponse = await fetch('/api/uploads/order-pdf', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Erro no upload: ${uploadResponse.status}`);
      }
      
      const uploadResult = await uploadResponse.json();
      console.log("✅ Upload do PDF concluído:", uploadResult);
      
      await apiRequest(`/api/medical-orders/${orderId}/appeals`, "POST", {
        justification: appealJustification,
        rejectionReason: rejectionReason || null,
        pdfUrl: uploadResult.url
      });
      
      setGeneratedAppealPdfUrl(uploadResult.url);
      setAppealStep(4);
      
      toast({
        title: "✅ PDF do recurso gerado!",
        description: "Agora você pode fazer o download e finalizar o processo.",
        duration: 3000,
      });
      
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
        queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}/status-history`] });
      }
      
    } catch (error) {
      console.error("Erro ao criar recurso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o recurso",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAppeal(false);
    }
  };

  const finalizeAppeal = async () => {
    if (!orderId) return;

    try {
      setIsFinalizingAppeal(true);
      // handleClose já faz a atualização do status quando está no step 4
      await handleClose();

    } catch (error) {
      console.error("Erro ao finalizar recurso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o recurso",
        variant: "destructive",
      });
    } finally {
      setIsFinalizingAppeal(false);
    }
  };

  const loadOrderData = async () => {
    if (!orderId) return;
    
    try {
      setIsLoadingAppealOrder(true);
      const response = await fetch(`/api/medical-orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do pedido');
      }
      
      const orderData = await response.json();
      setAppealOrderData(orderData);
      setAppealStep(3);
    } catch (error) {
      console.error("Erro ao carregar dados do pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do pedido",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAppealOrder(false);
    }
  };

  const generateWithAI = async () => {
    try {
      setIsGeneratingAppealAI(true);
      
      // Mapear sexo do paciente
      const mapSexo = (sex: string | null | undefined): string => {
        if (!sex) return "Não informado";
        const sexLower = sex.toLowerCase();
        if (sexLower === 'm' || sexLower === 'masculino' || sexLower === 'male') return "Masculino";
        if (sexLower === 'f' || sexLower === 'feminino' || sexLower === 'female') return "Feminino";
        return sex;
      };

      // Extrair TODOS os códigos CID do pedido (estrutura: cidCodes[].cid.code ou cidCodes[].code)
      const codigosCid: string[] = appealOrderData?.cidCodes?.map((cidItem: any) => 
        cidItem.cid?.code || cidItem.code || ''
      ).filter((code: string) => code) || [];
      
      // Extrair TODOS os códigos CBHPM do pedido (estrutura: cbhpmProcedures[].procedureCode)
      const codigosCbhpm = appealOrderData?.cbhpmProcedures?.map((proc: any) => ({
        codigo: proc.procedureCode || '',
        descricao: proc.procedureName || proc.name || ''
      })).filter((item: { codigo: string; descricao: string }) => item.codigo) || [];
      
      // Extrair TODOS os itens OPME do pedido (estrutura: opmeItems[].opmeTechnicalName)
      const itensOpme: string[] = appealOrderData?.opmeItems?.map((item: any) => 
        item.opmeTechnicalName || item.opmeCommercialName || ''
      ).filter((name: string) => name) || [];

      // Preparar anexos para a API (URLs públicas)
      const anexosFormatados = appealAttachments
        .filter(att => att.uploaded && att.url)
        .map(att => ({
          url: att.url,
          nome: att.filename
        }));

      // Extrair nomes das condutas/abordagens cirúrgicas (ex: "Artroscopia, Via aberta")
      const condutaCirurgica = appealOrderData?.surgicalApproaches?.map((approach: any) => 
        approach.approachName || approach.name || ''
      ).filter((name: string) => name).join(", ") || "Não informado";
      
      // Extrair nomes dos procedimentos cirúrgicos (ex: "Reparo do manguito rotador, Descompressão subacromial")
      const procedimentoCirurgico = appealOrderData?.surgicalProcedures?.map((proc: any) => 
        proc.procedureName || proc.name || ''
      ).filter((name: string) => name).join(", ") || "Não informado";

      // Extrair nomes dos fornecedores
      const fornecedores = appealOrderData?.suppliers?.map((supplier: any) => 
        supplier.companyName || supplier.tradeName || ''
      ).filter((name: string) => name) || [];

      // Construir payload completo para a API externa (padronizado com o pedido cirúrgico)
      const payload = {
        // Campos obrigatórios
        sexo_paciente: mapSexo(appealOrderData?.patient?.gender),
        idade: calculateAge(appealOrderData?.patient?.birthDate),
        indicacao_clinica: appealOrderData?.clinicalIndication || appealOrderData?.procedureName || "Não informado",
        regiao_anatomica: appealOrderData?.anatomicalRegion?.name || "Não informado",
        procedimento_cirurgico: procedimentoCirurgico,
        
        // Campos recomendados (contexto da glosa)
        motivo_glosa: rejectionReason.trim() || 'Necessito recorrer aos procedimentos CBHPM e itens OPME que foram negados.',
        justificativa_enviada: appealOrderData?.clinicalJustification || "",
        conduta_cirurgica: condutaCirurgica,
        observacoes_adicionais: appealOrderData?.additionalNotes || "",
        
        // Campos adicionais (padronizados com pedido cirúrgico)
        carater_procedimento: appealOrderData?.procedureType || "",
        lateralidade: appealOrderData?.procedureLaterality || appealOrderData?.laterality || "",
        fornecedores: fornecedores,
        
        // Arrays de códigos
        codigos_cid: codigosCid,
        codigos_cbhpm: codigosCbhpm,
        itens_opme: itensOpme,
        
        // Itens selecionados para recurso (negados/glosados)
        codigos_cbhpm_neg: deniedItems
          .filter(item => item.type === 'cbhpm' && selectedDeniedItemIds.has(`cbhpm-${item.id}`))
          .map(item => ({ codigo: item.code, descricao: item.name })),
        itens_opme_neg: deniedItems
          .filter(item => item.type === 'opme' && selectedDeniedItemIds.has(`opme-${item.id}`))
          .map(item => item.name),
        
        // Anexos
        anexos: anexosFormatados
      };

      console.log("📤 Enviando payload para API de glosa:", payload);
      
      const response = await apiRequest(
        "/api/appeals/generate-with-ai",
        "POST",
        payload
      );

      if (response.success && response.appealJustification) {
        setAppealJustification(response.appealJustification);
        toast({
          title: "✅ Recurso gerado com sucesso!",
          description: "A IA gerou o recurso de glosa com base no motivo da recusa.",
        });
      } else {
        throw new Error("Resposta inválida da API");
      }
    } catch (error) {
      console.error("Erro ao gerar recurso com IA:", error);
      toast({
        title: "❌ Erro ao gerar recurso",
        description: "Não foi possível gerar o recurso com IA. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAppealAI(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="bg-card border-gray-200 text-foreground max-w-[70vw] p-0">
        <VisuallyHidden>
          <DialogTitle>Gerar Recurso de Glosas</DialogTitle>
        </VisuallyHidden>
        <div className="bg-destructive text-white py-4 px-6 rounded-t-lg">
          <h2 className="text-xl font-semibold text-center">Gerar Recurso de Glosas</h2>
        </div>
        
        <div className="space-y-4 p-6 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Tela Única - Itens Glosados, Motivo da Recusa e Justificativa Médica */}
          {appealStep === 1 && (
            <div className="space-y-4">
              {/* Seção de Itens Glosados */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="font-medium text-foreground">Itens Glosados / Negados</h3>
                </div>
                
                {isLoadingDeniedItems ? (
                  <div className="flex items-center justify-center py-6 bg-muted/30 rounded-lg border border-dashed">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Carregando itens...</span>
                  </div>
                ) : deniedItems.length === 0 ? (
                  <div className="py-4 px-4 bg-muted/30 rounded-lg border border-dashed text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum item glosado ou negado encontrado neste pedido.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Você ainda pode criar um recurso manual informando o motivo da recusa abaixo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Selecione os itens que deseja recorrer:
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const allIds = new Set(deniedItems.map(item => `${item.type}-${item.id}`));
                            setSelectedDeniedItemIds(allIds);
                          }}
                        >
                          Selecionar todos
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setSelectedDeniedItemIds(new Set())}
                        >
                          Limpar seleção
                        </Button>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {selectedDeniedItemIds.size} de {deniedItems.length} selecionado(s)
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                    {/* Procedimentos CBHPM */}
                    {deniedItems.filter(item => item.type === 'cbhpm').length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 pt-1 pb-0.5">
                          <Stethoscope className="h-3.5 w-3.5" />
                          <span>Procedimentos CBHPM</span>
                        </div>
                        {deniedItems.filter(item => item.type === 'cbhpm').map((item) => {
                          const itemKey = `cbhpm-${item.id}`;
                          const isSelected = selectedDeniedItemIds.has(itemKey);
                          return (
                            <label
                              key={itemKey}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150
                                ${isSelected
                                  ? item.status === 'negado'
                                    ? 'bg-red-50/60 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                                    : 'bg-amber-50/60 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700'
                                  : 'bg-card border-border opacity-60 hover:opacity-80'}
                              `}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedDeniedItemIds(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(itemKey);
                                    else next.delete(itemKey);
                                    return next;
                                  });
                                }}
                                className="shrink-0"
                              />
                              {item.code && (
                                <span className="shrink-0 text-xs font-medium text-muted-foreground hidden sm:inline">
                                  {item.code}
                                </span>
                              )}
                              <span className="flex-1 min-w-0 text-sm text-foreground truncate">{item.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {item.quantityApproved ?? 0}/{item.quantityRequested}
                              </span>
                              <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                                item.status === 'negado'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                              }`}>
                                {item.status === 'negado' ? 'Negado' : 'Parcial'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Itens OPME */}
                    {deniedItems.filter(item => item.type === 'opme').length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 pt-1 pb-0.5">
                          <Package className="h-3.5 w-3.5" />
                          <span>Materiais OPME</span>
                        </div>
                        {deniedItems.filter(item => item.type === 'opme').map((item) => {
                          const itemKey = `opme-${item.id}`;
                          const isSelected = selectedDeniedItemIds.has(itemKey);
                          return (
                            <label
                              key={itemKey}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150
                                ${isSelected
                                  ? item.status === 'negado'
                                    ? 'bg-red-50/60 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                                    : 'bg-amber-50/60 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700'
                                  : 'bg-card border-border opacity-60 hover:opacity-80'}
                              `}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedDeniedItemIds(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(itemKey);
                                    else next.delete(itemKey);
                                    return next;
                                  });
                                }}
                                className="shrink-0"
                              />
                              <span className="flex-1 min-w-0 text-sm text-foreground truncate">{item.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {item.quantityApproved ?? 0}/{item.quantityRequested}
                              </span>
                              <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                                item.status === 'negado'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                              }`}>
                                {item.status === 'negado' ? 'Negado' : 'Parcial'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Campo de Upload de Arquivos com Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAttachmentSection(!showAttachmentSection)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="flex flex-col items-start">
                    <span>Anexos do Recurso (opcional)</span>
                    {!showAttachmentSection && (
                      <span className="text-xs font-bold text-muted-foreground/70">Clique para Habilitar essa opção</span>
                    )}
                  </span>
                  {appealAttachments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      {appealAttachments.length}
                    </span>
                  )}
                  {showAttachmentSection ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </button>
                
                {showAttachmentSection && (
                  <>
                    <div
                      className={`mt-2 p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                        isUploadingAttachment 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50 bg-muted/20'
                      }`}
                      onClick={() => !isUploadingAttachment && fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isUploadingAttachment) {
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            handleFilesAdd(Array.from(files));
                          }
                        }
                      }}
                    >
                      <div className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isUploadingAttachment ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          ) : (
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          )}
                          <p className="text-sm font-medium text-foreground">
                            {isUploadingAttachment ? 'Enviando arquivos...' : 'Clique ou arraste arquivos aqui'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Imagens (JPG, PNG) ou PDFs - Máximo 10MB por arquivo
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Lista de anexos */}
                    {appealAttachments.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {appealAttachments.map((attachment, index) => (
                          <div
                            key={attachment.id}
                            className="relative p-2 border border-border rounded-lg bg-card flex flex-col items-center"
                          >
                            {attachment.type === 'image' ? (
                              <div className="w-16 h-16 rounded overflow-hidden bg-white flex items-center justify-center">
                                <img
                                  src={attachment.url}
                                  alt={attachment.filename}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded bg-red-50 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-red-500" />
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-full text-center">
                              {attachment.filename.length > 15 
                                ? attachment.filename.substring(0, 12) + '...' 
                                : attachment.filename}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAttachment(index);
                              }}
                              className="absolute -top-1 -right-1 p-0.5 bg-destructive text-white rounded-full hover:bg-destructive/80"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Campo de Motivo da Recusa */}
              <div>
                <Label htmlFor="rejectionReason" className="text-muted-foreground">
                  Motivo da Recusa (Opcional)
                </Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Cole aqui a mensagem de recusa enviada pela operadora ou qualquer informação que considere necessária."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-input border-gray-200 text-foreground mt-1 min-h-[100px]"
                  rows={4}
                />
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    disabled={isGeneratingAppealAI}
                    className="btn-medsync-dark disabled:opacity-50 min-w-[240px] flex items-center justify-center gap-2 whitespace-nowrap"
                    onClick={generateWithAI}
                    data-testid="button-generate-appeal-ai"
                  >
                    {isGeneratingAppealAI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <img src={RoboMedSyncIcon} alt="IA" className="w-5 h-5" />
                        Gerar Recurso de Glosa com IA
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Campo de Justificativa Médica */}
              <div>
                <Label htmlFor="appealJustification" className="text-muted-foreground">
                  Laudo de justificativa médica *
                </Label>
                <div className="mt-1">
                  <RichTextEditor
                    id="appealJustification"
                    placeholder="Descreva a justificativa médica para o recurso..."
                    value={appealJustification}
                    onChange={setAppealJustification}
                    minHeight="min-h-[150px]"
                  />
                </div>
                
                <div className="mt-2">
                  <p className="text-xs text-medsync-dark-blue dark:text-medsync-dark-blue">
                    * Possuímos uma IA própria treinada por médicos especialistas. Porém poderá conter imprecisões. Sempre valide o recurso antes de submeter.
                  </p>
                </div>
                
              </div>
            </div>
          )}

          {/* Step 3: Visualização do Recurso */}
          {appealStep === 3 && orderId && appealOrderData && (
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Visualização do Recurso
                </h3>
                <p className="text-sm text-muted-foreground">
                  Revise os dados do recurso antes de enviar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prévia A4 (210 x 297 mm)
                </p>
              </div>
              
              <AppealPreview 
                patient={appealOrderData.patient || {}}
                hospital={appealOrderData.hospital || {}}
                rejectionReason={rejectionReason}
                appealJustification={appealJustification}
              />
            </div>
          )}

          {/* Step 4: Sucesso e Ações */}
          {appealStep === 4 && (
            <div className="py-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Recurso Gerado com Sucesso!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O PDF do recurso foi criado e salvo no servidor. Agora você pode:
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <Button
                    onClick={() => {
                      if (generatedAppealPdfUrl) {
                        window.open(generatedAppealPdfUrl, '_blank');
                      }
                    }}
                    variant="outline"
                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Fazer Download do PDF
                  </Button>

                  <Button
                    onClick={finalizeAppeal}
                    disabled={isFinalizingAppeal}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isFinalizingAppeal ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finalizar Recurso
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Ao finalizar, o status do pedido será atualizado para "Aguardando Recurso"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          {appealStep !== 4 && (
            <div className="flex justify-between gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                Cancelar
              </Button>

              <div className="flex gap-2">
                {appealStep === 3 && (
                  <Button
                    variant="outline"
                    onClick={() => setAppealStep(1)}
                    className="border-gray-200 text-muted-foreground hover:bg-muted"
                  >
                    Voltar
                  </Button>
                )}

                {appealStep === 1 && (
                  <Button
                    onClick={async () => {
                      // Primeiro fazer upload dos anexos pendentes
                      if (appealAttachments.some(att => !att.uploaded)) {
                        const uploadSuccess = await uploadPendingAttachments();
                        if (!uploadSuccess) {
                          // Continuar mesmo com erro parcial
                        }
                      }
                      // Depois carregar dados do pedido
                      loadOrderData();
                    }}
                    disabled={!appealJustification.trim() || isLoadingAppealOrder || isUploadingAttachment}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50"
                  >
                    {isUploadingAttachment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando anexos...
                      </>
                    ) : isLoadingAppealOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      "Visualizar Recurso"
                    )}
                  </Button>
                )}

                {appealStep === 3 && (
                  <Button
                    onClick={generateAppealPDF}
                    disabled={isCreatingAppeal}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isCreatingAppeal ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      "Gerar PDF do Recurso"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
