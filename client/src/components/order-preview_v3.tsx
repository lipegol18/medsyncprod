import { useState, useCallback, useMemo, useEffect, createElement } from "react";
import {
  Scissors,
  Trash2,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { PdfViewer } from "@/components/pdf-viewer";
import { usePdfPreview } from "@/hooks/usePdfPreview";
import { OrderPDFDocumentV2 } from "@/components/order-pdf-document-v2";

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
  crm?: string | number | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatureNote?: string | null;
}

export interface OrderPreviewV3Props {
  orderId?: number;
  selectedPatient: Patient | null;
  selectedHospital: Hospital | null;
  user: User | null;
  clinicalJustification: string | null;
  procedureType: string;
  procedureLaterality: string | null;
  multipleCids: CidItemWithAssociation[];
  secondaryProcedures: SecondaryProcedure[];
  selectedOpmeItems: OpmeItemWithAssociation[];
  supplierDetails: SupplierDetail[];
  cbhpmAdditionalNotes?: string;
  opmeAdditionalNotes?: string;
  supplierAdditionalNotes?: string;
  onForcedPageBreaksChange?: (breaks: Set<string>) => void;
}

interface BreakableSection {
  id: string;
  label: string;
  protected?: boolean;
}

export function OrderPreviewV3({
  orderId,
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
  onForcedPageBreaksChange,
}: OrderPreviewV3Props) {
  const [forcedPageBreaks, setForcedPageBreaks] = useState<Set<string>>(
    new Set(),
  );
  const [showBreakPanel, setShowBreakPanel] = useState(true);

  useEffect(() => {
    onForcedPageBreaksChange?.(forcedPageBreaks);
  }, [forcedPageBreaks, onForcedPageBreaksChange]);

  const groupItemsByApproach = useCallback(() => {
    const groups = new Map<
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
    >();

    if (multipleCids?.length > 0) {
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
          cidItem.surgicalProcedure ||
          (cidItem.cid as any)?.surgicalProcedure;
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

    if (secondaryProcedures?.length > 0) {
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

    if (selectedOpmeItems?.length > 0) {
      selectedOpmeItems.forEach((item) => {
        const approach =
          item.surgicalApproach || (item.item as any)?.surgicalApproach;
        const approachId =
          approach?.id ||
          item.sourceApproachId ||
          (item.item as any)?.sourceApproachId ||
          null;
        const approachName =
          approach?.name ||
          (item as any).sourceApproachName ||
          (item.item as any)?.sourceApproachName ||
          "Itens Gerais";
        const procedure =
          item.surgicalProcedure || (item.item as any)?.surgicalProcedure;
        const procedureId =
          procedure?.id ||
          item.sourceProcedureId ||
          (item.item as any)?.sourceProcedureId ||
          null;
        const procedureName =
          procedure?.name ||
          (item as any).sourceProcedureName ||
          (item.item as any)?.sourceProcedureName ||
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
        groups.get(key)!.opmeItems.push(item);
      });
    }

    if (supplierDetails?.length > 0) {
      supplierDetails.forEach((supplier) => {
        const key =
          supplier.sourceProcedureId && supplier.sourceApproachId
            ? `${supplier.sourceProcedureId}|${supplier.sourceApproachId}`
            : "general";

        if (!groups.has(key)) {
          groups.set(key, {
            procedureId: supplier.sourceProcedureId || null,
            procedureName: supplier.sourceProcedureName || "",
            approachId: supplier.sourceApproachId || null,
            approachName: supplier.sourceApproachName || "Itens Gerais",
            cids: [],
            cbhpmProcedures: [],
            opmeItems: [],
            suppliers: [],
          });
        }
        groups.get(key)!.suppliers.push(supplier);
      });
    }

    return Array.from(groups.entries());
  }, [multipleCids, secondaryProcedures, selectedOpmeItems, supplierDetails]);

  const breakableSections = useMemo((): BreakableSection[] => {
    const sections: BreakableSection[] = [];

    sections.push({ id: "title", label: "Titulo", protected: true });
    sections.push({
      id: "justification-header",
      label: "Indicacao Clinica (cabecalho)",
      protected: true,
    });

    if (clinicalJustification && clinicalJustification.trim()) {
      const referencesPattern =
        /^(REFERÊNCIAS BIBLIOGRÁFICAS|REFERÊNCIAS|REFERENCIAS|BIBLIOGRAFIA|REFERENCES):\s*$/im;
      const parts = clinicalJustification.split(referencesPattern);
      const mainText = parts[0] || "";
      const hasReferences = referencesPattern.test(clinicalJustification);

      const paragraphs = mainText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      paragraphs.forEach((paragraph, index) => {
        const preview =
          paragraph.length > 60
            ? paragraph.substring(0, 60) + "..."
            : paragraph;
        sections.push({
          id: `justification-paragraph-${index}`,
          label: `Par. ${index + 1}: ${preview}`,
          protected: index === 0,
        });
      });

      if (hasReferences) {
        sections.push({
          id: "justification-references",
          label: "Referencias Bibliograficas",
        });
      }
    }

    sections.push({
      id: "procedure-info",
      label: "Informacoes do Procedimento",
    });

    const groupedItems = groupItemsByApproach();
    const hasMultipleGroups =
      groupedItems.length > 1 ||
      (groupedItems.length === 1 && groupedItems[0][0] !== "general");

    groupedItems.forEach(([key, group], groupIndex) => {
      if (hasMultipleGroups && group.approachId) {
        sections.push({
          id: `group-header-${key}`,
          label: `Procedimento ${groupIndex + 1}`,
        });
      }
      if (group.cids.length > 0) {
        sections.push({
          id: `cids-${key}`,
          label: `CID-10${hasMultipleGroups ? ` (${group.approachName})` : ""}`,
        });
      }
      if (group.cbhpmProcedures.length > 0) {
        sections.push({
          id: `cbhpm-${key}`,
          label: `CBHPM${hasMultipleGroups ? ` (${group.approachName})` : ""}`,
        });
      }
      if (group.opmeItems.length > 0) {
        sections.push({
          id: `opme-${key}`,
          label: `OPME${hasMultipleGroups ? ` (${group.approachName})` : ""}`,
        });
      }
      if (group.suppliers.length > 0) {
        sections.push({
          id: `suppliers-${key}`,
          label: `Fornecedores${hasMultipleGroups ? ` (${group.approachName})` : ""}`,
        });
      }
    });

    sections.push({ id: "general-notes", label: "Observacoes Gerais" });
    sections.push({ id: "signature", label: "Assinatura" });

    return sections;
  }, [clinicalJustification, groupItemsByApproach]);

  const togglePageBreak = useCallback(
    (sectionId: string) => {
      const section = breakableSections.find((s) => s.id === sectionId);
      if (section?.protected) return;

      setForcedPageBreaks((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(sectionId)) {
          newSet.delete(sectionId);
        } else {
          newSet.add(sectionId);
        }
        return newSet;
      });
    },
    [breakableSections],
  );

  const clearAllPageBreaks = useCallback(() => {
    setForcedPageBreaks(new Set());
  }, []);

  const pdfElement = useMemo(() => {
    return createElement(OrderPDFDocumentV2, {
      orderId,
      selectedPatient,
      selectedHospital,
      user: user as any,
      clinicalJustification: clinicalJustification || "",
      procedureType,
      procedureLaterality: procedureLaterality || "",
      multipleCids,
      secondaryProcedures,
      selectedOpmeItems,
      supplierDetails,
      cbhpmAdditionalNotes,
      opmeAdditionalNotes,
      supplierAdditionalNotes,
      forcedPageBreaks: Array.from(forcedPageBreaks),
    });
  }, [
    orderId,
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
    forcedPageBreaks,
  ]);

  const { blobUrl, isLoading, error, regenerate } = usePdfPreview(
    pdfElement,
    [
      orderId,
      selectedPatient?.id,
      selectedHospital?.id,
      user?.id,
      clinicalJustification,
      procedureType,
      procedureLaterality,
      multipleCids?.length,
      secondaryProcedures?.length,
      selectedOpmeItems?.length,
      supplierDetails?.length,
      cbhpmAdditionalNotes,
      opmeAdditionalNotes,
      supplierAdditionalNotes,
      Array.from(forcedPageBreaks).sort().join(","),
    ],
    { debounceMs: 500 },
  );

  return (
    <div className="mb-6 text-foreground">
      <div className="text-center mb-1">
        <h3 className="text-lg font-medium text-foreground">
          Visualizacao do Pedido
        </h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados do pedido antes de finalizar
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
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
          <button
            onClick={regenerate}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 transition-colors disabled:opacity-50"
            title="Regenerar PDF"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

      <div className="mt-3 relative">
        <div className="absolute left-0 top-0 z-10" style={{ width: showBreakPanel ? "260px" : "auto" }}>
          <div className="sticky top-4">
            <button
              onClick={() => setShowBreakPanel(!showBreakPanel)}
              className={`flex items-center gap-2 mb-2 transition-all duration-200 ${
                showBreakPanel
                  ? "text-sm font-medium text-foreground hover:text-foreground/80 w-full"
                  : "p-2 rounded-lg bg-white/90 backdrop-blur border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
              }`}
              title={showBreakPanel ? undefined : "Quebras de pagina"}
            >
              {showBreakPanel ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <Scissors className="h-4 w-4" />
                  <span>Quebras de pagina</span>
                  {forcedPageBreaks.size > 0 && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      {forcedPageBreaks.size}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4 text-gray-500" />
                  {forcedPageBreaks.size > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 min-w-[20px] text-center">
                      {forcedPageBreaks.size}
                    </span>
                  )}
                </>
              )}
            </button>

            {showBreakPanel && (
              <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="max-h-[800px] overflow-y-auto">
                  {breakableSections.map((section) => {
                    const isActive = forcedPageBreaks.has(section.id);
                    const isProtected = section.protected;

                    if (isProtected) {
                      return (
                        <div
                          key={section.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground/40 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="w-8 h-4 rounded-full bg-gray-100 flex-shrink-0" />
                          <span className="truncate">{section.label}</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={section.id}
                        onClick={() => togglePageBreak(section.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all duration-150 border-b border-gray-100 last:border-b-0 group/item ${
                          isActive
                            ? "bg-amber-50/80"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`relative w-8 h-4 rounded-full flex-shrink-0 transition-colors duration-200 ${
                            isActive ? "bg-amber-400" : "bg-gray-200 group-hover/item:bg-gray-300"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              isActive ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </div>
                        <span className={`truncate transition-colors ${isActive ? "text-amber-800 font-medium" : "text-foreground"}`}>
                          {section.label}
                        </span>
                        {isActive && (
                          <Scissors className="h-3 w-3 text-amber-500 flex-shrink-0 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start justify-center w-full">
          <PdfViewer
            blobUrl={blobUrl}
            isLoading={isLoading}
            error={error}
            height="1123px"
            width="794px"
            maxWidth="100%"
          />
        </div>
      </div>
    </div>
  );
}

export default OrderPreviewV3;
