import { useState, useCallback, createElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { RichTextEditor } from "@/components/rich-text-editor";
import { OrderPreviewV2 } from "@/components/order-preview_v2";
import { OrderPDFDocumentV2 } from "@/components/order-pdf-document-v2";
import { PdfCanvasViewer } from "@/components/pdf-canvas-viewer";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, RefreshCw, Loader2 } from "lucide-react";

const MOCK_PATIENT = {
  id: 1,
  fullName: "João da Silva Santos",
  birthDate: "1975-06-15",
  insurance: "Unimed",
  insuranceNumber: "123456789",
  plan: "Executivo",
  cpf: "123.456.789-00",
};

const MOCK_CIDS = [
  {
    cid: { id: 1, code: "M17.1", description: "Gonartrose primária unilateral" },
    surgicalApproach: null,
    surgicalProcedure: null,
  },
];

const MOCK_PROCEDURES = [
  {
    procedure: {
      id: 1,
      code: "3.01.06.06-2",
      name: "Artroplastia Total do Joelho",
      porte: "12A",
    },
    quantity: 1,
    surgicalApproach: null,
    surgicalProcedure: null,
  },
];

const MOCK_OPME = [
  {
    item: { id: 1, technicalName: "Prótese de joelho cimentada total" },
    quantity: 1,
    surgicalApproach: null,
    surgicalProcedure: null,
  },
];

const MOCK_SUPPLIERS = [
  {
    id: 1,
    companyName: "Stryker do Brasil Ltda",
    tradeName: "Stryker",
    cnpj: "00.000.000/0001-00",
  },
];

const DEFAULT_TEXT = `Paciente com gonartrose tricompartimental grave no joelho direito, confirmada por radiografias em ortostase que demonstram perda total do espaço articular medial e lateral, com deformidade em varo de 12 graus.

Apresenta dor intensa (EVA 9/10), limitação funcional grave e falha de tratamento conservador após 18 meses de fisioterapia, infiltrações e anti-inflamatórios.

A artroplastia total do joelho está indicada com urgência relativa para restabelecimento da função e qualidade de vida.`;

export default function PreviewLab() {
  const [draftText, setDraftText] = useState(DEFAULT_TEXT);
  const [committedText, setCommittedText] = useState(DEFAULT_TEXT);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("1");
  const [key, setKey] = useState(0);

  const { data: user, isLoading: userLoading } = useQuery<any>({ queryKey: ["/api/user"] });
  const { data: hospitals, isLoading: hospitalsLoading } = useQuery<any[]>({ queryKey: ["/api/hospitals"] });

  const selectedHospital = hospitals?.find((h: any) => String(h.id) === selectedHospitalId) ?? hospitals?.[0] ?? null;

  const handleTestar = useCallback(() => {
    setCommittedText(draftText);
    setKey((k) => k + 1);
  }, [draftText]);

  const pdfElement = createElement(OrderPDFDocumentV2, {
    orderId: 469,
    selectedPatient: MOCK_PATIENT as any,
    selectedHospital: selectedHospital as any,
    user: user as any,
    clinicalJustification: committedText,
    procedureType: "eletiva",
    procedureLaterality: "direito",
    multipleCids: MOCK_CIDS as any,
    secondaryProcedures: MOCK_PROCEDURES as any,
    selectedOpmeItems: MOCK_OPME as any,
    supplierDetails: MOCK_SUPPLIERS as any,
    forcedPageBreaks: [],
  });

  const { blobUrl, isLoading: pdfLoading, error: pdfError } = usePdfPreview(
    user ? pdfElement : null,
    [key, user?.id, selectedHospital?.id],
    { debounceMs: 300 },
  );

  const isLoading = userLoading || hospitalsLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-medsync-blue" />
          <h1 className="text-xl font-semibold text-gray-800">
            Laboratório de Preview
          </h1>
          <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5 font-medium">
            Apenas para testes internos
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-sm font-medium text-gray-700 shrink-0">
                Hospital:
              </label>
              {hospitalsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <Select
                  value={selectedHospitalId || String(hospitals?.[0]?.id ?? "")}
                  onValueChange={setSelectedHospitalId}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Selecionar hospital..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals?.map((h: any) => (
                      <SelectItem key={h.id} value={String(h.id)}>
                        {h.name}
                        {h.logoUrl ? " ✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedHospital?.logoUrl && (
                <img
                  src={selectedHospital.logoUrl}
                  alt="Logo hospital"
                  className="h-8 object-contain opacity-70"
                />
              )}
              {!selectedHospital?.logoUrl && selectedHospital && (
                <span className="text-xs text-amber-600">sem logo cadastrado</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {userLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {user?.logoUrl ? (
                    <img src={user.logoUrl} alt="Logo médico" className="h-8 object-contain opacity-70" />
                  ) : (
                    <span className="text-amber-600">médico sem logo</span>
                  )}
                  {user?.signatureUrl ? (
                    <img src={user.signatureUrl} alt="Assinatura" className="h-6 object-contain opacity-70" />
                  ) : (
                    <span className="text-amber-600">sem assinatura</span>
                  )}
                  <span className="text-gray-400">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
              )}
              <Button
                onClick={handleTestar}
                disabled={isLoading}
                className="flex items-center gap-2 bg-medsync-blue hover:bg-medsync-blue/90 text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Testar
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Indicação Clínica (texto de teste)
            </label>
            <RichTextEditor
              value={draftText}
              onChange={setDraftText}
              placeholder="Digite a indicação clínica para testar..."
              minHeight="min-h-40"
            />
          </div>
          <p className="text-xs text-gray-400">
            Paciente, CID, CBHPM, OPME e fornecedor são fictícios e fixos. Hospital e dados do médico são reais (do seu login).
          </p>
        </div>

        <Tabs defaultValue="preview">
          <TabsList className="w-full">
            <TabsTrigger value="preview" className="flex-1 gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
              Preview HTML/CSS (V2)
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex-1 gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
              PDF Gerado (V2)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview">
            <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-y-auto flex flex-col items-center py-4" style={{ maxHeight: "85vh" }}>
              <div style={{ width: "794px" }}>
                <OrderPreviewV2
                  key={`preview-${key}`}
                  selectedPatient={MOCK_PATIENT as any}
                  selectedHospital={selectedHospital as any}
                  user={user as any}
                  clinicalJustification={committedText}
                  procedureType="eletiva"
                  procedureLaterality="direito"
                  multipleCids={MOCK_CIDS as any}
                  secondaryProcedures={MOCK_PROCEDURES as any}
                  selectedOpmeItems={MOCK_OPME as any}
                  supplierDetails={MOCK_SUPPLIERS as any}
                  orderId={469}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pdf">
            <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-y-auto flex flex-col items-center py-4" style={{ maxHeight: "85vh" }}>
              <PdfCanvasViewer
                blobUrl={blobUrl}
                isLoading={pdfLoading}
                error={pdfError}
                width={794}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
