import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Scissors,
  X,
  Trash2,
} from "lucide-react";
import { MarkdownViewer } from "@/components/markdown-editor";
import MedSyncLogo from "../assets/medsync-logo-new.svg";

interface CidItemWithAssociation {
  cid: {
    id: number;
    code: string;
    description: string;
    category?: string;
    sourceApproachId?: number;
    sourceProcedureId?: number;
  };
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
  sourceApproachId?: number;
  sourceProcedureId?: number;
}

interface OpmeItemWithAssociation {
  item?: {
    id: number;
    technicalName: string;
    commercialName?: string | null;
    anvisaCode?: string | null;
    sourceApproachId?: number;
    sourceProcedureId?: number;
  };
  technicalName?: string;
  quantity: number;
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
  sourceApproachId?: number;
  sourceProcedureId?: number;
}

interface SecondaryProcedure {
  procedure: {
    id: number;
    code: string;
    name: string;
    porte?: string | null;
    sourceApproachId?: number;
    sourceProcedureId?: number;
    sourceApproachName?: string;
    sourceProcedureName?: string;
    surgicalApproach?: { id: number; name: string } | null;
    surgicalProcedure?: { id: number; name: string } | null;
  };
  quantity: number;
  surgicalApproach?: { id: number; name: string } | null;
  surgicalProcedure?: { id: number; name: string } | null;
}

interface SupplierDetail {
  id: number;
  companyName: string;
  tradeName: string | null;
  cnpj: string;
  sourceApproachId?: number | null;
  sourceApproachName?: string | null;
  sourceProcedureId?: number | null;
  sourceProcedureName?: string | null;
}

interface Patient {
  id: number;
  fullName: string;
  birthDate: string;
  insurance?: string | null;
  insuranceNumber?: string | null;
  plan?: string | null;
}

interface Hospital {
  id: number;
  name: string;
  logoUrl?: string | null;
}

interface User {
  id: number;
  name?: string;
  crm?: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatureNote?: string | null;
}

export interface OrderPreviewV2Props {
  selectedPatient: Patient | null;
  selectedHospital: Hospital | null;
  user: User | null;
  clinicalJustification: string;
  procedureType: string;
  procedureLaterality: string;
  multipleCids: CidItemWithAssociation[];
  secondaryProcedures: SecondaryProcedure[];
  selectedOpmeItems: OpmeItemWithAssociation[];
  supplierDetails: SupplierDetail[];
  cbhpmAdditionalNotes?: string;
  opmeAdditionalNotes?: string;
  supplierAdditionalNotes?: string;
  orderId?: number;
  onForcedPageBreaksChange?: (breaks: Set<string>) => void;
}

const HEADER_HEIGHT_PX = 107; // PDF usa 80pt = ~107px
const FOOTER_HEIGHT_PT = 40; // igual ao PDF: fixedFooter height: 40pt
// A4 PDF: 842 pontos total, 702 pontos de conteúdo (80 topo + 60 base)
// Proporção conteúdo = 702/842 = 83.4%
// A4 em pixels (96dpi): 297mm = 1123px, 83.4% = ~936px
// Margem de segurança de 10% para compensar diferenças de renderização HTML vs react-pdf
// Reduzido para evitar corte de conteúdo na primeira página
const PAGE_CONTENT_HEIGHT_PX = 923;

const formatDateBR = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
};

interface ContentBlock {
  id: string;
  type:
    | "patient-data"
    | "title"
    | "justification-header"
    | "justification-paragraph"
    | "justification-spacer"
    | "justification-references"
    | "procedure-info"
    | "group-header"
    | "cids"
    | "cbhpm"
    | "opme"
    | "suppliers"
    | "general-notes"
    | "signature";
  content: React.ReactNode;
  estimatedHeight: number;
}

export function OrderPreviewV2({
  selectedPatient,
  selectedHospital,
  user,
  clinicalJustification,
  procedureType,
  procedureLaterality,
  multipleCids,
  secondaryProcedures,
  selectedOpmeItems,
  supplierDetails,
  cbhpmAdditionalNotes,
  opmeAdditionalNotes,
  supplierAdditionalNotes,
  orderId,
  onForcedPageBreaksChange,
}: OrderPreviewV2Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(
    new Map(),
  );
  // Estado para rastrear blocos que devem forçar nova página
  const [forcedPageBreaks, setForcedPageBreaks] = useState<Set<string>>(
    new Set(),
  );

  // Notificar componente pai quando as quebras mudam
  useEffect(() => {
    if (onForcedPageBreaksChange) {
      onForcedPageBreaksChange(forcedPageBreaks);
    }
  }, [forcedPageBreaks, onForcedPageBreaksChange]);

  const groupItemsByApproach = useCallback(() => {
    const groups: Map<
      string,
      {
        procedureId: number | null;
        procedureName: string;
        approachId: number | null;
        approachName: string;
        cids: CidItemWithAssociation[];
        cbhpmProcedures: SecondaryProcedure[];
        opmeItems: OpmeItemWithAssociation[];
        suppliers: SupplierDetail[];
      }
    > = new Map();

    if (multipleCids && multipleCids.length > 0) {
      multipleCids.forEach((cidItem) => {
        const approach =
          cidItem.surgicalApproach || (cidItem.cid as any)?.surgicalApproach;
        const approachId =
          approach?.id ||
          cidItem.sourceApproachId ||
          (cidItem.cid as any)?.sourceApproachId ||
          null;
        const approachName =
          approach?.name ||
          (cidItem as any).sourceApproachName ||
          (cidItem.cid as any)?.sourceApproachName ||
          "Itens Gerais";
        const procedure =
          cidItem.surgicalProcedure || (cidItem.cid as any)?.surgicalProcedure;
        const procedureId =
          procedure?.id ||
          cidItem.sourceProcedureId ||
          (cidItem.cid as any)?.sourceProcedureId ||
          null;
        const procedureName =
          procedure?.name ||
          (cidItem as any).sourceProcedureName ||
          (cidItem.cid as any)?.sourceProcedureName ||
          "";
        const key =
          procedureId && approachId
            ? `${procedureId}|${approachId}`
            : "general";

        if (!groups.has(key)) {
          groups.set(key, {
            procedureId,
            procedureName,
            approachId,
            approachName,
            cids: [],
            cbhpmProcedures: [],
            opmeItems: [],
            suppliers: [],
          });
        }
        groups.get(key)!.cids.push(cidItem);
      });
    }

    if (secondaryProcedures && secondaryProcedures.length > 0) {
      secondaryProcedures.forEach((proc) => {
        const approach =
          proc.surgicalApproach || proc.procedure?.surgicalApproach;
        const approachId =
          approach?.id || proc.procedure?.sourceApproachId || null;
        const approachName =
          approach?.name ||
          proc.procedure?.sourceApproachName ||
          "Itens Gerais";
        const procedure =
          proc.surgicalProcedure || proc.procedure?.surgicalProcedure;
        const procedureId =
          procedure?.id || proc.procedure?.sourceProcedureId || null;
        const procedureName =
          procedure?.name || proc.procedure?.sourceProcedureName || "";
        const key =
          procedureId && approachId
            ? `${procedureId}|${approachId}`
            : "general";

        if (!groups.has(key)) {
          groups.set(key, {
            procedureId,
            procedureName,
            approachId,
            approachName,
            cids: [],
            cbhpmProcedures: [],
            opmeItems: [],
            suppliers: [],
          });
        }
        groups.get(key)!.cbhpmProcedures.push(proc);
      });
    }

    if (selectedOpmeItems && selectedOpmeItems.length > 0) {
      selectedOpmeItems.forEach((opmeItem) => {
        const item = opmeItem.item || opmeItem;
        const approach =
          opmeItem.surgicalApproach || (item as any)?.surgicalApproach;
        const approachId =
          approach?.id || (item as any)?.sourceApproachId || null;
        const approachName =
          approach?.name || (item as any)?.sourceApproachName || "Itens Gerais";
        const procedure =
          opmeItem.surgicalProcedure || (item as any)?.surgicalProcedure;
        const procedureId =
          procedure?.id || (item as any)?.sourceProcedureId || null;
        const procedureName =
          procedure?.name || (item as any)?.sourceProcedureName || "";
        const key =
          procedureId && approachId
            ? `${procedureId}|${approachId}`
            : "general";

        if (!groups.has(key)) {
          groups.set(key, {
            procedureId,
            procedureName,
            approachId,
            approachName,
            cids: [],
            cbhpmProcedures: [],
            opmeItems: [],
            suppliers: [],
          });
        }
        groups.get(key)!.opmeItems.push(opmeItem);
      });
    }

    if (supplierDetails && supplierDetails.length > 0) {
      supplierDetails.forEach((supplier) => {
        const approachId = supplier.sourceApproachId || null;
        const approachName = supplier.sourceApproachName || "Itens Gerais";
        const procedureId = supplier.sourceProcedureId || null;
        const procedureName = supplier.sourceProcedureName || "";
        const key =
          procedureId && approachId
            ? `${procedureId}|${approachId}`
            : "general";

        if (!groups.has(key)) {
          groups.set(key, {
            procedureId,
            procedureName,
            approachId,
            approachName,
            cids: [],
            cbhpmProcedures: [],
            opmeItems: [],
            suppliers: [],
          });
        }
        groups.get(key)!.suppliers.push(supplier);
      });
    }

    const entries = Array.from(groups.entries());
    const generalEntry = entries.find(([key]) => key === "general");
    const otherEntries = entries.filter(([key]) => key !== "general");
    return generalEntry ? [...otherEntries, generalEntry] : otherEntries;
  }, [multipleCids, secondaryProcedures, selectedOpmeItems, supplierDetails]);

  const parseNotesBySubtitle = useCallback((notes: string | undefined) => {
    if (!notes) return { general: "", sections: new Map<string, string>() };

    const sections = new Map<string, string>();
    const lines = notes.split("\n");
    let currentKey: string | null = null;
    let currentContent: string[] = [];
    let generalContent: string[] = [];

    lines.forEach((line) => {
      const subtitleMatch = line.match(/^###\s*(.+?)\s*→\s*(.+?)\s*$/);
      if (subtitleMatch) {
        if (currentKey) {
          sections.set(currentKey, currentContent.join("\n").trim());
        } else if (currentContent.length > 0) {
          generalContent = [...generalContent, ...currentContent];
        }
        currentKey = `name:${subtitleMatch[1].trim()}-${subtitleMatch[2].trim()}`;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });

    if (currentKey) {
      sections.set(currentKey, currentContent.join("\n").trim());
    } else if (currentContent.length > 0) {
      generalContent = [...generalContent, ...currentContent];
    }

    return { general: generalContent.join("\n").trim(), sections };
  }, []);

  const parsePorteValue = (porte: string | null | undefined): number => {
    if (!porte) return 0;
    const match = porte.match(/^(\d+)([A-Za-z]?)$/);
    if (!match) return 0;
    const numero = parseInt(match[1], 10);
    const letra = match[2]?.toUpperCase() || "A";
    return numero * 100 + (letra.charCodeAt(0) - "A".charCodeAt(0) + 1);
  };

  const contentBlocks = useMemo((): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    const groupedItems = groupItemsByApproach();
    const hasMultipleGroups =
      groupedItems.length > 1 ||
      (groupedItems.length === 1 && groupedItems[0][0] !== "general");
    const cbhpmNotes = parseNotesBySubtitle(cbhpmAdditionalNotes);
    const opmeNotes = parseNotesBySubtitle(opmeAdditionalNotes);
    const supplierNotes = parseNotesBySubtitle(supplierAdditionalNotes);

    if (selectedPatient) {
      blocks.push({
        id: "patient-data",
        type: "patient-data",
        estimatedHeight: 100,
        content: (
          <div
            className="mb-5 bg-[#f8fafc] rounded border border-[#e2e8f0]"
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              padding: "11px",
            }}
          >
            <h3
              className="font-bold mb-2 border-b border-[#d1d5db] pb-2"
              style={{ fontSize: "12pt", color: "#1f2937" }}
            >
              Dados do Paciente
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div
                style={{ fontSize: "9pt", color: "#334155", lineHeight: 1.3 }}
              >
                <p className="mb-0.5">
                  <span className="font-bold">Nome:</span>{" "}
                  {selectedPatient.fullName}
                </p>
                <p className="mb-0.5">
                  <span className="font-bold">Data de Nascimento:</span>{" "}
                  {formatDateBR(selectedPatient.birthDate)}
                </p>
                <p className="mb-0.5">
                  <span className="font-bold">Idade:</span>{" "}
                  {new Date().getFullYear() -
                    new Date(selectedPatient.birthDate).getFullYear()}{" "}
                  anos
                </p>
              </div>
              <div
                style={{ fontSize: "9pt", color: "#334155", lineHeight: 1.3 }}
              >
                {selectedPatient.insurance && (
                  <p className="mb-0.5">
                    <span className="font-bold">Plano de Saúde:</span>{" "}
                    {selectedPatient.insurance}
                  </p>
                )}
                {selectedPatient.insuranceNumber && (
                  <p className="mb-0.5">
                    <span className="font-bold">Número da Carteirinha:</span>{" "}
                    {selectedPatient.insuranceNumber}
                  </p>
                )}
                {selectedPatient.plan && (
                  <p className="mb-0.5">
                    <span className="font-bold">Tipo do Plano:</span>{" "}
                    {selectedPatient.plan}
                  </p>
                )}
              </div>
            </div>
          </div>
        ),
      });
    }

    blocks.push({
      id: "title",
      type: "title",
      estimatedHeight: 30,
      content: (
        <h2
          className="font-bold text-center uppercase"
          style={{
            fontSize: "13pt",
            color: "#1e3a8a",
            fontFamily: "Helvetica, Arial, sans-serif",
            marginBottom: "7px",
            paddingBottom: "8pt",
          }}
        >
          SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
        </h2>
      ),
    });

    if (clinicalJustification) {
      // Divide o texto em seções: parágrafos normais e referências bibliográficas
      const referencesPattern =
        /^(REFERÊNCIAS BIBLIOGRÁFICAS|REFERÊNCIAS|REFERENCIAS|BIBLIOGRAFIA|REFERENCES):\s*$/im;
      const parts = clinicalJustification.split(referencesPattern);
      const mainText = parts[0] || "";
      const referencesSection =
        parts.length > 2 ? parts[2] : parts.length > 1 ? parts[1] : "";
      const hasReferences = referencesPattern.test(clinicalJustification);

      // Adiciona cabeçalho da seção de Indicação Clínica
      blocks.push({
        id: "justification-header",
        type: "justification-header",
        estimatedHeight: 25,
        content: (
          <div
            style={{
              fontSize: "10pt",
              fontWeight: "bold",
              color: "#374151",
              fontFamily: "Helvetica, Arial, sans-serif",
              paddingLeft: "5pt",
              paddingRight: "5pt",
              lineHeight: "1",
              marginBottom: "9px",
            }}
          >
            INDICAÇÃO CLÍNICA:
          </div>
        ),
      });

      // Divide o texto em linhas individuais para permitir quebra de página fluida
      // (mesmo comportamento do PDF que quebra parágrafos entre páginas)
      const allLines = mainText.split(/\n/).map((l) => l.replace(/\s+$/, ""));
      let lineBlockIndex = 0;
      let prevWasBlank = false;

      allLines.forEach((line, idx) => {
        const isBlankLine = line.trim().length === 0;

        if (isBlankLine) {
          // Colapsa linhas em branco consecutivas num único spacer (igual ao PDF: split /\n\s*\n/)
          // PDF: Text marginBottom 15pt + View marginBottom 8pt = ~31px; HTML: 8px (marginBottom do texto) + 23px = 31px
          if (!prevWasBlank) {
            blocks.push({
              id: `justification-line-${lineBlockIndex}`,
              type: "justification-spacer",
              estimatedHeight: 0,
              content: <div style={{ height: "0" }} />,
            });
          }
          prevWasBlank = true;
        } else {
          prevWasBlank = false;
          const lineWraps = Math.ceil(line.length / 95);
          const lineHeight = lineWraps * 14;
          blocks.push({
            id: `justification-line-${lineBlockIndex}`,
            type: "justification-paragraph",
            estimatedHeight: Math.max(14, lineHeight),
            content: (
              <div
                className="text-justify"
                style={{
                  fontSize: "9pt",
                  color: "#000000",
                  lineHeight: 1.54,
                  fontFamily: "Helvetica, Arial, sans-serif",
                  paddingLeft: "5pt",
                  paddingRight: "5pt",
                  marginBottom: "4pt",
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                  wordSpacing: "-1px",
                }}
              >
                {line}
              </div>
            ),
          });
        }
        lineBlockIndex++;
      });

      // Adiciona seção de referências bibliográficas como bloco separado
      if (hasReferences && referencesSection.trim()) {
        const refLines = referencesSection.split("\n").filter((l) => l.trim());
        const refHeight = refLines.length * 22 + 35;
        blocks.push({
          id: "justification-references",
          type: "justification-references",
          estimatedHeight: Math.max(50, refHeight),
          content: (
            <div
              style={{
                fontSize: "9pt",
                color: "#000000",
                lineHeight: 1.4,
                fontFamily: "Helvetica, Arial, sans-serif",
                paddingLeft: "5pt",
                paddingRight: "5pt",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "9pt",
                  fontWeight: "bold",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                REFERÊNCIAS BIBLIOGRÁFICAS:
              </div>
              {refLines.map((ref, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: "8pt",
                    color: "#4b5563",
                    marginBottom: "4px",
                    paddingLeft: "10px",
                  }}
                >
                  {ref.trim()}
                </div>
              ))}
            </div>
          ),
        });
      }
    }

    blocks.push({
      id: "procedure-info",
      type: "procedure-info",
      estimatedHeight: 60,
      content: (
        <div
          className="flex gap-5"
          style={{
            fontFamily: "Helvetica, Arial, sans-serif",
            paddingLeft: "5pt",
            paddingRight: "5pt",
            marginTop: "18pt",
            marginBottom: "8pt",
          }}
        >
          <div className="flex-1">
            <p
              className="font-bold"
              style={{ fontSize: "9pt", color: "#374151", marginBottom: "4pt" }}
            >
              Caráter do Procedimento:
            </p>
            <p
              className="pl-4"
              style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.3 }}
            >
              {procedureType === "eletiva"
                ? "Eletivo"
                : procedureType === "urgencia"
                  ? "Urgência"
                  : procedureType === "emergencia"
                    ? "Emergência"
                    : ""}
            </p>
          </div>
          <div className="flex-1">
            <p
              className="font-bold mb-1"
              style={{ fontSize: "9pt", color: "#374151" }}
            >
              Lateralidade do Procedimento:
            </p>
            <p
              className="pl-4"
              style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.3 }}
            >
              {procedureLaterality === "direito"
                ? "Direito"
                : procedureLaterality === "esquerdo"
                  ? "Esquerdo"
                  : procedureLaterality === "bilateral"
                    ? "Bilateral"
                    : procedureLaterality === "nao_se_aplica"
                      ? "Não se aplica"
                      : ""}
            </p>
          </div>
        </div>
      ),
    });

    groupedItems.forEach(([key, group], groupIndex) => {
      if (hasMultipleGroups && group.approachId) {
        blocks.push({
          id: `group-header-${key}`,
          type: "group-header",
          estimatedHeight: 30,
          content: (
            <div
              className={`${groupIndex > 0 ? "mt-4 pt-4 border-t border-gray-200" : ""}`}
              style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
            >
              <p
                className="font-bold mb-2"
                style={{ fontSize: "12pt", color: "#2ca8e0" }}
              >
                Procedimento {groupIndex + 1}
              </p>
            </div>
          ),
        });
      }

      if (group.cids.length > 0) {
        blocks.push({
          id: `cids-${key}`,
          type: "cids",
          estimatedHeight: 30 + group.cids.length * 20,
          content: (
            <div
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                paddingLeft: "5pt",
                paddingRight: "5pt",
                marginBottom: "8pt",
              }}
            >
              <p
                className="font-bold mb-1"
                style={{ fontSize: "9pt", color: "#374151" }}
              >
                Códigos CID-10:
              </p>
              <div
                className="pl-4 space-y-0.5"
                style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.3 }}
              >
                {group.cids.map((cidItem, index) => (
                  <p key={cidItem.cid?.id || index}>
                    {cidItem.cid?.code} - {cidItem.cid?.description}
                  </p>
                ))}
              </div>
            </div>
          ),
        });
      }

      if (group.cbhpmProcedures.length > 0) {
        const sortedProcs = [...group.cbhpmProcedures].sort(
          (a, b) =>
            parsePorteValue(b.procedure?.porte) -
            parsePorteValue(a.procedure?.porte),
        );
        const cbhpmNote = cbhpmNotes.sections.get(
          `name:${group.procedureName}-${group.approachName}`,
        );

        blocks.push({
          id: `cbhpm-${key}`,
          type: "cbhpm",
          estimatedHeight: 30 + sortedProcs.length * 16 + (cbhpmNote ? 40 : 0),
          content: (
            <div
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                paddingLeft: "5pt",
                paddingRight: "5pt",
                marginBottom: "8pt",
              }}
            >
              <p
                className="font-bold mb-1"
                style={{ fontSize: "9pt", color: "#374151" }}
              >
                Procedimentos Cirúrgicos Necessários:
              </p>
              <div
                className="pl-4 space-y-0.5"
                style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.3 }}
              >
                {sortedProcs.map((proc, index) => (
                  <p key={index}>
                    {proc.quantity} x {proc.procedure?.code} -{" "}
                    {proc.procedure?.name}
                    {index === 0 && sortedProcs.length > 1
                      ? " (Principal)"
                      : ""}
                  </p>
                ))}
              </div>
              {cbhpmNote && (
                <div className="mt-1">
                  <p
                    className="font-bold"
                    style={{ fontSize: "9pt", color: "#374151" }}
                  >
                    Observações:
                  </p>
                  <div
                    className="pl-4"
                    style={{
                      fontSize: "9pt",
                      color: "#1f2937",
                      lineHeight: 1.4,
                    }}
                  >
                    <MarkdownViewer content={cbhpmNote} className="prose-xs" />
                  </div>
                </div>
              )}
            </div>
          ),
        });
      }

      if (group.opmeItems.length > 0) {
        const opmeNote = opmeNotes.sections.get(
          `name:${group.procedureName}-${group.approachName}`,
        );

        blocks.push({
          id: `opme-${key}`,
          type: "opme",
          estimatedHeight:
            30 + group.opmeItems.length * 16 + (opmeNote ? 40 : 0),
          content: (
            <div
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                paddingLeft: "5pt",
                paddingRight: "5pt",
                marginBottom: "5pt",
              }}
            >
              <p
                className="font-bold "
                style={{
                  fontSize: "9pt",
                  color: "#374151",
                  marginBottom: "1pt",
                }}
              >
                Lista de Materiais Necessários:
              </p>
              <div
                className="flex flex-col pl-4 gap-0.5"
                style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.3 }}
              >
                {group.opmeItems.map((item, index) => (
                  <p key={index}>
                    {item.quantity} x{" "}
                    {item.technicalName ||
                      item.item?.technicalName ||
                      "Material não especificado"}
                  </p>
                ))}
              </div>
              {opmeNote && (
                <div className="mt-1">
                  <p
                    className="font-bold"
                    style={{ fontSize: "9pt", color: "#374151" }}
                  >
                    Observações:
                  </p>
                  <div
                    className="pl-4"
                    style={{
                      fontSize: "9pt",
                      color: "#1f2937",
                      lineHeight: 1.4,
                    }}
                  >
                    <MarkdownViewer content={opmeNote} className="prose-xs" />
                  </div>
                </div>
              )}
            </div>
          ),
        });
      }

      if (group.suppliers.length > 0) {
        const supplierNote = supplierNotes.sections.get(
          `name:${group.procedureName}-${group.approachName}`,
        );

        blocks.push({
          id: `suppliers-${key}`,
          type: "suppliers",
          estimatedHeight:
            30 + group.suppliers.length * 16 + (supplierNote ? 40 : 0),
          content: (
            <div
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                paddingLeft: "5pt",
                paddingRight: "5pt",
                marginBottom: "16px",
              }}
            >
              <p
                className="font-bold mb-1"
                style={{ fontSize: "9pt", color: "#374151" }}
              >
                Fornecedores:
              </p>
              <div
                className="flex flex-col pl-4 gap-0.5"
                style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.3 }}
              >
                {group.suppliers.map((supplier, index) => (
                  <p key={supplier.id || index}>
                    {index + 1}. {supplier.tradeName || supplier.companyName}
                  </p>
                ))}
              </div>
              {supplierNote && (
                <div className="mt-1">
                  <p
                    className="font-bold"
                    style={{ fontSize: "9pt", color: "#374151" }}
                  >
                    Observações:
                  </p>
                  <div
                    className="pl-4"
                    style={{
                      fontSize: "9pt",
                      color: "#1f2937",
                      lineHeight: 1.4,
                    }}
                  >
                    <MarkdownViewer
                      content={supplierNote}
                      className="prose-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ),
        });
      }
    });

    const cbhpmGeneral = cbhpmNotes.general;
    const opmeGeneral = opmeNotes.general;
    const supplierGeneral = supplierNotes.general;

    if (cbhpmGeneral || opmeGeneral || supplierGeneral) {
      blocks.push({
        id: "general-notes",
        type: "general-notes",
        estimatedHeight: 60,
        content: (
          <div
            className="mb-3"
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              paddingLeft: "5pt",
              paddingRight: "5pt",
            }}
          >
            {cbhpmGeneral && (
              <div className="mb-2">
                <p
                  className="font-bold"
                  style={{ fontSize: "9pt", color: "#374151" }}
                >
                  Observações Gerais sobre Procedimentos:
                </p>
                <div
                  className="pl-4"
                  style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.4 }}
                >
                  <MarkdownViewer content={cbhpmGeneral} className="prose-xs" />
                </div>
              </div>
            )}
            {opmeGeneral && (
              <div className="mb-2">
                <p
                  className="font-bold"
                  style={{ fontSize: "9pt", color: "#374151" }}
                >
                  Observações Gerais sobre Materiais:
                </p>
                <div
                  className="pl-4"
                  style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.4 }}
                >
                  <MarkdownViewer content={opmeGeneral} className="prose-xs" />
                </div>
              </div>
            )}
            {supplierGeneral && (
              <div className="mb-2">
                <p
                  className="font-bold"
                  style={{ fontSize: "9pt", color: "#374151" }}
                >
                  Observações Gerais sobre Fornecedores:
                </p>
                <div
                  className="pl-4"
                  style={{ fontSize: "9pt", color: "#1f2937", lineHeight: 1.4 }}
                >
                  <MarkdownViewer
                    content={supplierGeneral}
                    className="prose-xs"
                  />
                </div>
              </div>
            )}
          </div>
        ),
      });
    }

    blocks.push({
      id: "signature",
      type: "signature",
      estimatedHeight: 200,
      content: (
        <div
          style={{
            marginTop: "40px",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <div className="text-right" style={{ marginBottom: "33px" }}>
            <p style={{ fontSize: "9pt", color: "#1f2937" }}>
              {selectedHospital?.name?.includes("Niterói")
                ? "Niterói"
                : "Rio de Janeiro"}
              , {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
          {/* Assinatura: PDF usa 240pt x 120pt, marginBottom -20pt */}
          <div className="flex flex-col items-center">
            {user?.signatureUrl && (
              <img
                src={user.signatureUrl}
                alt="Assinatura do Médico"
                className="object-contain"
                style={{
                  width: "320px",
                  height: "160px",
                  marginBottom: "-27px",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            {user && (
              <>
                <div
                  className="border-t border-gray-500"
                  style={{ width: "200px", marginBottom: "4px" }}
                ></div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: "9pt",
                    color: "#1f2937",
                    marginBottom: "2px",
                    textAlign: "center",
                  }}
                >
                  {user.name?.toUpperCase()}
                </p>
                <div
                  className="text-center"
                  style={{ fontSize: "9pt", color: "#6b7280" }}
                >
                  {user.signatureNote ? (
                    user.signatureNote.split("\n").map((line, index) => (
                      <p key={index} style={{ marginBottom: "2px" }}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p style={{ marginBottom: "2px" }}>
                      ORTOPEDIA E TRAUMATOLOGIA
                    </p>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "9pt",
                    color: "#6b7280",
                    marginBottom: "2px",
                    textAlign: "center",
                  }}
                >
                  CRM {user.crm}
                </p>
              </>
            )}
          </div>
        </div>
      ),
    });

    return blocks;
  }, [
    selectedPatient,
    selectedHospital,
    user,
    clinicalJustification,
    procedureType,
    procedureLaterality,
    groupItemsByApproach,
    parseNotesBySubtitle,
    cbhpmAdditionalNotes,
    opmeAdditionalNotes,
    supplierAdditionalNotes,
  ]);

  const measurementRef = useRef<HTMLDivElement>(null);
  const [isMeasuring, setIsMeasuring] = useState(true);
  const [hoverDividerId, setHoverDividerId] = useState<string | null>(null);

  useEffect(() => {
    const measureAllElements = () => {
      if (!measurementRef.current) return;

      const newHeights = new Map<string, number>();
      const elements = Array.from(
        measurementRef.current.querySelectorAll("[data-block-id]"),
      ) as HTMLElement[];

      elements.forEach((el, index) => {
        const blockId = el.getAttribute("data-block-id");
        if (!blockId) return;
        if (index < elements.length - 1) {
          // Diferença de offsetTop entre elementos consecutivos captura
          // a altura real do bloco incluindo todas as margens CSS
          newHeights.set(blockId, elements[index + 1].offsetTop - el.offsetTop);
        } else {
          // Último bloco: usa getBoundingClientRect (sem margem inferior necessária)
          newHeights.set(blockId, el.getBoundingClientRect().height);
        }
      });

      if (newHeights.size > 0 && newHeights.size === contentBlocks.length) {
        setMeasuredHeights(newHeights);
        setIsMeasuring(false);
      }
    };

    setIsMeasuring(true);
    const timer = setTimeout(measureAllElements, 150);
    return () => clearTimeout(timer);
  }, [contentBlocks]);

  const pages = useMemo(() => {
    const result: ContentBlock[][] = [];
    let currentPageBlocks: ContentBlock[] = [];
    let currentPageHeight = 0;

    const headerTypes = new Set(["justification-header", "group-header"]);

    contentBlocks.forEach((block, index) => {
      const blockHeight =
        measuredHeights.get(block.id) || block.estimatedHeight;
      const hasForcedBreak = forcedPageBreaks.has(block.id);

      // Se este bloco tem quebra forçada e há blocos na página atual, criar nova página
      if (hasForcedBreak && currentPageBlocks.length > 0) {
        result.push(currentPageBlocks);
        currentPageBlocks = [];
        currentPageHeight = 0;
      }
      // Se não cabe na página atual e há blocos, criar nova página
      else if (
        currentPageHeight + blockHeight > PAGE_CONTENT_HEIGHT_PX &&
        currentPageBlocks.length > 0
      ) {
        // Anti-órfão: se o último bloco da página atual é um header (ex: "INDICAÇÃO CLÍNICA:"),
        // mover esse header para a próxima página junto com o conteúdo que não coube
        const lastBlock = currentPageBlocks[currentPageBlocks.length - 1];
        if (
          lastBlock &&
          headerTypes.has(lastBlock.type) &&
          currentPageBlocks.length > 1
        ) {
          const orphanHeader = currentPageBlocks.pop()!;
          const orphanHeight =
            measuredHeights.get(orphanHeader.id) ||
            orphanHeader.estimatedHeight;
          result.push(currentPageBlocks);
          currentPageBlocks = [orphanHeader];
          currentPageHeight = orphanHeight;
        } else {
          result.push(currentPageBlocks);
          currentPageBlocks = [];
          currentPageHeight = 0;
        }
      }

      currentPageBlocks.push(block);
      currentPageHeight += blockHeight;
    });

    if (currentPageBlocks.length > 0) {
      result.push(currentPageBlocks);
    }

    return result.length > 0 ? result : [[]];
  }, [contentBlocks, measuredHeights, forcedPageBreaks]);

  const firstEligibleBreakIndex = useMemo(() => {
    let inJustification = false;
    let firstTextLineIndex = -1;
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      if (block.type === "justification-header") {
        inJustification = true;
        continue;
      }
      if (
        inJustification &&
        (block.type === "justification-paragraph" ||
          block.type === "justification-spacer")
      ) {
        if (
          firstTextLineIndex === -1 &&
          block.estimatedHeight > 10 &&
          block.type !== "justification-spacer"
        ) {
          firstTextLineIndex = i;
        } else if (
          firstTextLineIndex >= 0 &&
          block.type !== "justification-spacer"
        ) {
          return i;
        }
        continue;
      }
      if (
        inJustification &&
        block.type !== "justification-paragraph" &&
        block.type !== "justification-spacer"
      ) {
        return i;
      }
    }
    return contentBlocks.length;
  }, [contentBlocks]);

  const togglePageBreak = useCallback(
    (blockId: string) => {
      const blockIndex = contentBlocks.findIndex((b) => b.id === blockId);
      if (blockIndex <= 0) return;
      if (blockIndex < firstEligibleBreakIndex) return;

      setForcedPageBreaks((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(blockId)) {
          newSet.delete(blockId);
        } else {
          newSet.add(blockId);
        }
        return newSet;
      });
    },
    [contentBlocks, firstEligibleBreakIndex],
  );

  const clearAllPageBreaks = useCallback(() => {
    setForcedPageBreaks(new Set());
  }, []);

  const totalPages = pages.length;
  const currentPageBlocks = pages[currentPage - 1] || [];

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const Header = () => (
    <div
      className="flex items-center justify-between overflow-hidden"
      style={{
        height: `${HEADER_HEIGHT_PX}px`,
        fontFamily: "Helvetica, Arial, sans-serif",
        marginTop: "20px",
      }}
    >
      {/* Logo Hospital: PDF usa 80pt x 60pt → 107px x 80px na tela (794px/595pt=1.334) */}
      <div
        className="flex items-center justify-start overflow-hidden"
        style={{ width: "107px", height: "80px", marginLeft: "24px" }}
      >
        {selectedHospital?.logoUrl ? (
          <img
            src={selectedHospital.logoUrl}
            alt={`Logo do ${selectedHospital.name}`}
            style={{
              maxWidth: "107px",
              maxHeight: "80px",
              objectFit: "contain",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="text-center"
            style={{ fontSize: "8pt", color: "#666666" }}
          >
            {selectedHospital?.name || "Hospital"}
          </div>
        )}
      </div>
      {/* Logo Médico: PDF usa 192pt x 144pt → 256px x 192px na tela (794px/595pt=1.334) */}
      <div
        className="flex items-center justify-end overflow-visible"
        style={{ width: "256px", height: "96px", marginRight: "24px" }}
      >
        {user?.logoUrl && (
          <img
            src={user.logoUrl}
            alt="Logo do Médico"
            style={{
              maxWidth: "256px",
              maxHeight: "192px",
              objectFit: "contain",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
    </div>
  );

  const Footer = ({ pageNum, total }: { pageNum: number; total: number }) => (
    <div
      style={{
        height: `${FOOTER_HEIGHT_PT}pt`,
        paddingTop: "8pt",
        paddingLeft: "0pt",
        paddingRight: "0pt",
        borderTop: "1pt solid #e0e0e0",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "Helvetica, Arial, sans-serif",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "4pt",
        }}
      >
        <img
          src={MedSyncLogo}
          alt="Logo MedSync"
          style={{ height: "13pt", objectFit: "contain" }}
        />
        <span style={{ fontSize: "8pt", color: "#6b7280" }}>v2.5.3</span>
      </div>
      <div style={{ flex: 1, textAlign: "center" }}>
        <span style={{ fontSize: "8pt", color: "#6b7280" }}>
          {orderId ? `Pedido #${orderId}` : ""} - Gerado em{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </span>
      </div>
      <div style={{ flex: 1, textAlign: "right" }}>
        <span style={{ fontSize: "8pt", color: "#6b7280" }}>
          Página {pageNum} de {total}
        </span>
      </div>
    </div>
  );

  return (
    <div className="mb-6 text-foreground">
      {/* Hidden measurement container - renders all blocks to measure their heights */}
      <div
        ref={measurementRef}
        className="absolute opacity-0 pointer-events-none"
        style={{
          width: "210mm",
          paddingLeft: "20pt",
          paddingRight: "20pt",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
        aria-hidden="true"
      >
        {contentBlocks.map((block) => (
          <div key={block.id} data-block-id={block.id}>
            {block.content}
          </div>
        ))}
      </div>

      <h3 className="text-lg font-medium text-foreground">
        Visualização do Pedido
      </h3>
      <p className="text-sm text-muted-foreground">
        Revise os dados do pedido antes de finalizar
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">
          Prévia A4 (210 x 297 mm) - Página {currentPage} de {totalPages}
          {isMeasuring && " (calculando...)"}
        </p>
        {forcedPageBreaks.size > 0 && (
          <button
            onClick={clearAllPageBreaks}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Limpar {forcedPageBreaks.size} quebra
            {forcedPageBreaks.size > 1 ? "s" : ""}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground/60 mt-0.5 italic">
        Passe o mouse entre as seções para inserir uma quebra de página
      </p>

      <div className="flex items-center justify-center gap-2 my-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="h-8 px-3"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                className={`h-8 w-8 p-0 ${pageNum === currentPage ? "bg-medsync-blue hover:bg-medsync-blue/90 text-white" : ""}`}
              >
                {pageNum}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="h-8 px-3"
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center mb-10">
        <div
          className="bg-white shadow-xl border border-gray-300 flex flex-col"
          style={{
            //width: "210mm", // Mudei para alagargar um pouco mais a pagina
            width: "210mm",
            height: "297mm",
            overflow: "hidden",
          }}
        >
          <Header />

          <div
            ref={contentRef}
            className="flex-1 overflow-hidden"
            style={{
              height: `${PAGE_CONTENT_HEIGHT_PX}px`,
              paddingLeft: "20pt",
              paddingRight: "20pt",
              paddingBottom: "12px",
            }}
          >
            {currentPageBlocks.map((block, blockIndex) => {
              const isFirstBlockOnPage = blockIndex === 0;
              const blockHasForcedBreak = forcedPageBreaks.has(block.id);
              const isFixedBlock =
                block.type === "patient-data" ||
                block.type === "title" ||
                block.type === "signature";

              const nextBlock =
                blockIndex < currentPageBlocks.length - 1
                  ? currentPageBlocks[blockIndex + 1]
                  : null;

              // Se nextBlock é um spacer, encontra o próximo bloco não-spacer
              // para ser o alvo real da quebra de página (suporte ao Enter no richtext)
              const breakTargetBlock =
                nextBlock?.type === "justification-spacer"
                  ? (() => {
                      for (
                        let k = blockIndex + 2;
                        k < currentPageBlocks.length;
                        k++
                      ) {
                        if (
                          currentPageBlocks[k].type !== "justification-spacer"
                        ) {
                          return currentPageBlocks[k];
                        }
                      }
                      return null;
                    })()
                  : nextBlock;

              const nextBlockIsFixed =
                nextBlock &&
                (nextBlock.type === "patient-data" ||
                  nextBlock.type === "title" ||
                  nextBlock.type === "signature");
              const nextGlobalIndex = nextBlock
                ? contentBlocks.findIndex((b) => b.id === nextBlock.id)
                : -1;
              const breakTargetGlobalIndex = breakTargetBlock
                ? contentBlocks.findIndex((b) => b.id === breakTargetBlock.id)
                : nextGlobalIndex;
              const nextBlockHasBreak = breakTargetBlock
                ? forcedPageBreaks.has(breakTargetBlock.id)
                : false;
              const nextBlockInProtectedZone =
                breakTargetGlobalIndex < firstEligibleBreakIndex;
              const showDividerAfter =
                nextBlock &&
                breakTargetBlock &&
                !nextBlockIsFixed &&
                nextGlobalIndex > 0 &&
                !nextBlockHasBreak &&
                !nextBlockInProtectedZone &&
                block.type !== "justification-spacer" &&
                !(
                  block.type === "justification-paragraph" &&
                  breakTargetBlock.type === "procedure-info"
                ) &&
                !(
                  block.type === "justification-references" &&
                  breakTargetBlock.type === "procedure-info"
                );

              return (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  className="relative"
                >
                  {isFirstBlockOnPage && blockHasForcedBreak && (
                    <div className="flex items-center gap-2 -mt-1 mb-1">
                      <div className="flex-1 border-t-2 border-dashed border-amber-400" />
                      <button
                        onClick={() => togglePageBreak(block.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors cursor-pointer group/break"
                        title="Clique para remover esta quebra de página"
                      >
                        <Scissors className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          Quebra de página
                        </span>
                        <X className="h-3 w-3 opacity-0 group-hover/break:opacity-100 transition-opacity text-amber-600" />
                      </button>
                      <div className="flex-1 border-t-2 border-dashed border-amber-400" />
                    </div>
                  )}

                  {block.content}

                  {showDividerAfter &&
                    (() => {
                      const isEnterBased =
                        nextBlock?.type === "justification-spacer";
                      return (
                        <div
                          className={`relative ${isEnterBased ? "divider-paragraph-enter" : "divider-paragraph-shift"}`}
                          style={
                            isEnterBased
                              ? { marginTop: "1.5pt", marginBottom: "1.5pt" }
                              : { marginTop: "-5pt", marginBottom: "-5pt" }
                          }
                          onMouseEnter={() =>
                            setHoverDividerId(breakTargetBlock!.id)
                          }
                          onMouseLeave={() => setHoverDividerId(null)}
                        >
                          {hoverDividerId === breakTargetBlock!.id ? (
                            <button
                              onClick={() =>
                                togglePageBreak(breakTargetBlock!.id)
                              }
                              className="w-full flex items-center gap-2 py-1 cursor-pointer group/btn"
                            >
                              <div className="flex-1 border-t-2 border-dashed border-blue-300 group-hover/btn:border-blue-400 transition-colors" />
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-100 hover:border-blue-300 transition-colors whitespace-nowrap">
                                <Scissors className="h-3 w-3" />
                                Inserir quebra de página
                              </span>
                              <div className="flex-1 border-t-2 border-dashed border-blue-300 group-hover/btn:border-blue-400 transition-colors" />
                            </button>
                          ) : (
                            <div style={{ height: "6pt" }} />
                          )}
                        </div>
                      );
                    })()}
                </div>
              );
            })}
          </div>

          <Footer pageNum={currentPage} total={totalPages} />
        </div>
      </div>
    </div>
  );
}

export default OrderPreviewV2;
