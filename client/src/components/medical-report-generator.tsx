import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Download, FileText, Eye, ArrowLeft } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { RichTextEditor } from "@/components/rich-text-editor";
import MedSyncLogo from "@/assets/icons/Medsync_Y_Estilizado_Azul.svg";
import { calculateAge } from "@/lib/utils";
import Showdown from 'showdown';

const showdownConverter = new Showdown.Converter({
  simpleLineBreaks: true,
  strikethrough: true,
});

function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  return showdownConverter.makeHtml(markdown);
}

interface MedicalReportGeneratorProps {
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

export function MedicalReportGenerator({
  orderId,
  isOpen,
  onClose,
  onSuccess,
  user,
}: MedicalReportGeneratorProps) {
  const { toast } = useToast();

  const [reportStep, setReportStep] = useState<number>(1);
  const [reportContent, setReportContent] = useState<string>("");
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string>("");

  const loadOrderData = async () => {
    if (!orderId) return;

    try {
      setIsLoadingOrder(true);

      const [orderResponse] = await Promise.all([
        fetch(`/api/medical-orders/${orderId}`),
      ]);

      if (!orderResponse.ok) {
        throw new Error("Erro ao buscar dados do pedido");
      }

      const data = await orderResponse.json();
      setOrderData(data);
      setReportStep(2);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do pedido",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const stripHtml = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const generateReportPDF = async () => {
    const plainText = stripHtml(reportContent);
    if (!orderId || !plainText.trim() || !orderData) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para gerar o laudo",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingPdf(true);

      toast({
        title: "Gerando PDF do Laudo",
        description: "Criando documento...",
      });

      const { pdf } = await import("@react-pdf/renderer");
      const { MedicalReportPDFDocument } = await import(
        "@/components/medical-report-pdf-document"
      );

      if (typeof window !== "undefined" && !(window as any).Buffer) {
        const { Buffer } = await import("buffer");
        (window as any).Buffer = Buffer;
      }

      const mainPdfBlob = await pdf(
        <MedicalReportPDFDocument
          patient={orderData.patient}
          hospital={orderData.hospital}
          reportContent={reportContent}
          orderId={orderId}
          user={
            user
              ? {
                  name: user.name,
                  crm: user.crm?.toString() || undefined,
                  logoUrl: user.logoUrl || undefined,
                  signatureUrl: user.signatureUrl || undefined,
                  signatureNote: user.signatureNote || undefined,
                }
              : undefined
          }
        />
      ).toBlob();

      let finalPdfBlob = mainPdfBlob;
      const MEDSYNC_VERSION = "2.5.3";

      try {
        const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

        const mainPdfBytes = await mainPdfBlob.arrayBuffer();
        const finalPdfDoc = await PDFDocument.load(mainPdfBytes);

        const helveticaFont = await finalPdfDoc.embedFont(
          StandardFonts.Helvetica
        );

        const totalPages = finalPdfDoc.getPageCount();
        const allPages = finalPdfDoc.getPages();
        const currentDate = new Date().toLocaleDateString("pt-BR");

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
          const page = allPages[pageIndex];
          const { width } = page.getSize();

          const footerText = `Laudo Médico do Pedido #${orderId} - Gerado em ${currentDate} através do MedSync v${MEDSYNC_VERSION}`;
          const pageNumberText = `Página ${pageIndex + 1} de ${totalPages}`;

          const fontSize = 8;
          const footerTextWidth = helveticaFont.widthOfTextAtSize(
            footerText,
            fontSize
          );
          const pageNumberWidth = helveticaFont.widthOfTextAtSize(
            pageNumberText,
            7
          );

          page.drawLine({
            start: { x: 30, y: 35 },
            end: { x: width - 30, y: 35 },
            thickness: 0.5,
            color: rgb(0.89, 0.91, 0.94),
          });

          page.drawText(footerText, {
            x: (width - footerTextWidth) / 2,
            y: 22,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.39, 0.45, 0.55),
          });

          page.drawText(pageNumberText, {
            x: (width - pageNumberWidth) / 2,
            y: 12,
            size: 7,
            font: helveticaFont,
            color: rgb(0.61, 0.64, 0.69),
          });
        }

        const finalPdfBytes = await finalPdfDoc.save();
        finalPdfBlob = new Blob([finalPdfBytes], { type: "application/pdf" });
      } catch (error) {
        console.error("Erro ao processar PDF:", error);
      }

      const fileName = `laudo_medico_${orderId}_${orderData.patient?.fullName?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

      const formData = new FormData();
      formData.append("pdf", finalPdfBlob, fileName);
      formData.append("orderId", orderId.toString());
      formData.append(
        "patientName",
        orderData.patient?.fullName || "Paciente"
      );
      formData.append("type", "report");

      const uploadResponse = await fetch("/api/uploads/order-pdf", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Erro no upload: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();

      setGeneratedPdfUrl(uploadResult.url);
      setReportStep(3);

      try {
        await apiRequest(`/api/medical-orders/${orderId}/notes`, "POST", {
          recordType: "report_pdf_version",
          notes: `Novo laudo médico gerado. [Baixar Laudo](${uploadResult.url})`,
        });
      } catch (historyError) {
        console.error("Erro ao registrar histórico do laudo:", historyError);
      }

      toast({
        title: "PDF do laudo gerado!",
        description: "Agora você pode fazer o download do documento.",
        duration: 3000,
      });

      if (orderId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/medical-orders/${orderId}`],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/medical-orders"],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/medical-orders/${orderId}/status-history`],
        });
      }
    } catch (error) {
      console.error("Erro ao gerar laudo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o laudo médico",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetState = () => {
    setReportStep(1);
    setReportContent("");
    setOrderData(null);
    setGeneratedPdfUrl("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="bg-card border-gray-200 text-foreground max-w-[70vw] p-0">
        <VisuallyHidden>
          <DialogTitle>Gerar Laudo Médico</DialogTitle>
        </VisuallyHidden>
        <div className="bg-sky-600 text-white py-4 px-6 rounded-t-lg">
          <h2 className="text-xl font-semibold text-center">
            Gerar Laudo Médico
          </h2>
        </div>

        <div className="space-y-4 p-6 max-h-[75vh] overflow-y-auto">
          {reportStep === 1 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-sky-500" />
                  <h3 className="font-medium text-foreground">
                    Laudo Médico
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Escreva o conteúdo do laudo médico utilizando o editor abaixo.
                  Você pode formatar o texto com negrito, itálico, listas e
                  muito mais.
                </p>
              </div>

              <RichTextEditor
                value={reportContent}
                onChange={setReportContent}
                placeholder="Digite o conteúdo do laudo médico aqui..."
                minHeight="min-h-[350px]"
              />
            </div>
          )}

          {reportStep === 2 && (
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Pré-visualização do Laudo
                </h3>
                <p className="text-sm text-muted-foreground">
                  Revise os dados do laudo antes de gerar o PDF
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prévia A4 (210 x 297 mm)
                </p>
              </div>

              <div className="flex justify-center">
                <div
                  className="bg-white shadow-xl relative"
                  style={{ width: '210mm', minHeight: '297mm' }}
                >
                  <div style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '30px', marginRight: '30px' }}>
                    <div className="w-full bg-white text-black p-2">

                      <div className="mb-2">
                        <div className="flex items-start justify-between">
                          <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
                            {orderData?.hospital?.logoUrl ? (
                              <img
                                src={orderData.hospital.logoUrl}
                                alt={`Logo do ${orderData.hospital.name}`}
                                className="max-h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="text-xs text-muted-foreground text-center">
                                {orderData?.hospital?.name || 'Hospital'}
                              </div>
                            )}
                          </div>

                          <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
                            {user?.logoUrl && (
                              <img
                                src={user.logoUrl}
                                alt="Logo do Médico"
                                className="max-h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {orderData?.patient && (
                        <div className="mb-5 p-2 bg-white rounded-lg">
                          <h3 className="text-sm font-semibold mb-1 border-b pb-1">Dados do Paciente</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-xs">
                              <p><span className="font-medium">Nome:</span> {orderData.patient.fullName}</p>
                              <p><span className="font-medium">Data de Nascimento:</span> {new Date(orderData.patient.birthDate).toLocaleDateString('pt-BR')}</p>
                              <p><span className="font-medium">Idade:</span> {calculateAge(orderData.patient.birthDate)} anos</p>
                            </div>
                            <div className="text-xs">
                              {orderData.patient.insurance && (
                                <p><span className="font-medium">Plano de Saúde:</span> {orderData.patient.insurance}</p>
                              )}
                              {orderData.patient.insuranceNumber && (
                                <p><span className="font-medium">Número da Carteirinha:</span> {orderData.patient.insuranceNumber}</p>
                              )}
                              {orderData.patient.plan && (
                                <p><span className="font-medium">Tipo do Plano:</span> {orderData.patient.plan}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pb-1 mb-4">
                        <h2 className="text-base font-bold text-center text-foreground">
                          LAUDO MÉDICO
                        </h2>
                      </div>

                      <div className="mb-6">
                        <div
                          className="prose prose-sm max-w-none text-xs leading-relaxed bg-white p-3 rounded-md"
                          style={{ minHeight: '200px', height: 'auto' }}
                          dangerouslySetInnerHTML={{ __html: markdownToHtml(reportContent) }}
                        />
                      </div>

                      <div className="mt-8 mb-4">
                        <div className="text-right mb-6">
                          <p className="text-xs text-muted-foreground">
                            {orderData?.hospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex justify-center relative mb-0">
                          {user?.signatureUrl ? (
                            <img
                              src={user.signatureUrl}
                              alt="Assinatura do Médico"
                              className="object-contain relative z-0"
                              style={{ maxWidth: '240px', maxHeight: '120px', marginBottom: '-10px' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="h-36 w-48 border border-border flex items-center justify-center bg-muted/30">
                              <span className="text-xs text-muted-foreground">Assinatura não cadastrada</span>
                            </div>
                          )}
                        </div>

                        {user && (
                          <div className="flex flex-col items-center mb-6 relative z-10">
                            <div className="border-t border-border w-48 mb-1"></div>
                            <p className="text-xs font-bold text-foreground">{user.name?.toUpperCase()}</p>
                            <div className="text-xs text-muted-foreground text-center">
                              {user.signatureNote ? (
                                user.signatureNote.split('\n').map((line: string, index: number) => (
                                  <p key={index}>{line}</p>
                                ))
                              ) : (
                                <p>ORTOPEDIA E TRAUMATOLOGIA</p>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">CRM {user.crm}</p>
                          </div>
                        )}

                        <div className="pt-1 border-t border-border flex flex-row items-center justify-center">
                          <img
                            src={MedSyncLogo}
                            alt="Logo MedSync"
                            className="h-5 mr-2"
                          />
                          <p className="text-xs text-muted-foreground">Documento gerado por MedSync v2.5.3</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportStep === 3 && (
            <div className="space-y-4 text-center py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <FileText className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Laudo Médico Gerado com Sucesso!
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  O PDF do laudo médico foi gerado e salvo. Clique abaixo para
                  fazer o download.
                </p>

                {generatedPdfUrl && (
                  <a
                    href={generatedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Baixar Laudo Médico (PDF)
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {reportStep !== 3 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div>
              {reportStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setReportStep(1)}
                  className="text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Editor
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>

              {reportStep === 1 && (
                <Button
                  onClick={loadOrderData}
                  disabled={
                    !stripHtml(reportContent).trim() || isLoadingOrder
                  }
                  className="bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
                >
                  {isLoadingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar Laudo
                    </>
                  )}
                </Button>
              )}

              {reportStep === 2 && (
                <Button
                  onClick={generateReportPDF}
                  disabled={isGeneratingPdf}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar PDF do Laudo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
