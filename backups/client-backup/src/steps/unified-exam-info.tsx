import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UnifiedFileUpload, UnifiedAttachment } from "@/components/unified-file-upload";

interface UnifiedExamInfoProps {
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  clinicalIndication: string;
  setClinicalIndication: (text: string) => void;
  attachments: UnifiedAttachment[];
  setAttachments: (attachments: UnifiedAttachment[]) => void;
  orderId?: number | null;
  updateOrderField?: (fieldName: string, value: any) => Promise<boolean>;
}

export function UnifiedExamInfo({
  additionalNotes,
  setAdditionalNotes,
  clinicalIndication,
  setClinicalIndication,
  attachments,
  setAttachments,
  orderId,
  updateOrderField
}: UnifiedExamInfoProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAttachmentsChange = async (newAttachments: UnifiedAttachment[]) => {
    setAttachments(newAttachments);
    
    // Se temos um orderId e função de atualização, salvar no banco
    if (orderId && updateOrderField) {
      setIsUpdating(true);
      try {
        await updateOrderField('attachments', newAttachments);
      } catch (error) {
        console.error('Erro ao atualizar anexos:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicação Clínica */}
      <Card>
        <CardHeader>
          <CardTitle>Indicação Clínica <span className="text-red-500">*</span></CardTitle>
          <CardDescription>
            Descreva a indicação médica para o procedimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={clinicalIndication}
            onChange={(e) => setClinicalIndication(e.target.value)}
            placeholder="Ex: Paciente com dor lombar crônica, indicado artrodese..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Upload Unificado de Anexos */}
      <UnifiedFileUpload
        attachments={attachments}
        onAttachmentsChange={handleAttachmentsChange}
        title="Anexos do Pedido"
        description="Faça upload de imagens de exames (raio-X, ressonância, tomografia) e relatórios médicos (PDFs)"
        maxFiles={10}
        disabled={isUpdating}
        orderId={orderId}
      />

      {/* Observações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Adicionais</CardTitle>
          <CardDescription>
            Informações complementares sobre o caso (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Ex: Paciente alérgico a contraste, procedimento urgente..."
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Status de salvamento */}
      {isUpdating && (
        <div className="flex items-center justify-center p-2 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-600">Salvando anexos...</span>
        </div>
      )}
    </div>
  );
}