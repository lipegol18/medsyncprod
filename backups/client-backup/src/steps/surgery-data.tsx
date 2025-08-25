import * as React from "react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileText,
  Loader2,
  Package,
  AlertTriangle,
  Check,
  X,
  ChevronsUpDown,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  PROCEDURE_TYPE_VALUES,
  PROCEDURE_TYPES,
  API_ENDPOINTS,
} from "@shared/constants";
import { apiRequest } from "@/lib/queryClient";
import type { AnatomicalRegion, SurgicalProcedure } from "@shared/schema";

interface CidCode {
  id: number;
  code: string;
  description: string;
  category: string;
}

interface Procedure {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean | null;
  porte?: string;
  custoOperacional?: string;
  porteAnestesista?: string;
  numeroAuxiliares?: number;
}

// Categorias de CID-10 em ortopedia
const CATEGORIES = [
  "Joelho",
  "Coluna",
  "Ombro",
  "Quadril",
  "Pé e tornozelo",
  "Outros",
];

// Função para calcular valor numérico do porte CBHPM para ordenação
const getPorteValue = (porte: string | undefined | null): number => {
  if (!porte) return 0;
  
  // Normalizar o porte (remover espaços e converter para maiúscula)
  const normalizedPorte = porte.toString().trim().toUpperCase();
  
  // Mapear portes para valores numéricos para ordenação
  const porteMap: { [key: string]: number } = {
    'AMBULATORIAL': 1.0,
    '01A': 1.1, '01B': 1.2, '01C': 1.3,
    '02A': 2.1, '02B': 2.2, '02C': 2.3,
    '03A': 3.1, '03B': 3.2, '03C': 3.3,
    '04A': 4.1, '04B': 4.2, '04C': 4.3,
    '05A': 5.1, '05B': 5.2, '05C': 5.3,
    '06A': 6.1, '06B': 6.2, '06C': 6.3,
    '07A': 7.1, '07B': 7.2, '07C': 7.3,
    '08A': 8.1, '08B': 8.2, '08C': 8.3,
    '09A': 9.1, '09B': 9.2, '09C': 9.3,
    '10A': 10.1, '10B': 10.2, '10C': 10.3,
    '11A': 11.1, '11B': 11.2, '11C': 11.3,
    '12A': 12.1, '12B': 12.2, '12C': 12.3,
    'BAIXA': 2.0,
    'MÉDIA': 5.0,
    'ALTA': 8.0,
    'ESPECIAL': 10.0
  };
  
  // Verificar mapeamento direto
  if (porteMap[normalizedPorte]) {
    return porteMap[normalizedPorte];
  }
  
  // Tentar extrair número do porte (ex: "10B" -> 10.2)
  const match = normalizedPorte.match(/^(\d+)([ABC]?)$/);
  if (match) {
    const baseValue = parseInt(match[1]);
    const suffix = match[2] || '';
    const suffixValue = suffix === 'A' ? 0.1 : suffix === 'B' ? 0.2 : suffix === 'C' ? 0.3 : 0;
    return baseValue + suffixValue;
  }
  
  // Fallback: tentar converter diretamente para número
  const numericValue = parseFloat(normalizedPorte);
  return isNaN(numericValue) ? 0 : numericValue;
};

// Função para reorganizar procedimentos por porte (maior para menor)
const reorganizeProceduresByPorte = (
  selectedProcedure: Procedure | null,
  secondaryProcedures: Array<{ procedure: Procedure; quantity: number; }>
): {
  newSelectedProcedure: Procedure | null;
  newSecondaryProcedures: Array<{ procedure: Procedure; quantity: number; }>;
} => {
  // Coletar todos os procedimentos
  const allProcedures: Array<{ procedure: Procedure; quantity: number; }> = [];
  
  if (selectedProcedure) {
    allProcedures.push({ procedure: selectedProcedure, quantity: 1 });
  }
  
  allProcedures.push(...secondaryProcedures);
  
  // Se não há procedimentos, retornar valores padrão
  if (allProcedures.length === 0) {
    return { newSelectedProcedure: null, newSecondaryProcedures: [] };
  }
  
  // Ordenar por porte (maior para menor)
  const sortedProcedures = [...allProcedures].sort((a, b) => {
    const porteA = getPorteValue(a.procedure.porte);
    const porteB = getPorteValue(b.procedure.porte);
    return porteB - porteA; // Ordem decrescente
  });
  
  // O primeiro (maior porte) se torna o procedimento principal
  const newSelectedProcedure = sortedProcedures[0]?.procedure || null;
  
  // Os demais se tornam secundários
  const newSecondaryProcedures = sortedProcedures.slice(1);
  
  console.log(`🔄 REORGANIZAÇÃO POR PORTE:`);
  console.log(`   Principal: ${newSelectedProcedure?.code} - ${newSelectedProcedure?.name} (Porte: ${newSelectedProcedure?.porte || 'N/A'})`);
  console.log(`   Secundários: ${newSecondaryProcedures.length}`);
  newSecondaryProcedures.forEach((proc, index) => {
    console.log(`      ${index + 1}. ${proc.procedure.code} - ${proc.procedure.name} (Porte: ${proc.procedure.porte || 'N/A'})`);
  });
  
  return { newSelectedProcedure, newSecondaryProcedures };
};

// Interface para itens OPME
interface OpmeItem {
  id: number;
  anvisaRegistrationNumber?: string;
  technicalName: string;
  commercialName: string;
  manufacturerName: string;
  riskClass?: string;
  registrationHolder?: string;
}

// Interface para materiais OPME selecionados
interface SelectedOpmeItem {
  item: OpmeItem;
  quantity: number;
}

// Interface para regiões anatômicas
interface AnatomicalRegion {
  id: number;
  name: string;
  iconUrl: string | null;
  title: string | null;
  description: string | null;
}

interface SurgeryDataProps {
  // Estados para o CID principal (mantidos para compatibilidade)
  cidCode: string;
  setCidCode: (code: string) => void;
  cidDescription: string;
  setCidDescription: (description: string) => void;
  selectedCidId: number | null;
  setSelectedCidId: (id: number | null) => void;
  // cidLaterality removido conforme solicitado, mas mantemos na interface para compatibilidade
  cidLaterality: string | null;
  setCidLaterality: (laterality: string | null) => void;
  // Novos campos para suportar múltiplos CIDs
  multipleCids?: Array<{
    cid: {
      id: number;
      code: string;
      description: string;
      category?: string;
    };
    surgicalApproach?: {
      id: number;
      name: string;
      description?: string;
      isPrimary?: boolean;
    };
  }>;
  setMultipleCids?: (
    cids: Array<{
      cid: {
        id: number;
        code: string;
        description: string;
        category?: string;
      };
      surgicalApproach?: {
        id: number;
        name: string;
        description?: string;
        isPrimary?: boolean;
      };
    }>,
  ) => void;
  // Campo para lateralidade da cirurgia
  procedureLaterality: string | null;
  setProcedureLaterality: (laterality: string | null) => void;
  procedureType: string;
  setProcedureType: (type: string) => void;
  selectedProcedure: Procedure | null;
  setSelectedProcedure: (procedure: Procedure | null) => void;
  procedureQuantity: number;
  setProcedureQuantity: (quantity: number) => void;
  secondaryProcedures: Array<{
    procedure: Procedure;
    quantity: number;
  }>;
  setSecondaryProcedures: (
    procedures: Array<{
      procedure: Procedure;
      quantity: number;
    }>,
  ) => void;
  // Suporte para fornecedores OPME
  suppliers?: {
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  };
  setSuppliers?: (suppliers: {
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  }) => void;
  // Dados completos dos fornecedores (novo padrão unificado)
  supplierDetails?: Array<{
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
  }>;
  setSupplierDetails?: (suppliers: Array<{
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
  }>) => void;
  // Campo para sugestão de justificativa clínica
  clinicalJustification?: string;
  setClinicalJustification?: (justification: string) => void;
  // Props para itens OPME
  selectedOpmeItems?: Array<{ item: any; quantity: number }>;
  setSelectedOpmeItems?: (
    items: Array<{ item: any; quantity: number }>,
  ) => void;
  // Props para salvar CIDs no banco
  orderId?: number | null;
  updateOrderField?: (fieldName: string, value: any) => Promise<boolean>;
  // Props para procedimentos cirúrgicos por região
  selectedSurgicalProcedures?: SurgicalProcedure[];
  setSelectedSurgicalProcedures?: (procedures: SurgicalProcedure[]) => void;
  availableProceduresFromRegion?: SurgicalProcedure[];
  setAvailableProceduresFromRegion?: (procedures: SurgicalProcedure[]) => void;
}

// Componente para selecionar conduta clínica para um procedimento
interface ConductSelectorProps {
  procedureId: number;
  procedureName: string;
  orderId?: number | null;
  autoOpenModal?: boolean;
  onModalClose?: () => void;
  setMultipleCids?: (value: any) => void;
  // Props para auto-preenchimento de procedimentos CBHPM
  setSelectedProcedure?: (procedure: Procedure | null) => void;
  setSecondaryProcedures?: (procedures: Array<{
    procedure: Procedure;
    quantity: number;
  }>) => void;
}

const ConductSelector: React.FC<ConductSelectorProps> = ({
  procedureId,
  procedureName,
  orderId,
  autoOpenModal = false,
  onModalClose,
  setMultipleCids,
  setSelectedProcedure,
  setSecondaryProcedures
}) => {
  const [availableConducts, setAvailableConducts] = useState<any[]>([]);
  const [selectedConduct, setSelectedConduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(autoOpenModal);
  const [searchTerm, setSearchTerm] = useState("");

  // Controlar abertura automática do modal
  useEffect(() => {
    setModalOpen(autoOpenModal);
  }, [autoOpenModal]);

  // Carregar condutas associadas ao procedimento
  useEffect(() => {
    const loadConducts = async () => {
      if (!procedureId) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/surgical-procedure-approaches/procedure/${procedureId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setAvailableConducts(data || []);
          
          // Se há apenas uma conduta, selecionar automaticamente
          if (data && data.length === 1) {
            setSelectedConduct(data[0]);
          }
          
          console.log(`Condutas carregadas para procedimento ${procedureId}:`, data);
        }
      } catch (error) {
        console.error('Erro ao carregar condutas:', error);
        toast({
          title: "Erro ao carregar condutas",
          description: "Não foi possível carregar as condutas clínicas disponíveis.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadConducts();
  }, [procedureId]);

  const handleConductSelect = async (conduct: any) => {
    setSelectedConduct(conduct);
    setModalOpen(false);

    // Chamar callback de fechamento se fornecido
    if (onModalClose) {
      onModalClose();
    }

    // AUTO-PREENCHIMENTO: Buscar CIDs associados ao procedimento + conduta
    if (procedureId && conduct.surgicalApproachId) {
      try {
        console.log(`🔍 Buscando CIDs para procedimento ${procedureId} + conduta ${conduct.surgicalApproachId}`);
        
        const cidResponse = await fetch(`/api/surgical-procedure-conduct-cids/procedure/${procedureId}/approach/${conduct.surgicalApproachId}`, {
          credentials: 'include'
        });
        
        if (cidResponse.ok) {
          const associatedCids = await cidResponse.json();
          console.log('📋 CIDs encontrados para a conduta:', associatedCids);
          
          if (associatedCids.length > 0) {
            // Adicionar aos CIDs existentes, evitando duplicatas
            if (setMultipleCids) {
              setMultipleCids((prevCids: any) => {
                const updatedList = [...(prevCids || [])];
                
                associatedCids.forEach((cidData: any) => {
                  const exists = updatedList.some((existing: any) => 
                    (existing.cid?.id || existing.id) === cidData.cidId
                  );
                  
                  if (!exists) {
                    // Formatar CID no padrão esperado pelo sistema
                    const newCidItem = {
                      cid: {
                        id: cidData.cidId,
                        code: cidData.cidCode,
                        description: cidData.cidDescription,
                        category: cidData.cidCategory || 'Geral'
                      },
                      isAutoAdded: true,
                      isPrimary: cidData.isPrimaryCid,
                      notes: cidData.notes,
                      addedByConductSelect: true
                    };
                    
                    updatedList.push(newCidItem);
                    console.log(`✅ CID auto-adicionado: ${cidData.cidCode} - ${cidData.cidDescription} ${cidData.isPrimaryCid ? '(Principal)' : '(Secundário)'}`);
                  }
                });
                
                return updatedList;
              });
            }
            
            // NOTA: CIDs serão salvos no banco apenas quando o usuário clicar em "Salvar" ou "Próximo"
            // seguindo o mesmo padrão dos outros campos do formulário
            
            toast({
              title: "CIDs preenchidos automaticamente",
              description: `${associatedCids.length} CID(s) adicionados para a conduta ${conduct.approachName}`,
              duration: 4000,
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar CIDs associados:', error);
      }
    }

    // AUTO-PREENCHIMENTO: Buscar procedimentos CBHPM associados ao procedimento médico + conduta
    if (procedureId && conduct.surgicalApproachId) {
      try {
        console.log(`🔍 Buscando procedimentos CBHPM para procedimento ${procedureId} + conduta ${conduct.surgicalApproachId}`);
        
        const cbhpmResponse = await fetch(`/api/cbhpm-procedures-by-combination?medicalProcedureId=${procedureId}&approachId=${conduct.surgicalApproachId}`, {
          credentials: 'include'
        });
        
        if (cbhpmResponse.ok) {
          const cbhpmProcedures = await cbhpmResponse.json();
          console.log('🏥 Procedimentos CBHPM encontrados:', cbhpmProcedures);
          
          if (cbhpmProcedures.length > 0) {
            // TODO: Implementar auto-preenchimento dos procedimentos CBHPM na interface
            // Por enquanto, apenas loggar os procedimentos encontrados
            console.log(`✅ ${cbhpmProcedures.length} procedimentos CBHPM disponíveis para auto-preenchimento`);
            
            // AUTO-PREENCHIMENTO: Adicionar procedimentos CBHPM à interface
            if (setSelectedProcedure && setSecondaryProcedures && cbhpmProcedures.length > 0) {
              // Formatar todos os procedimentos para o padrão da interface
              const formattedProcedures = cbhpmProcedures.map((proc: any) => ({
                procedure: {
                  id: proc.procedureId,
                  code: proc.procedureCode,
                  name: proc.procedureName,
                  description: proc.notes,
                  active: true,
                  porte: proc.porte,
                  custoOperacional: null,
                  porteAnestesista: proc.porteAnestesista,
                  numeroAuxiliares: proc.numeroAuxiliares,
                  addedByConductSelect: true // Flag para identificar preenchimento automático
                },
                quantity: 1
              }));
              
              // Reorganizar por porte (maior para menor)
              const { newSelectedProcedure, newSecondaryProcedures } = reorganizeProceduresByPorte(
                null, // Não há procedimento principal atual
                formattedProcedures
              );
              
              // Aplicar auto-preenchimento à interface
              setSelectedProcedure(newSelectedProcedure);
              setSecondaryProcedures(newSecondaryProcedures);
              
              console.log(`🎯 AUTO-PREENCHIMENTO POR PORTE APLICADO:`);
              console.log(`   Procedimento Principal: ${newSelectedProcedure?.code} - ${newSelectedProcedure?.name} (Porte: ${newSelectedProcedure?.porte})`);
              console.log(`   Procedimentos Secundários: ${newSecondaryProcedures.length}`);
            }
            
            toast({
              title: "Procedimentos CBHPM preenchidos automaticamente",
              description: `${cbhpmProcedures.length} procedimento(s) CBHPM adicionados para a conduta ${conduct.approachName}`,
              duration: 4000,
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar procedimentos CBHPM:', error);
      }
    }

    // Se há orderId, salvar a associação no banco
    if (orderId) {
      try {
        const response = await fetch('/api/medical-order-surgical-approaches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            medicalOrderId: orderId,
            surgicalApproachId: conduct.surgicalApproachId,
            isPrimary: false,
            justificationUsed: conduct.approachName,
            additionalNotes: `Conduta selecionada para procedimento: ${procedureName}`
          })
        });

        if (response.ok) {
          toast({
            title: "Conduta selecionada",
            description: `${conduct.approachName} foi associada ao procedimento`,
          });
        }
      } catch (error) {
        console.error('Erro ao salvar conduta:', error);
      }
    } else {
      toast({
        title: "Conduta selecionada",
        description: `${conduct.approachName} será salva quando o pedido for finalizado`,
      });
    }
  };

  const filteredConducts = availableConducts.filter(conduct =>
    conduct.approachName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conduct.approachDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-400" />
        <span className="text-sm text-blue-300">Carregando condutas...</span>
      </div>
    );
  }

  if (availableConducts.length === 0) {
    return (
      <div className="p-3 text-center bg-gray-800/30 rounded-lg border border-gray-600/50">
        <span className="text-sm text-gray-300">
          Nenhuma conduta clínica configurada para este procedimento
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2">      
      {/* Conduta selecionada - apenas para visualização */}
      {selectedConduct && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded-full border border-green-700">
            {selectedConduct.approachName}
            {selectedConduct.isPreferred && " (Preferencial)"}
          </span>
        </div>
      )}

      {/* Modal para selecionar conduta quando nenhuma está selecionada */}
      {!selectedConduct && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-[#1a2332] border-blue-600">
            <DialogHeader>
              <DialogTitle className="text-blue-200">
                Selecionar Conduta Cirúrgica - {procedureName}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Escolha a abordagem cirúrgica apropriada para este procedimento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Campo de pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar condutas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#0f1419] border-blue-700 text-white"
                />
              </div>

              {/* Lista de condutas */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredConducts.map((conduct) => (
                  <button
                    key={conduct.id}
                    onClick={() => handleConductSelect(conduct)}
                    className="w-full text-left p-3 rounded-md border border-blue-700 bg-blue-900/20 hover:bg-blue-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-blue-200 text-sm">
                          {conduct.approachName}
                        </div>
                        {conduct.approachDescription && (
                          <div className="text-xs text-gray-300 mt-1">
                            {conduct.approachDescription}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {conduct.complexity && (
                            <span className="text-xs px-2 py-1 bg-blue-800/50 text-blue-300 rounded">
                              {conduct.complexity}
                            </span>
                          )}
                          {conduct.estimatedDuration && (
                            <span className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded">
                              {conduct.estimatedDuration} min
                            </span>
                          )}
                        </div>
                      </div>
                      {conduct.isPreferred && (
                        <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full ml-3">
                          Preferencial
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredConducts.length === 0 && searchTerm && (
                <div className="p-4 text-center text-gray-400">
                  Nenhuma conduta encontrada para "{searchTerm}"
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export function SurgeryData({
  cidCode,
  setCidCode,
  cidDescription,
  setCidDescription,
  selectedCidId,
  setSelectedCidId,
  cidLaterality,
  setCidLaterality,
  multipleCids = [],
  setMultipleCids = () => {},
  procedureLaterality,
  setProcedureLaterality,
  procedureType,
  setProcedureType,
  selectedProcedure,
  setSelectedProcedure,
  procedureQuantity,
  setProcedureQuantity,
  secondaryProcedures,
  setSecondaryProcedures,
  suppliers = { supplier1: null, supplier2: null, supplier3: null },
  setSuppliers = () => {},
  supplierDetails = [],
  setSupplierDetails = () => {},
  // Campo para sugestão de justificativa clínica
  clinicalJustification = "",
  setClinicalJustification = () => {},
  // Props para itens OPME
  selectedOpmeItems = [],
  setSelectedOpmeItems = () => {},
  // Props para salvar CIDs no banco
  orderId = null,
  updateOrderField,
  // Props para procedimentos cirúrgicos por região
  selectedSurgicalProcedures = [],
  setSelectedSurgicalProcedures = () => {},
  availableProceduresFromRegion = [],
  setAvailableProceduresFromRegion = () => {},
}: SurgeryDataProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  
  // Estados para a adição de múltiplos CIDs
  const [currentCid, setCurrentCid] = useState<CidCode | null>(null);
  
  // Estados para região anatômica removidos - agora gerenciados pelo AnatomicalRegionSelector

  // Estados para busca de procedimentos cirúrgicos
  const [surgicalProcedureSearchOpen, setSurgicalProcedureSearchOpen] = useState(false);
  const [surgicalProcedureSearchTerm, setSurgicalProcedureSearchTerm] = useState("");
  const [allSurgicalProcedures, setAllSurgicalProcedures] = useState<SurgicalProcedure[]>([]);
  const [surgicalProcedureLoading, setSurgicalProcedureLoading] = useState(false);
  
  // Estado para controlar qual procedimento deve abrir o modal de conduta automaticamente
  const [autoOpenConductModalForProcedureId, setAutoOpenConductModalForProcedureId] = useState<number | null>(null);

  // Outros estados necessários para o funcionamento do componente
  const [procedureSearchOpen, setProcedureSearchOpen] = useState(false);
  const [procedureSearchTerm, setProcedureSearchTerm] = useState("");
  const [procedureResults, setProcedureResults] = useState<Procedure[]>([]);
  const [procedureLoading, setProcedureLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para seleção de condutas cirúrgicas
  const [showSurgicalApproachDialog, setShowSurgicalApproachDialog] = useState(false);
  const [availableSurgicalApproaches, setAvailableSurgicalApproaches] = useState<any[]>([]);
  const [selectedCidForApproach, setSelectedCidForApproach] = useState<CidCode | null>(null);
  const [selectedSurgicalApproaches, setSelectedSurgicalApproaches] = useState<any[]>([]);

  // Estados para procedimentos secundários
  const [secondaryProcedureSearchOpen, setSecondaryProcedureSearchOpen] =
    useState(false);
  const [currentSecondaryProcedure, setCurrentSecondaryProcedure] =
    useState<Procedure | null>(null);
  const [currentSecondaryQuantity, setCurrentSecondaryQuantity] = useState(1);
  // Estado de lateralidade do procedimento secundário removido, conforme solicitado

  // Estado local para controlar a lateralidade da cirurgia
  const [cirurgiaLateralidade, setCirurgiaLateralidade] = useState<
    string | null
  >(procedureLaterality);

  // Efeito para sincronizar o estado local com o valor do componente pai
  useEffect(() => {
    setCirurgiaLateralidade(procedureLaterality);
  }, [procedureLaterality]);

  // Função para buscar todos os procedimentos cirúrgicos
  const fetchAllSurgicalProcedures = async () => {
    if (allSurgicalProcedures.length > 0) return; // Já carregados
    
    setSurgicalProcedureLoading(true);
    try {
      const response = await fetch('/api/surgical-procedures', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data)) {
        setAllSurgicalProcedures(data);
        console.log(`Carregados ${data.length} procedimentos cirúrgicos`);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos cirúrgicos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao carregar procedimentos",
        description: errorMessage.includes('autenticado') ? 
          "Sessão expirada. Recarregue a página e tente novamente." : 
          "Não foi possível carregar os procedimentos cirúrgicos.",
        variant: "destructive",
      });
    } finally {
      setSurgicalProcedureLoading(false);
    }
  };

  // Função para selecionar procedimento cirúrgico
  const handleSelectSurgicalProcedure = (procedure: SurgicalProcedure) => {
    // Verificar se procedimento já existe
    const exists = selectedSurgicalProcedures.some(p => p.id === procedure.id);
    if (exists) {
      toast({
        title: "Procedimento já selecionado",
        description: `${procedure.name} já está na lista`,
        variant: "destructive",
      });
      return;
    }
    
    // Adicionar à lista de procedimentos selecionados
    const updated = [...selectedSurgicalProcedures, procedure];
    setSelectedSurgicalProcedures(updated);
    
    toast({
      title: "Procedimento adicionado",
      description: `${procedure.name} foi adicionado`,
    });
    
    // Abrir automaticamente o modal de conduta para este procedimento
    setTimeout(() => {
      setAutoOpenConductModalForProcedureId(procedure.id);
    }, 100);
    
    setSurgicalProcedureSearchOpen(false);
    setSurgicalProcedureSearchTerm("");
  };



  // Vamos mover esse efeito para depois das declarações de estados dos fornecedores

  // Estados para a nova implementação de materiais OPME
  const [opmeSearchOpen, setOpmeSearchOpen] = useState<boolean>(false);
  const [opmeSearchTerm, setOpmeSearchTerm] = useState<string>("");
  const [opmeResults, setOpmeResults] = useState<OpmeItem[]>([]);
  const [opmeLoading, setOpmeLoading] = useState<boolean>(false);
  const [opmeQuantity, setOpmeQuantity] = useState<number>(1);
  const [currentOpmeItem, setCurrentOpmeItem] = useState<OpmeItem | null>(null);
  const [opmeSelectedName, setOpmeSelectedName] = useState<string>("");
  // Usar o estado propagado do componente pai em vez do estado local
  const opmeItems = selectedOpmeItems;
  const setOpmeItems = setSelectedOpmeItems;

  // Estados para fornecedores
  interface Supplier {
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
  }

  const [supplier1Open, setSupplier1Open] = useState<boolean>(false);
  const [supplier2Open, setSupplier2Open] = useState<boolean>(false);
  const [supplier3Open, setSupplier3Open] = useState<boolean>(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>("");
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [supplierLoading, setSupplierLoading] = useState<boolean>(false);
  const [selectedSupplier1, setSelectedSupplier1] = useState<Supplier | null>(
    null,
  );
  const [selectedSupplier2, setSelectedSupplier2] = useState<Supplier | null>(
    null,
  );
  const [selectedSupplier3, setSelectedSupplier3] = useState<Supplier | null>(
    null,
  );

  // Atualizar o componente pai quando um fornecedor é selecionado
  useEffect(() => {
    setSuppliers({
      supplier1: selectedSupplier1 ? selectedSupplier1.id : null,
      supplier2: selectedSupplier2 ? selectedSupplier2.id : null,
      supplier3: selectedSupplier3 ? selectedSupplier3.id : null,
    });
  }, [selectedSupplier1, selectedSupplier2, selectedSupplier3, setSuppliers]);

  // Carregar fornecedores salvos diretamente do supplierDetails (padrão simplificado)
  useEffect(() => {
    console.log("SurgeryData: Carregando fornecedores do supplierDetails:", supplierDetails?.length || 0);

    if (!supplierDetails || supplierDetails.length === 0) {
      console.log("SurgeryData: Nenhum fornecedor recebido");
      return;
    }

    console.log("SurgeryData: Aplicando fornecedores:", supplierDetails.map(s => s.companyName));
    
    // Aplicar fornecedores diretamente pela ordem (padrão simples e confiável)
    if (supplierDetails[0]) {
      setSelectedSupplier1(supplierDetails[0]);
      console.log("✅ Fornecedor 1 aplicado:", supplierDetails[0].companyName);
    }

    if (supplierDetails[1]) {
      setSelectedSupplier2(supplierDetails[1]);
      console.log("✅ Fornecedor 2 aplicado:", supplierDetails[1].companyName);
    }

    if (supplierDetails[2]) {
      setSelectedSupplier3(supplierDetails[2]);
      console.log("✅ Fornecedor 3 aplicado:", supplierDetails[2].companyName);
    }
  }, [supplierDetails]);

  // Estado para armazenar os resultados da busca de CID-10
  const [cidCodes, setCidCodes] = useState<CidCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Função para formatar automaticamente o código CID-10
  const formatCidCode = (value: string): string => {
    // Remove todos os caracteres que não são letras ou números
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem pelo menos 3 caracteres (1 letra + 2 números), adiciona o ponto
    if (cleaned.length >= 4) {
      // Formato: L12.3 (1 letra + 2 números + ponto + 1 número)
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 4)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CID-10 para busca (garante que tenha ponto)
  const normalizeCidForSearch = (value: string): string => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem exatamente 4 caracteres sem ponto, adiciona o ponto
    if (cleaned.length === 4 && /^[A-Z][0-9]{3}$/.test(cleaned)) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[A-Z][0-9]{2}\.[0-9]$/.test(value.toUpperCase())) {
      return value.toUpperCase();
    }
    
    return cleaned;
  };

  // Função para formatar automaticamente o código CBHPM
  const formatCbhpmCode = (value: string): string => {
    // Remove todos os caracteres que não são números
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Aplica formatação progressiva baseada no comprimento
    if (cleaned.length >= 9) {
      // Formato completo: X.XX.XX.XX-X
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}-${cleaned.substring(7, 8)}`;
    } else if (cleaned.length >= 7) {
      // Formato: X.XX.XX.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5)}`;
    } else if (cleaned.length >= 5) {
      // Formato: X.XX.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3)}`;
    } else if (cleaned.length >= 3) {
      // Formato: X.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CBHPM para busca (garante formato correto)
  const normalizeCbhpmForSearch = (value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Se tem exatamente 8 números, formata como CBHPM completo
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}-${cleaned.substring(7, 8)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[0-9]\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}-[0-9]$/.test(value)) {
      return value;
    }
    
    return value;
  };

  // Efeito para buscar códigos CID-10 quando o termo de busca mudar
  useEffect(() => {
    const fetchCidCodes = async () => {
      // Não fazer busca se o termo for muito curto
      if (searchTerm.length < 2) {
        setCidCodes([]);
        return;
      }

      try {
        setIsLoading(true);
        // Normalizar o termo de busca para garantir formato correto
        const normalizedTerm = normalizeCidForSearch(searchTerm);
        console.log(`Termo original: "${searchTerm}" -> Normalizado: "${normalizedTerm}"`);
        
        // Usar fetch diretamente como nos outros componentes
        const response = await fetch(
          `/api/cid-codes/search?q=${encodeURIComponent(normalizedTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar códigos CID-10: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `Encontrados ${data.length} códigos CID-10 para a consulta "${searchTerm}":`,
          data,
        );
        setCidCodes(data);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        toast({
          title: "Erro na busca",
          description:
            "Não foi possível buscar códigos CID-10 da tabela cid_codes",
          variant: "destructive",
        });
        setCidCodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce para evitar muitas requisições
    const debounceTimer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchCidCodes();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Efeito para buscar procedimentos quando o termo de busca mudar
  React.useEffect(() => {
    const fetchProcedures = async () => {
      if (procedureSearchTerm.length < 3) {
        setProcedureResults([]);
        return;
      }

      try {
        setProcedureLoading(true);
        // Normalizar o termo de busca para garantir formato correto CBHPM
        const normalizedTerm = normalizeCbhpmForSearch(procedureSearchTerm);
        console.log(`Termo CBHPM original: "${procedureSearchTerm}" -> Normalizado: "${normalizedTerm}"`);
        
        const response = await fetch(
          `/api/procedures/search?q=${encodeURIComponent(normalizedTerm)}&cbhpmOnly=true`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar procedimentos: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `Encontrados ${data.length} procedimentos para a consulta "${procedureSearchTerm}"`,
        );
        setProcedureResults(data);
      } catch (error) {
        console.error("Erro ao buscar procedimentos:", error);
        toast({
          title: "Erro ao buscar procedimentos",
          description: "Tente novamente ou verifique sua conexão",
          variant: "destructive",
        });
        setProcedureResults([]);
      } finally {
        setProcedureLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchProcedures();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [procedureSearchTerm]);

  // Função para buscar materiais OPME
  const handleOpmeSearch = async () => {
    if (opmeSearchTerm.length < 3) {
      toast({
        title: "Termo muito curto",
        description:
          "Digite pelo menos 3 caracteres para buscar materiais OPME",
        variant: "destructive",
      });
      return;
    }

    try {
      setOpmeLoading(true);

      const response = await fetch(
        `/api/opme-items/search?q=${encodeURIComponent(opmeSearchTerm)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar materiais OPME: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Encontrados ${data.length} materiais OPME para a consulta "${opmeSearchTerm}"`,
      );
      setOpmeResults(data);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar materiais OPME",
        variant: "destructive",
      });
      setOpmeResults([]);
    } finally {
      setOpmeLoading(false);
    }
  };

  // Função para selecionar um material OPME e adicionar automaticamente
  const handleSelectOpmeItem = async (item: OpmeItem) => {
    // Verificar se o material já existe na lista
    const exists = opmeItems?.some((opmeItem) => opmeItem.item.id === item.id);

    if (exists) {
      toast({
        title: "Material já adicionado",
        description: "Este material OPME já foi adicionado à lista.",
        variant: "destructive",
        duration: 3000,
      });
      setOpmeSearchOpen(false);
      return;
    }

    // Adicionar automaticamente à lista com a quantidade atual
    const newOpmeItem = {
      item: item,
      quantity: opmeQuantity,
    };

    const updatedItems = [...(opmeItems || []), newOpmeItem];
    if (setOpmeItems) {
      setOpmeItems(updatedItems);
    }

    // Salvar no banco de dados imediatamente
    const saveSuccess = await saveOpmeItemsToDatabase(updatedItems);
    if (saveSuccess) {
      console.log(`Item OPME ${item.technicalName} salvo no banco com sucesso`);
    } else {
      console.error(`Erro ao salvar item OPME ${item.technicalName} no banco`);
    }

    // Limpar seleção e fechar popup
    setCurrentOpmeItem(null);
    setOpmeSelectedName("");
    setOpmeQuantity(1);
    setOpmeSearchTerm("");
    setOpmeSearchOpen(false);

    toast({
      title: "Material OPME adicionado",
      description: `${item.technicalName} adicionado com sucesso!`,
      duration: 2000,
    });
  };

  // Função para salvar itens OPME no banco
  const saveOpmeItemsToDatabase = async (items: Array<{ item: any; quantity: number }>) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar itens OPME");
      return false;
    }

    try {
      console.log(`Salvando ${items.length} itens OPME para o pedido ${orderId}`);
      const opmeData = items.map(item => ({
        opmeItemId: item.item.id,
        quantity: item.quantity
      }));
      
      const response = await fetch(`/api/orders/${orderId}/opme-items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ opmeItems: opmeData })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar itens OPME: ${response.status}`);
      }

      console.log(`Itens OPME salvos com sucesso no banco`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar itens OPME no banco:", error);
      return false;
    }
  };

  // Função para adicionar material OPME à lista
  const handleAddOpmeItem = async () => {
    if (!currentOpmeItem) {
      toast({
        title: "Nenhum material selecionado",
        description: "Selecione um material OPME primeiro",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o item já existe na lista
    const existingItemIndex = opmeItems.findIndex(
      (item) => item.item.id === currentOpmeItem.id,
    );

    let updatedItems;

    if (existingItemIndex >= 0) {
      // Atualizar a quantidade do item existente
      const existingItem = opmeItems[existingItemIndex];
      const newQuantity = existingItem.quantity + opmeQuantity;

      updatedItems = [...opmeItems];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
      };

      setOpmeItems(updatedItems);

      toast({
        title: "Quantidade atualizada",
        description: `Quantidade de ${currentOpmeItem.technicalName} atualizada para ${newQuantity}`,
      });
    } else {
      // Adicionar novo item à lista
      updatedItems = [
        ...opmeItems,
        {
          item: currentOpmeItem,
          quantity: opmeQuantity,
        },
      ];

      setOpmeItems(updatedItems);

      toast({
        title: "Material adicionado",
        description: `${currentOpmeItem.technicalName} adicionado à lista de materiais`,
      });
    }

    // Salvar no banco de dados imediatamente
    const saveSuccess = await saveOpmeItemsToDatabase(updatedItems);
    if (saveSuccess) {
      console.log(`Item OPME ${currentOpmeItem.technicalName} salvo no banco com sucesso`);
    } else {
      console.error(`Erro ao salvar item OPME ${currentOpmeItem.technicalName} no banco`);
    }

    // Limpar o campo de busca e o item selecionado
    setOpmeSearchTerm("");
    setOpmeSelectedName("");
    setCurrentOpmeItem(null);
    setOpmeQuantity(1);
  };

  // Função para remover um material OPME da lista
  const handleRemoveOpmeItem = async (index: number) => {
    const newItems = [...opmeItems];
    const removedItem = newItems[index];
    newItems.splice(index, 1);

    setOpmeItems(newItems);

    // Salvar no banco de dados imediatamente
    const saveSuccess = await saveOpmeItemsToDatabase(newItems);
    if (saveSuccess) {
      console.log(`Item OPME ${removedItem.item.technicalName} removido do banco com sucesso`);
    } else {
      console.error(`Erro ao remover item OPME ${removedItem.item.technicalName} do banco`);
    }

    toast({
      title: "Material removido",
      description: `${removedItem.item.technicalName} removido da lista`,
    });
  };

  // Função para atualizar a quantidade de um material OPME específico
  const handleUpdateOpmeQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Não permitir quantidades menores que 1
    
    console.log(`🔍 DEBUG - handleUpdateOpmeQuantity chamada:`, {
      index,
      newQuantity,
      currentOpmeItems: opmeItems,
      currentItem: opmeItems[index]
    });
    
    const updatedItems = [...opmeItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    
    console.log(`🔍 DEBUG - updatedItems após alteração:`, updatedItems);
    
    setOpmeItems(updatedItems);
    
    console.log(`🔍 DEBUG - setOpmeItems chamado com:`, updatedItems);
    
    toast({
      title: "Quantidade atualizada",
      description: `Quantidade alterada para ${newQuantity}`,
      duration: 1000,
    });
  };

  // Efeito para buscar materiais OPME quando o termo de busca mudar
  useEffect(() => {
    if (opmeSearchTerm.length >= 3) {
      const debounceTimer = setTimeout(() => {
        handleOpmeSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [opmeSearchTerm]);

  // Função para buscar fornecedores
  const handleSupplierSearch = async () => {
    if (supplierSearchTerm.length < 3) {
      toast({
        title: "Termo muito curto",
        description: "Digite pelo menos 3 caracteres para buscar fornecedores",
        variant: "destructive",
      });
      return;
    }

    try {
      setSupplierLoading(true);

      // Usar a API real de fornecedores - corrigido parâmetro para "term" em vez de "search"
      const response = await fetch(
        `/api/suppliers/search?term=${encodeURIComponent(supplierSearchTerm)}`,
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar fornecedores: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Encontrados ${data.length} fornecedores para a consulta "${supplierSearchTerm}"`,
      );
      setSupplierResults(data);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar fornecedores",
        variant: "destructive",
      });

      // Em caso de falha na API, vamos fornecer alguns dados simulados para não bloquear a interface
      const fallbackSuppliers = [
        {
          id: 1,
          companyName: "MedicalSupply LTDA",
          tradeName: "MedSupply",
          cnpj: "12.345.678/0001-90",
          municipalityId: 1,
          phone: "(21) 3333-4444",
          email: "contato@medsupply.com",
          address: null,
          active: true,
        },
        {
          id: 2,
          companyName: "OrthoTech Brasil",
          tradeName: "OrthoTech",
          cnpj: "23.456.789/0001-01",
          municipalityId: 2,
          phone: "(21) 4444-5555",
          email: "vendas@orthotech.com.br",
          address: null,
          active: true,
        },
      ];

      const filteredFallback = fallbackSuppliers.filter(
        (supplier) =>
          supplier.companyName
            .toLowerCase()
            .includes(supplierSearchTerm.toLowerCase()) ||
          (supplier.tradeName &&
            supplier.tradeName
              .toLowerCase()
              .includes(supplierSearchTerm.toLowerCase())) ||
          supplier.cnpj.includes(supplierSearchTerm),
      );

      setSupplierResults(filteredFallback);

      toast({
        title: "Usando dados locais",
        description: "Conectando a dados locais para manter a funcionalidade",
        variant: "warning",
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  // Função para salvar fornecedores no banco de dados
  const saveSuppliersToDatabase = async (suppliers: Array<{ id: number }>) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar fornecedores");
      return false;
    }

    try {
      console.log(`Salvando ${suppliers.length} fornecedores para o pedido ${orderId}`);
      const supplierIds = suppliers.map(supplier => supplier.id);
      
      const response = await fetch(`/api/orders/${orderId}/suppliers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ supplierIds })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar fornecedores: ${response.status}`);
      }

      console.log(`Fornecedores salvos com sucesso no banco: ${supplierIds.join(', ')}`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar fornecedores no banco:", error);
      return false;
    }
  };

  // Função para selecionar fornecedor 1
  const handleSelectSupplier1 = async (supplier: Supplier) => {
    setSelectedSupplier1(supplier);
    setSupplier1Open(false);

    // Se o mesmo fornecedor já estiver selecionado em outra posição, limpar essa posição
    if (selectedSupplier2?.id === supplier.id) {
      setSelectedSupplier2(null);
    }
    if (selectedSupplier3?.id === supplier.id) {
      setSelectedSupplier3(null);
    }

    // Atualizar lista de fornecedores selecionados e salvar no banco
    const currentSuppliers = [
      supplier,
      selectedSupplier2,
      selectedSupplier3
    ].filter(Boolean) as Supplier[];

    const saveSuccess = await saveSuppliersToDatabase(currentSuppliers);
    if (saveSuccess) {
      console.log(`Fornecedor 1 ${supplier.companyName} salvo no banco com sucesso`);
    } else {
      console.error(`Erro ao salvar fornecedor 1 ${supplier.companyName} no banco`);
    }
  };

  // Função para selecionar fornecedor 2
  const handleSelectSupplier2 = async (supplier: Supplier) => {
    setSelectedSupplier2(supplier);
    setSupplier2Open(false);

    // Se o mesmo fornecedor já estiver selecionado em outra posição, limpar essa posição
    if (selectedSupplier1?.id === supplier.id) {
      setSelectedSupplier1(null);
    }
    if (selectedSupplier3?.id === supplier.id) {
      setSelectedSupplier3(null);
    }

    // Atualizar lista de fornecedores selecionados e salvar no banco
    const currentSuppliers = [
      selectedSupplier1,
      supplier,
      selectedSupplier3
    ].filter(Boolean) as Supplier[];

    const saveSuccess = await saveSuppliersToDatabase(currentSuppliers);
    if (saveSuccess) {
      console.log(`Fornecedor 2 ${supplier.companyName} salvo no banco com sucesso`);
    } else {
      console.error(`Erro ao salvar fornecedor 2 ${supplier.companyName} no banco`);
    }
  };

  // Função para selecionar fornecedor 3
  const handleSelectSupplier3 = async (supplier: Supplier) => {
    setSelectedSupplier3(supplier);
    setSupplier3Open(false);

    // Se o mesmo fornecedor já estiver selecionado em outra posição, limpar essa posição
    if (selectedSupplier1?.id === supplier.id) {
      setSelectedSupplier1(null);
    }
    if (selectedSupplier2?.id === supplier.id) {
      setSelectedSupplier2(null);
    }

    // Atualizar lista de fornecedores selecionados e salvar no banco
    const currentSuppliers = [
      selectedSupplier1,
      selectedSupplier2,
      supplier
    ].filter(Boolean) as Supplier[];

    const saveSuccess = await saveSuppliersToDatabase(currentSuppliers);
    if (saveSuccess) {
      console.log(`Fornecedor 3 ${supplier.companyName} salvo no banco com sucesso`);
    } else {
      console.error(`Erro ao salvar fornecedor 3 ${supplier.companyName} no banco`);
    }
  };

  // Função para carregar todos os fornecedores ativos
  const loadAllSuppliers = async () => {
    try {
      setSupplierLoading(true);
      const response = await fetch("/api/suppliers/search?term=");

      if (!response.ok) {
        // Se falhar carregar todos os fornecedores, tentar buscar alguns com termo comum
        const fallbackResponse = await fetch("/api/suppliers/search?term=a");
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setSupplierResults(data);
          return;
        }
        throw new Error(`Erro ao carregar fornecedores: ${response.status}`);
      }

      const data = await response.json();
      setSupplierResults(data);
    } catch (error) {
      console.error("Erro ao carregar lista de fornecedores:", error);
      // Usar dados locais de fallback
      const fallbackSuppliers = [
        {
          id: 1,
          company_name: "MedicalSupply LTDA",
          trade_name: "MedSupply",
          cnpj: "12.345.678/0001-90",
          municipality_id: 1,
          phone: "(21) 3333-4444",
          email: "contato@medsupply.com",
          active: true,
        },
        {
          id: 2,
          company_name: "OrthoTech Brasil",
          trade_name: "OrthoTech",
          cnpj: "23.456.789/0001-01",
          municipality_id: 2,
          phone: "(21) 4444-5555",
          email: "vendas@orthotech.com.br",
          active: true,
        },
      ];
      setSupplierResults(fallbackSuppliers);

      toast({
        title: "Usando dados locais",
        description:
          "Exibindo dados locais enquanto a conexão é reestabelecida",
        variant: "default",
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  // Efeito para buscar fornecedores quando o termo de busca mudar
  useEffect(() => {
    if (supplierSearchTerm.length >= 3) {
      const debounceTimer = setTimeout(() => {
        handleSupplierSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [supplierSearchTerm]);

  // Agrupar códigos CID por categoria
  const cidCodesByCategory = React.useMemo<Record<string, CidCode[]>>(() => {
    if (!cidCodes || !Array.isArray(cidCodes)) return {};

    const result: Record<string, CidCode[]> = {};

    for (const cid of cidCodes) {
      if (!result[cid.category]) {
        result[cid.category] = [];
      }
      result[cid.category].push(cid);
    }

    return result;
  }, [cidCodes]);

  // Não precisamos mais do filtro local, pois a busca já é feita diretamente no banco de dados
  // através do endpoint /api/cid-codes/search

  // Função para buscar procedimentos CBHPM associados a um CID
  const fetchAssociatedProcedures = async (cidId: number) => {
    try {
      console.log(`Buscando associações para CID ID: ${cidId}`);
      const response = await fetch(`/api/cid-cbhpm-associations?cidCodeId=${cidId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(`Erro ao buscar associações para CID ${cidId}: ${response.status}`);
        return [];
      }

      const associations = await response.json();
      console.log(`Encontradas ${associations.length} associações para CID ${cidId}:`, associations);
      
      // A API já retorna os procedimentos completos dentro das associações
      const procedures = associations
        .map((association: any) => association.procedure)
        .filter((procedure: any) => procedure !== null && procedure !== undefined);
      
      console.log(`Procedimentos associados extraídos:`, procedures);
      return procedures;
    } catch (error) {
      console.warn("Erro ao buscar procedimentos associados:", error);
      return [];
    }
  };

  // Função para buscar condutas cirúrgicas associadas ao CID
  const fetchAssociatedSurgicalApproaches = async (cidId: number) => {
    try {
      console.log(`Buscando condutas cirúrgicas para CID ID: ${cidId}`);
      const response = await fetch(`/api/cid-surgical-approaches/cid/${cidId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(`Erro ao buscar condutas cirúrgicas para CID ${cidId}: ${response.status}`);
        return [];
      }

      const associations = await response.json();
      console.log(`Encontradas ${associations.length} condutas cirúrgicas para CID ${cidId}:`, associations);
      
      return associations;
    } catch (error) {
      console.warn("Erro ao buscar condutas cirúrgicas:", error);
      return [];
    }
  };

  // Função para salvar CIDs no banco de dados via API relacional
  const saveCidsToDatabase = async (cids: Array<{ cid: { id: number } }>) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar CIDs");
      return false;
    }

    try {
      console.log(`Salvando ${cids.length} CIDs para o pedido ${orderId}`);
      const cidIds = cids.map(item => item.cid.id);
      
      const response = await fetch(`/api/orders/${orderId}/cids`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ cidIds })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar CIDs: ${response.status}`);
      }

      console.log(`CIDs salvos com sucesso no banco: ${cidIds.join(', ')}`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar CIDs no banco:", error);
      return false;
    }
  };

  // Função para salvar condutas cirúrgicas selecionadas
  const saveSurgicalApproachesToDatabase = async (approaches: any[]) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar condutas cirúrgicas");
      return false;
    }

    try {
      console.log(`Salvando ${approaches.length} condutas cirúrgicas para o pedido ${orderId}`);
      
      // Salvar cada conduta individualmente
      for (const approach of approaches) {
        const response = await fetch('/api/medical-order-surgical-approaches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            medicalOrderId: orderId,
            surgicalApproachId: approach.surgicalApproachId,
            isPrimary: approach.isPrimary || false,
            justificationUsed: approach.justificationUsed || null,
            additionalNotes: approach.additionalNotes || null
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ao salvar conduta cirúrgica: ${response.status}`);
        }

        console.log(`Conduta cirúrgica ${approach.surgicalApproachName} salva com sucesso`);
      }

      return true;
    } catch (error) {
      console.error("Erro ao salvar condutas cirúrgicas no banco:", error);
      return false;
    }
  };



  // Função para selecionar um CID e adicioná-lo automaticamente à lista
  const selectCid = async (cidCodeItem: CidCode) => {
    // Primeiro, buscar condutas cirúrgicas associadas
    try {
      const associatedApproaches = await fetchAssociatedSurgicalApproaches(cidCodeItem.id);
      console.log(`Frontend - Condutas cirúrgicas associadas recebidas:`, associatedApproaches);
      
      if (associatedApproaches.length > 0) {
        // Se tem condutas associadas, mostrar dialog para seleção
        // NÃO adicionar o CID ainda - só após escolher a conduta
        setAvailableSurgicalApproaches(associatedApproaches);
        setSelectedCidForApproach(cidCodeItem);
        setShowSurgicalApproachDialog(true);
        
        toast({
          title: "Condutas cirúrgicas encontradas",
          description: `Selecione uma conduta cirúrgica para ${cidCodeItem.code}`,
          duration: 3000,
        });
        
        return; // Não continuar - aguardar seleção da conduta
      } else {
        // Se NÃO tem condutas associadas, adicionar CID diretamente
        console.log(`CID ${cidCodeItem.code} não possui condutas associadas. Adicionando diretamente.`);
        
        // Verificar se o CID já existe na lista
        const exists = multipleCids.some((item) => item.cid.id === cidCodeItem.id);

        if (exists) {
          toast({
            title: "CID já adicionado",
            description: `${cidCodeItem.code} já foi adicionado à lista.`,
            variant: "destructive",
          });
          return;
        }

        // Adicionar o CID sem conduta cirúrgica
        const newCidItem = {
          cid: {
            id: cidCodeItem.id,
            code: cidCodeItem.code,
            description: cidCodeItem.description,
            category: cidCodeItem.category,
          },
          // Sem surgicalApproach para CIDs sem condutas associadas
        };

        const updatedCids = [...multipleCids, newCidItem];
        setMultipleCids(updatedCids);

        console.log(`CID ${cidCodeItem.code} adicionado à interface. Será salvo ao finalizar o pedido.`);

        // Manter compatibilidade com CID único (usar o primeiro da lista)
        if (updatedCids.length === 1) {
          setCidCode(cidCodeItem.code);
          setCidDescription(cidCodeItem.description);
          setSelectedCidId(cidCodeItem.id);
        }

        toast({
          title: "CID-10 adicionado",
          description: `${cidCodeItem.code} adicionado com sucesso!`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.warn("Erro ao buscar condutas cirúrgicas associadas:", error);
      
      // Em caso de erro, adicionar o CID diretamente
      const newCidItem = {
        cid: {
          id: cidCodeItem.id,
          code: cidCodeItem.code,
          description: cidCodeItem.description,
          category: cidCodeItem.category,
        },
      };

      const updatedCids = [...multipleCids, newCidItem];
      setMultipleCids(updatedCids);

      toast({
        title: "CID-10 adicionado",
        description: `${cidCodeItem.code} adicionado (não foi possível verificar condutas cirúrgicas).`,
        duration: 2000,
      });
    }

    // Buscar procedimentos CBHPM associados e adicioná-los automaticamente
    try {
      const associatedProcedures = await fetchAssociatedProcedures(cidCodeItem.id);
      console.log(`Frontend - Procedimentos associados recebidos:`, associatedProcedures);
      
      if (associatedProcedures.length > 0) {
        // Adicionar procedimentos que não existem na lista atual
        const newProcedures: Array<{ procedure: Procedure; quantity: number }> = [];
        let isFirstProcedure = true;
        
        associatedProcedures.forEach((procedure: Procedure) => {
          console.log(`Frontend - Processando procedimento:`, procedure);
          // Verificar se o procedimento já existe na lista principal ou secundária
          const existsInMain = selectedProcedure?.id === procedure.id;
          const existsInSecondary = secondaryProcedures.some(
            sp => sp.procedure.id === procedure.id
          );
          
          console.log(`Frontend - Verificações para ${procedure.name}:`, {
            existsInMain,
            existsInSecondary,
            selectedProcedureId: selectedProcedure?.id,
            secondaryProceduresCount: secondaryProcedures.length,
            isFirstProcedure
          });
          
          if (!existsInMain && !existsInSecondary) {
            // Se não há procedimento principal selecionado, definir o primeiro como principal
            if (!selectedProcedure && isFirstProcedure) {
              console.log(`Frontend - Definindo como procedimento principal:`, procedure);
              
              // Reorganizar por porte para garantir que o procedimento de maior porte seja o principal
              const { newSelectedProcedure, newSecondaryProcedures } = reorganizeProceduresByPorte(
                procedure, // Primeiro procedimento como candidato
                secondaryProcedures
              );
              
              setSelectedProcedure(newSelectedProcedure);
              setSecondaryProcedures(newSecondaryProcedures);
              setProcedureQuantity(1);
              isFirstProcedure = false;
              
              // Salvar todos os procedimentos no banco
              setTimeout(() => {
                saveAllProceduresToDatabase().then(saveSuccess => {
                  if (saveSuccess) {
                    console.log(`Procedimento principal ${procedure.code} salvo no banco`);
                  } else {
                    console.error(`Erro ao salvar procedimento principal ${procedure.code}`);
                  }
                });
              }, 100); // Pequeno delay para garantir que o estado foi atualizado
            } else {
              // Adicionar aos procedimentos secundários
              console.log(`Frontend - Adicionando como procedimento secundário:`, procedure);
              newProcedures.push({
                procedure,
                quantity: 1
              });
            }
          } else {
            console.log(`Frontend - Procedimento já existe, pulando:`, procedure.name);
          }
        });
        
        console.log(`Frontend - Novos procedimentos a serem adicionados:`, newProcedures);
        
        // Adicionar novos procedimentos secundários à lista existente
        if (newProcedures.length > 0) {
          const updatedSecondaryProcedures = [...secondaryProcedures, ...newProcedures];
          console.log(`Frontend - Atualizando procedimentos secundários:`, updatedSecondaryProcedures);
          setSecondaryProcedures(updatedSecondaryProcedures);
        }

        toast({
          title: "CID-10 e procedimentos adicionados",
          description: `${cidCodeItem.code} adicionado com ${associatedProcedures.length} procedimento(s) CBHPM associado(s)!`,
          duration: 3000,
        });
        console.log(`CID-10 e procedimentos adicionados: ${cidCodeItem.code} com ${associatedProcedures.length} procedimento(s)`);
      } else {
        toast({
          title: "CID-10 adicionado",
          description: `${cidCodeItem.code} adicionado com sucesso!`,
          duration: 2000,
        });
        console.log(`CID-10 adicionado: ${cidCodeItem.code}`);
      }
    } catch (error) {
      console.warn("Erro ao buscar procedimentos associados:", error);
      toast({
        title: "CID-10 adicionado",
        description: `${cidCodeItem.code} adicionado, mas não foi possível carregar procedimentos associados.`,
        duration: 2000,
      });
      console.log(`CID-10 adicionado com erro: ${cidCodeItem.code}`);
    }

    // Limpar seleção atual e campo de busca para permitir nova seleção
    setCurrentCid(null);
    setSearchTerm("");
    setOpen(false);
  };

  // Função para adicionar o CID atual à lista de múltiplos CIDs
  const handleAddCid = () => {
    if (currentCid) {
      // Verificar se o CID já existe na lista
      const exists = multipleCids.some((item) => item.cid.id === currentCid.id);

      if (exists) {
        toast({
          title: "CID já adicionado",
          description: "Este código CID-10 já foi adicionado à lista.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar o CID à lista
      setMultipleCids([
        ...multipleCids,
        {
          cid: currentCid,
        },
      ]);

      // Feedback para o usuário
      toast({
        title: "CID adicionado",
        description: `${currentCid.code} - ${currentCid.description} adicionado à lista.`,
      });
    }
  };

  // Função para remover um CID da lista e sua conduta cirúrgica associada
  const handleRemoveCid = async (index: number) => {
    const newCids = [...multipleCids];
    const removedCid = newCids[index];
    newCids.splice(index, 1);
    setMultipleCids(newCids);

    console.log(`CID ${removedCid.cid.code} removido da interface. Será persistido ao salvar o pedido.`);

    // Se este CID tem uma conduta cirúrgica associada, removê-la do banco
    if (removedCid.surgicalApproach && orderId) {
      try {
        const response = await fetch(`/api/medical-order-surgical-approaches`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            medicalOrderId: orderId,
            surgicalApproachId: removedCid.surgicalApproach.id
          })
        });

        if (response.ok) {
          console.log(`Conduta cirúrgica ${removedCid.surgicalApproach.name} removida do banco`);
          
          // Remover também do estado local
          setSelectedSurgicalApproaches(prev => 
            prev.filter(approach => approach.surgicalApproachId !== removedCid.surgicalApproach?.id)
          );
        }
      } catch (error) {
        console.error("Erro ao remover conduta cirúrgica do banco:", error);
      }
    }

    // Buscar procedimentos associados ao CID removido para removê-los também
    try {
      const associatedProcedures = await fetchAssociatedProcedures(removedCid.cid.id);
      
      if (associatedProcedures.length > 0) {
        // Remover procedimentos associados da lista principal e secundária
        let removedMainProcedure = false;
        let removedSecondaryCount = 0;
        
        // Verificar se o procedimento principal está associado ao CID removido
        if (selectedProcedure && associatedProcedures.some(proc => proc.id === selectedProcedure.id)) {
          setSelectedProcedure(null);
          setProcedureQuantity(1);
          removedMainProcedure = true;
        }
        
        // Remover procedimentos secundários associados
        const filteredSecondaryProcedures = secondaryProcedures.filter(sp => {
          const shouldKeep = !associatedProcedures.some(proc => proc.id === sp.procedure.id);
          if (!shouldKeep) removedSecondaryCount++;
          return shouldKeep;
        });
        
        setSecondaryProcedures(filteredSecondaryProcedures);
        
        // Feedback detalhado para o usuário
        const proceduresRemovedMessage = [];
        if (removedMainProcedure) proceduresRemovedMessage.push("1 procedimento principal");
        if (removedSecondaryCount > 0) proceduresRemovedMessage.push(`${removedSecondaryCount} procedimento(s) secundário(s)`);
        
        if (proceduresRemovedMessage.length > 0) {
          toast({
            title: "CID e procedimentos removidos",
            description: `${removedCid.cid.code} removido junto com ${proceduresRemovedMessage.join(" e ")}.`,
            duration: 3000,
          });
        } else {
          toast({
            title: "CID removido",
            description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
          });
        }
      } else {
        toast({
          title: "CID removido",
          description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
        });
      }
    } catch (error) {
      console.warn("Erro ao buscar procedimentos para remoção:", error);
      toast({
        title: "CID removido",
        description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
      });
    }

    // Atualizar compatibilidade com CID único se a lista ficar vazia
    if (newCids.length === 0) {
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
    } else {
      // Manter compatibilidade com CID único (usar o primeiro da lista)
      const firstCid = newCids[0];
      setCidCode(firstCid.cid.code);
      setCidDescription(firstCid.cid.description);
      setSelectedCidId(firstCid.cid.id);
    }
  };

  // Função para salvar todos os procedimentos no banco (ordenados por porte)
  const saveAllProceduresToDatabase = async () => {
    if (!orderId) {
      console.warn("Não há orderId para salvar procedimentos");
      return false;
    }

    try {
      // Combinar todos os procedimentos (principal + secundários) em uma lista única
      const allProcedures = [];
      
      // Adicionar procedimento principal se existir
      if (selectedProcedure) {
        allProcedures.push({
          procedure: selectedProcedure,
          quantity: procedureQuantity
        });
      }
      
      // Adicionar procedimentos secundários
      secondaryProcedures.forEach(item => {
        allProcedures.push({
          procedure: item.procedure,
          quantity: item.quantity
        });
      });

      // Ordenar por porte (maior para menor)
      const sortedProcedures = allProcedures.sort((a, b) => 
        parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
      );

      // Marcar o primeiro (maior porte) como principal
      const proceduresToSave = sortedProcedures.map((item, index) => ({
        procedureId: item.procedure.id,
        quantityRequested: item.quantity,
        isMain: index === 0 // Primeiro da lista (maior porte) é o principal
      }));

      console.log(`Salvando ${proceduresToSave.length} procedimentos para o pedido ${orderId}:`, proceduresToSave);
      
      const response = await fetch(`/api/orders/${orderId}/procedures`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ procedures: proceduresToSave })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar procedimentos: ${response.status}`);
      }

      console.log(`Todos os procedimentos salvos com sucesso no banco`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar procedimentos no banco:", error);
      return false;
    }
  };

  // Handlers para procedimentos secundários
  const handleAddSecondaryProcedure = async () => {
    if (currentSecondaryProcedure) {
      // Verificar se o procedimento já existe na lista
      const exists = secondaryProcedures.some(
        (item) => item.procedure.id === currentSecondaryProcedure.id,
      );

      if (exists) {
        toast({
          title: "Procedimento já adicionado",
          description: "Este procedimento secundário já foi adicionado.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar o procedimento à lista (sem lateralidade conforme solicitado)
      const updatedProcedures = [
        ...secondaryProcedures,
        {
          procedure: currentSecondaryProcedure,
          quantity: currentSecondaryQuantity,
        },
      ];
      
      setSecondaryProcedures(updatedProcedures);

      // Salvar todos os procedimentos no banco de dados imediatamente
      const saveSuccess = await saveAllProceduresToDatabase();
      if (saveSuccess) {
        console.log(`Procedimento secundário ${currentSecondaryProcedure.name} salvo no banco com sucesso`);
      } else {
        console.error(`Erro ao salvar procedimento secundário ${currentSecondaryProcedure.name} no banco`);
      }

      // Resetar os campos (lateralidade removida)
      setCurrentSecondaryProcedure(null);
      setCurrentSecondaryQuantity(1);
    }
  };

  // Função para calcular o valor numérico do porte para ordenação
  const parsePorteValue = (porte: string | null | undefined): number => {
    if (!porte) return 0;
    
    // Extrair número e letra do porte (ex: "10C" -> número: 10, letra: "C")
    const match = porte.match(/^(\d+)([A-Za-z]?)$/);
    if (!match) return 0;
    
    const numero = parseInt(match[1], 10);
    const letra = match[2]?.toUpperCase() || 'A';
    
    // Converter letra para valor numérico (A=1, B=2, C=3, etc.)
    const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    
    // Retornar valor combinado: (número * 100) + valor da letra
    // Isso garante que 11D > 10C > 10B > 9A
    return (numero * 100) + valorLetra;
  };

  const handleRemoveSecondaryProcedure = async (index: number) => {
    const newProcedures = [...secondaryProcedures];
    const removedProcedure = newProcedures[index];
    newProcedures.splice(index, 1);
    setSecondaryProcedures(newProcedures);

    // Salvar todos os procedimentos no banco de dados imediatamente
    const saveSuccess = await saveAllProceduresToDatabase();
    if (saveSuccess) {
      console.log(`Procedimento secundário ${removedProcedure.procedure.name} removido do banco com sucesso`);
    } else {
      console.error(`Erro ao remover procedimento secundário ${removedProcedure.procedure.name} do banco`);
    }

    toast({
      title: "Procedimento removido",
      description: `${removedProcedure.procedure.name} removido da lista`,
    });
  };

  // Função para atualizar a quantidade de um procedimento específico
  const handleUpdateProcedureQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Não permitir quantidades menores que 1
    
    const updatedProcedures = [...secondaryProcedures];
    updatedProcedures[index] = {
      ...updatedProcedures[index],
      quantity: newQuantity
    };
    setSecondaryProcedures(updatedProcedures);
  };

  return (
    <>
      <Card className="mb-6 bg-[#1a2332] border-blue-800 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center text-white">
          <FileText className="mr-2 h-6 w-6 text-blue-400" />
          Dados para Cirurgia
        </CardTitle>
        <CardDescription className="text-blue-300 text-base">
          Informe os dados necessários para a programação cirúrgica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {/* Seção para Seleção de Procedimentos Cirúrgicos */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Selecionar Procedimentos Cirúrgicos
              <span className="text-red-400 ml-1">*</span>
            </h4>
            
            {/* Campo de busca filtrada para procedimentos cirúrgicos */}
            <div className="mb-4">
              <Popover open={surgicalProcedureSearchOpen} onOpenChange={setSurgicalProcedureSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={surgicalProcedureSearchOpen}
                    className="w-full justify-between bg-[#1a2332] text-white border-blue-600 hover:bg-[#2a3441] hover:text-white h-12"
                    onClick={fetchAllSurgicalProcedures}
                  >
                    {surgicalProcedureSearchTerm ? surgicalProcedureSearchTerm : "Buscar procedimentos cirúrgicos..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-[#1a2332] border-blue-600" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command className="bg-[#1a2332]">
                    <CommandInput
                      placeholder="Digite para filtrar procedimentos..."
                      value={surgicalProcedureSearchTerm}
                      onValueChange={setSurgicalProcedureSearchTerm}
                      className="bg-[#1a2332] text-white placeholder:text-blue-300"
                    />
                    <CommandList className="text-white bg-[#1a2332] max-h-[300px]">
                      <CommandEmpty>
                        {surgicalProcedureLoading ? (
                          <div className="py-6 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                          </div>
                        ) : (
                          <p className="py-3 px-4 text-sm text-center text-blue-300">
                            Nenhum procedimento encontrado
                          </p>
                        )}
                      </CommandEmpty>

                      {/* Mostrar procedimentos disponíveis da região selecionada primeiro */}
                      {availableProceduresFromRegion.length > 0 && (
                        <CommandGroup
                          heading="Procedimentos da Região Selecionada"
                          className="text-green-200"
                        >
                          {availableProceduresFromRegion
                            .filter(procedure => 
                              procedure.name.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()) ||
                              (procedure.description && procedure.description.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()))
                            )
                            .map((procedure) => (
                            <CommandItem
                              key={`region-${procedure.id}`}
                              value={procedure.name}
                              onSelect={() => handleSelectSurgicalProcedure(procedure)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-800/50 border-l-2 border-green-500"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-white">
                                  {procedure.name}
                                </div>
                                {procedure.description && (
                                  <div className="text-sm text-gray-300 mt-1">
                                    {procedure.description}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Mostrar todos os procedimentos disponíveis */}
                      {allSurgicalProcedures.length > 0 && (
                        <CommandGroup
                          heading="Todos os Procedimentos"
                          className="text-blue-200"
                        >
                          {allSurgicalProcedures
                            .filter(procedure => 
                              procedure.name.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()) ||
                              (procedure.description && procedure.description.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()))
                            )
                            .map((procedure) => (
                            <CommandItem
                              key={`all-${procedure.id}`}
                              value={procedure.name}
                              onSelect={() => handleSelectSurgicalProcedure(procedure)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-800/50"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-white">
                                  {procedure.name}
                                </div>
                                {procedure.description && (
                                  <div className="text-sm text-gray-300 mt-1">
                                    {procedure.description}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Lista de procedimentos selecionados com suas condutas clínicas */}
            {selectedSurgicalProcedures && selectedSurgicalProcedures.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-blue-300 mb-3">
                  Procedimentos selecionados:
                </p>
                
                <div className="space-y-4">
                  {selectedSurgicalProcedures.map((procedure) => (
                    <div
                      key={procedure.id}
                      className="p-4 bg-blue-800/30 rounded-lg border border-blue-600/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-white">
                            {procedure.name}
                          </div>
                          {procedure.description && (
                            <div className="text-sm text-gray-300 mt-1">
                              {procedure.description}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => {
                            setSelectedSurgicalProcedures(prev => 
                              prev.filter(p => p.id !== procedure.id)
                            );
                            toast({
                              title: "Procedimento removido",
                              description: `${procedure.name} foi removido`,
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Seleção de Conduta Clínica para o procedimento */}
                      <div className="mt-3">
                        <ConductSelector 
                          procedureId={procedure.id}
                          procedureName={procedure.name}
                          orderId={orderId}
                          autoOpenModal={autoOpenConductModalForProcedureId === procedure.id}
                          onModalClose={() => setAutoOpenConductModalForProcedureId(null)}
                          setMultipleCids={setMultipleCids}
                          setSelectedProcedure={setSelectedProcedure}
                          setSecondaryProcedures={setSecondaryProcedures}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-blue-300 mt-3">
              Selecione os procedimentos cirúrgicos apropriados baseados na região anatômica e no diagnóstico
            </p>
          </div>

          {/* Seção para Códigos CID-10 */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Selecionar Códigos CID-10{" "}
              <span className="text-red-400 ml-1">*</span>
            </h4>
            <div className="space-y-4">
              <div className="w-full">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between bg-[#1a2332] text-white border-blue-800 hover:bg-blue-900"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando códigos CID-10...
                        </span>
                      ) : (
                        "Pesquise e selecione códigos CID-10"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-0 max-h-[400px] overflow-auto bg-[#1a2332] border-blue-800"
                      align="start"
                    >
                      <Command className="bg-[#1a2332]" shouldFilter={false}>
                        <CommandInput
                          placeholder="Pesquise por código ou descrição CID-10 na base de dados..."
                          value={searchTerm}
                          onValueChange={(value) => {
                            // Aplicar formatação automática se parecer ser um código CID-10
                            if (/^[A-Za-z][0-9]{3}$/.test(value.replace(/[^A-Za-z0-9]/g, ''))) {
                              const formatted = formatCidCode(value);
                              setSearchTerm(formatted);
                            } else {
                              setSearchTerm(value);
                            }
                          }}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          {isLoading ? (
                            <div className="py-6 flex justify-center items-center text-blue-300">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                              <span className="ml-2">
                                Consultando códigos CID-10 na tabela
                                cid_codes...
                              </span>
                            </div>
                          ) : (
                            <>
                              {cidCodes.length === 0 &&
                              searchTerm.length >= 2 ? (
                                <CommandEmpty className="text-blue-300">
                                  Nenhum CID-10 encontrado para "{searchTerm}".
                                </CommandEmpty>
                              ) : null}
                              {searchTerm && cidCodes.length > 0 ? (
                                <CommandGroup className="text-blue-200">
                                  {cidCodes.map((cid: CidCode) => (
                                    <CommandItem
                                      key={cid.code}
                                      value={`${cid.code} ${cid.description}`}
                                      onSelect={() => selectCid(cid)}
                                      className="cursor-pointer hover:bg-blue-900/50"
                                    >
                                      <strong className="text-blue-400">
                                        {cid.code}
                                      </strong>
                                      <span className="ml-2 text-white">
                                        {cid.description}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ) : (
                                <>
                                  {CATEGORIES.map((category) => {
                                    const categoryCids =
                                      cidCodesByCategory[category] || [];

                                    if (categoryCids.length === 0) return null;

                                    return (
                                      <CommandGroup
                                        key={category}
                                        heading={category}
                                        className="text-blue-200"
                                      >
                                        {categoryCids.map((cid) => (
                                          <CommandItem
                                            key={cid.code}
                                            value={`${cid.code} ${cid.description}`}
                                            onSelect={() => selectCid(cid)}
                                            className="cursor-pointer hover:bg-blue-900/50"
                                          >
                                            <strong className="text-blue-400">
                                              {cid.code}
                                            </strong>
                                            <span className="ml-2 text-white">
                                              {cid.description}
                                            </span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    );
                                  })}
                                </>
                              )}
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
              </div>

              {/* Lista de CIDs selecionados */}
              <div className="mt-4">
                {multipleCids.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-blue-300">
                      Códigos CID-10 Selecionados:
                    </h4>
                    <div className="space-y-2">
                      {multipleCids.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center rounded-md border border-blue-700 bg-blue-900/20 p-3"
                        >
                          <div>
                            <div className="font-medium text-blue-200">
                              <span className="font-bold">{item.cid?.code || item.code}</span>{" "}
                              - {item.cid?.description || item.description}
                              {(item.isAutoAdded || item.cid?.isAutoAdded) && (
                                <span className="ml-2 px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full">
                                  Automático
                                </span>
                              )}
                            </div>
                            {(item.cid?.category || item.category) && (
                              <div className="text-xs text-blue-300 mt-1">
                                Categoria: {item.cid?.category || item.category}
                              </div>
                            )}
                            {/* Mostrar conduta cirúrgica específica desta linha */}
                            {item.surgicalApproach && (
                              <div className="text-xs text-green-300 mt-2">
                                <span className="inline-block px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded-full border border-green-700">
                                  {item.surgicalApproach.name}
                                  {item.surgicalApproach.isPrimary && " (Principal)"}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveCid(index)}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-blue-300 mt-2">
                Adicione os códigos CID-10 correspondentes às condições médicas do paciente
              </p>
              {searchTerm &&
              searchTerm.length >= 2 &&
              cidCodes.length === 0 &&
              !isLoading ? (
                <p className="text-xs text-orange-300 mt-1">
                  Nenhum código CID-10 encontrado para "{searchTerm}". Tente
                  outros termos como "ombro", "joelho", etc.
                </p>
              ) : null}
            </div>
          </div>

          {/* Campo de Lateralidade da Cirurgia */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Lateralidade da Cirurgia{" "}
              <span className="text-red-400 ml-1">*</span>
            </h4>
            
            {/* Botões de lateralidade alinhados horizontalmente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("bilateral");
                  setProcedureLaterality("bilateral");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "bilateral"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Bilateral
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("direito");
                  setProcedureLaterality("direito");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "direito"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Direito
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("esquerdo");
                  setProcedureLaterality("esquerdo");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "esquerdo"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Esquerdo
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("nao_se_aplica");
                  setProcedureLaterality("nao_se_aplica");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "nao_se_aplica"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Não se aplica
              </button>
            </div>
            
            <p className="text-xs text-blue-300 mt-2">
              Selecione a lateralidade correspondente ao procedimento cirúrgico
            </p>
          </div>

          {/* Campo de Caráter do Procedimento */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Caráter do Procedimento{" "}
              <span className="text-red-400 ml-1">*</span>
            </h4>
            
            {/* Botões de caráter alinhados horizontalmente */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA)}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${procedureType === PROCEDURE_TYPE_VALUES.ELETIVA
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                {PROCEDURE_TYPES.ELETIVA}
              </button>
              
              <button
                type="button"
                onClick={() => setProcedureType(PROCEDURE_TYPE_VALUES.URGENCIA)}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${procedureType === PROCEDURE_TYPE_VALUES.URGENCIA
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                {PROCEDURE_TYPES.URGENCIA}
              </button>
            </div>
            
            <p className="text-xs text-blue-300 mt-2">
              Selecione o caráter do procedimento cirúrgico
            </p>
          </div>

          {/* Procedimentos Cirúrgicos Necessários */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                Procedimentos Cirúrgicos Necessários
              </h4>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-3 md:space-y-0">
                  <div className="flex-grow">
                    <Label
                      htmlFor="secondaryProcedure"
                      className="mb-2 block text-sm text-white"
                    >
                      Procedimento CBHPM
                    </Label>
                    <Popover
                      open={secondaryProcedureSearchOpen}
                      onOpenChange={setSecondaryProcedureSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="secondaryProcedure"
                          variant="outline"
                          role="combobox"
                          aria-expanded={secondaryProcedureSearchOpen}
                          className="w-full justify-between"
                        >
                          "Pesquise e selecione procedimentos CBHPM"
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0 bg-[#1a2332] border-blue-800" align="start" side="bottom" sideOffset={4}>
                        <Command className="bg-[#1a2332]" shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar procedimento por código ou descrição..."
                            value={procedureSearchTerm}
                            onValueChange={(value) => {
                              // Aplicar formatação automática se parecer ser um código CBHPM
                              const cleaned = value.replace(/[^0-9]/g, '');
                              // Se o valor digitado contém apenas números, aplicar formatação
                              if (cleaned.length >= 3 && value.replace(/[.\-]/g, '') === cleaned) {
                                const formatted = formatCbhpmCode(cleaned);
                                setProcedureSearchTerm(formatted);
                              } else {
                                setProcedureSearchTerm(value);
                              }
                            }}
                            className="bg-[#1a2332] text-white placeholder:text-blue-300"
                          />
                          <CommandList className="text-white bg-[#1a2332]">
                            <CommandEmpty>
                              {procedureSearchTerm.length < 3 ? (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Digite pelo menos 3 caracteres para buscar
                                </p>
                              ) : procedureLoading ? (
                                <div className="py-6 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                </div>
                              ) : (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Nenhum procedimento encontrado
                                </p>
                              )}
                            </CommandEmpty>



                            {procedureResults.length > 0 && (
                              <CommandGroup
                                heading="Códigos CBHPM Encontrados"
                                className="text-blue-200"
                              >
                                {procedureResults.map((procedure) => (
                                  <CommandItem
                                    key={procedure.id}
                                    value={procedure.code + procedure.name}
                                    onSelect={() => {
                                      // Verificar se o procedimento já existe na lista
                                      const exists = secondaryProcedures.some(
                                        (item) => item.procedure.id === procedure.id
                                      );

                                      if (exists) {
                                        toast({
                                          title: "Procedimento já adicionado",
                                          description: "Este procedimento já foi adicionado à lista.",
                                          variant: "destructive",
                                          duration: 3000,
                                        });
                                        setSecondaryProcedureSearchOpen(false);
                                        return;
                                      }

                                      // Adicionar automaticamente à lista com a quantidade atual
                                      const newProcedure = {
                                        procedure: procedure,
                                        quantity: currentSecondaryQuantity,
                                      };

                                      const updatedProcedures = [...secondaryProcedures, newProcedure];
                                      
                                      // Reorganizar procedimentos por porte após adição
                                      const { newSelectedProcedure, newSecondaryProcedures } = reorganizeProceduresByPorte(
                                        selectedProcedure,
                                        updatedProcedures
                                      );
                                      
                                      // Aplicar reorganização
                                      setSelectedProcedure(newSelectedProcedure);
                                      setSecondaryProcedures(newSecondaryProcedures);

                                      // Salvar todos os procedimentos no banco de dados imediatamente
                                      saveAllProceduresToDatabase().then(saveSuccess => {
                                        if (saveSuccess) {
                                          console.log(`Procedimento ${procedure.code} salvo no banco com sucesso`);
                                        } else {
                                          console.error(`Erro ao salvar procedimento ${procedure.code} no banco`);
                                        }
                                      });

                                      // Limpar seleção e fechar popup
                                      setCurrentSecondaryProcedure(null);
                                      setCurrentSecondaryQuantity(1);
                                      setSecondaryProcedureSearchOpen(false);

                                      toast({
                                        title: "Procedimento adicionado",
                                        description: `${procedure.code} adicionado com sucesso!`,
                                        duration: 2000,
                                      });
                                    }}
                                    className="py-2 hover:bg-blue-900/50"
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-blue-400">
                                          {procedure.code}
                                        </span>
                                        {procedure.porte && (
                                          <span className="text-xs px-2 py-1 bg-blue-900/50 rounded-full text-blue-300">
                                            Porte: {procedure.porte}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm mt-1 text-white">
                                        {procedure.name}
                                      </span>
                                      {procedure.description && (
                                        <span className="text-xs text-blue-300 mt-1 line-clamp-2">
                                          {procedure.description}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-24">
                    <Label
                      htmlFor="secondaryQuantity"
                      className="mb-2 block text-sm text-white"
                    >
                      Quantidade
                    </Label>
                    <Input
                      id="secondaryQuantity"
                      type="number"
                      min="1"
                      value={currentSecondaryQuantity}
                      onChange={(e) =>
                        setCurrentSecondaryQuantity(
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-full bg-[#1a2332] text-white border-blue-800"
                    />
                  </div>

                  {/* Componente de lateralidade removido conforme solicitado */}
                </div>
              </div>

              {/* Lista unificada de todos os procedimentos */}
              <div className="mt-4">
                {(() => {
                  // Combinar procedimento principal com secundários
                  const allProcedures = [];
                  
                  // Adicionar procedimento principal se existir
                  if (selectedProcedure) {
                    allProcedures.push({
                      procedure: selectedProcedure,
                      quantity: procedureQuantity,
                      isFromMain: true
                    });
                  }
                  
                  // Adicionar procedimentos secundários
                  secondaryProcedures.forEach(item => {
                    allProcedures.push({
                      procedure: item.procedure,
                      quantity: item.quantity,
                      isFromMain: false
                    });
                  });

                  // Ordenar por porte (maior para menor)
                  const sortedProcedures = allProcedures.sort((a, b) => 
                    getPorteValue(b.procedure.porte) - getPorteValue(a.procedure.porte)
                  );

                  return sortedProcedures.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-blue-300">
                        Procedimentos Cirúrgicos Necessários ({sortedProcedures.length})
                      </h4>
                      <div className="space-y-2">
                        {sortedProcedures.map((item, index) => (
                          <div
                            key={`${item.procedure.id}-${item.isFromMain ? 'main' : 'secondary'}-${index}`}
                            className="flex items-center justify-between p-3 border border-blue-800 rounded-md bg-blue-900/30"
                          >
                            <div className="flex-grow">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-blue-400">
                                  {item.quantity} x {item.procedure.code} - {item.procedure.name}
                                </span>
                                {item.procedure.porte && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-900/50 rounded-full text-blue-300">
                                    Porte: {item.procedure.porte}
                                  </span>
                                )}
                                {index === 0 && (
                                  <span className="text-xs px-2 py-0.5 bg-green-900/50 rounded-full text-green-300">
                                    Procedimento Principal
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-blue-300 mt-1 flex flex-wrap gap-2">
                                <span>Auxiliares: {item.procedure.numeroAuxiliares || 0}</span>
                                <span>Porte Anestesista: {item.procedure.porteAnestesista || "0"}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs font-medium text-blue-300">
                                    Qtd:
                                  </span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 1;
                                      if (item.isFromMain) {
                                        setProcedureQuantity(newQuantity);
                                      } else {
                                        const secondaryIndex = secondaryProcedures.findIndex(sp => sp.procedure.id === item.procedure.id);
                                        if (secondaryIndex !== -1) {
                                          handleUpdateProcedureQuantity(secondaryIndex, newQuantity);
                                        }
                                      }
                                    }}
                                    className="w-16 h-8 text-xs bg-[#1a2332] text-white border-blue-800"
                                  />
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (item.isFromMain) {
                                    // Remover procedimento principal
                                    setSelectedProcedure(null);
                                    setProcedureQuantity(1);
                                    saveAllProceduresToDatabase();
                                    toast({
                                      title: "Procedimento removido",
                                      description: `${item.procedure.name} removido da lista`,
                                    });
                                  } else {
                                    // Remover procedimento secundário
                                    const secondaryIndex = secondaryProcedures.findIndex(sp => sp.procedure.id === item.procedure.id);
                                    if (secondaryIndex !== -1) {
                                      handleRemoveSecondaryProcedure(secondaryIndex);
                                    }
                                  }
                                }}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <p className="text-xs text-blue-300 mt-2">
                Adicione os procedimentos necessários para a cirurgia.
              </p>
            </div>

            {/* Seção para Lista de Materiais Necessários para a cirurgia OPME */}
            <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <Package className="mr-2 h-5 w-5 text-blue-400" />
                Lista de Materiais Necessários para a cirurgia OPME
              </h4>
              <div className="space-y-4">
                {/* Formulário para busca de materiais OPME */}
                <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-3 md:space-y-0">
                  <div className="flex-grow">
                    <Label
                      htmlFor="opme-search"
                      className="mb-2 block text-sm text-white"
                    >
                      Material OPME
                    </Label>
                    <Popover
                      open={opmeSearchOpen}
                      onOpenChange={setOpmeSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={opmeSearchOpen}
                          className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                        >
                          {opmeLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Buscando materiais...
                            </span>
                          ) : (
                            "Pesquise e selecione materiais OPME"
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0 bg-[#1a2332] border-blue-800" align="start" side="bottom" sideOffset={4}>
                        <Command className="bg-[#1a2332]" shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar nome técnico, comercial ou registro ANVISA..."
                            value={opmeSearchTerm}
                            onValueChange={setOpmeSearchTerm}
                            className="bg-[#1a2332] text-white placeholder:text-blue-300"
                          />
                          <CommandList className="text-white bg-[#1a2332]">
                            <CommandEmpty>
                              {opmeSearchTerm.length < 3 ? (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Digite pelo menos 3 caracteres para buscar
                                </p>
                              ) : opmeLoading ? (
                                <div className="py-6 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                </div>
                              ) : (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Nenhum material encontrado
                                </p>
                              )}
                            </CommandEmpty>
                            <CommandGroup className="text-blue-200">
                              {opmeResults.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.technicalName} ${item.commercialName}`}
                                  className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                  onSelect={() => handleSelectOpmeItem(item)}
                                >
                                  <div>
                                    <div className="font-medium">
                                      {item.technicalName}
                                    </div>
                                    <div className="text-xs flex flex-col text-blue-300">
                                      <span>
                                        Nome Com.: {item.commercialName}
                                      </span>
                                      {item.anvisaRegistrationNumber && (
                                        <span>
                                          Reg. ANVISA:{" "}
                                          {item.anvisaRegistrationNumber}
                                        </span>
                                      )}
                                      <span>
                                        Fabric.: {item.manufacturerName}
                                      </span>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-24">
                    <Label
                      htmlFor="opmeQuantity"
                      className="mb-2 block text-sm text-white"
                    >
                      Quantidade
                    </Label>
                    <Input
                      id="opmeQuantity"
                      type="number"
                      min="1"
                      value={opmeQuantity}
                      onChange={(e) =>
                        setOpmeQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-full bg-[#1a2332] text-white border-blue-800"
                    />
                  </div>


                </div>

                {/* Lista de materiais OPME adicionados */}
                <div>
                  <h5 className="text-xs font-medium mb-2 text-blue-300">
                    Materiais selecionados{" "}
                    {opmeItems.length > 0 && `(${opmeItems.length})`}
                  </h5>
                  {opmeItems.length === 0 ? (
                    <div className="text-blue-300 italic text-sm mb-3">
                      Nenhum material OPME adicionado para este procedimento.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {opmeItems.map((opmeItem, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border border-blue-800 rounded-md bg-blue-900/30"
                        >
                          <div className="flex-grow">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-white">
                                {opmeItem.item.technicalName}
                              </span>
                              {opmeItem.item.anvisaRegistrationNumber && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-900/50 rounded-full text-blue-300">
                                  Reg: {opmeItem.item.anvisaRegistrationNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-blue-300 mt-1">
                              <span>
                                Nome Comercial: {opmeItem.item.commercialName}
                              </span>
                            </div>
                            <div className="text-xs text-blue-300">
                              <span>
                                Fabricante: {opmeItem.item.manufacturerName}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-medium text-blue-300">
                                Qtd:
                              </span>
                              <Input
                                type="number"
                                min="1"
                                value={opmeItem.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  console.log(`🔍 DEBUG - Input onChange:`, {
                                    inputValue: e.target.value,
                                    parsedQuantity: newQuantity,
                                    index: index
                                  });
                                  handleUpdateOpmeQuantity(index, newQuantity);
                                }}
                                className="w-16 h-8 text-xs bg-[#1a2332] text-white border-blue-800"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveOpmeItem(index)}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seção para Seleção de Fornecedores */}
            <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                Fornecedores de Materiais OPME
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primeiro fornecedor */}
                <div className="space-y-2">
                  <Label className="text-sm text-white">
                    Fornecedor 1
                  </Label>
                  <Popover
                    open={supplier1Open}
                    onOpenChange={(open) => {
                      setSupplier1Open(open);
                      if (open) loadAllSuppliers();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplier1Open}
                        className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                      >
                        {supplierLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando fornecedores...
                          </span>
                        ) : selectedSupplier1 ? (
                          <span className="flex flex-col text-left truncate">
                            <span className="font-medium">
                              {selectedSupplier1.tradeName ||
                                selectedSupplier1.companyName}
                            </span>
                            <span className="text-xs text-blue-300">
                              CNPJ: {selectedSupplier1.cnpj}
                            </span>
                          </span>
                        ) : (
                          "Selecionar fornecedor"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0 bg-[#1a2332] border-blue-800" align="start" side="bottom" sideOffset={4}>
                      <Command className="bg-[#1a2332]">
                        <CommandInput
                          placeholder="Buscar nome da empresa ou CNPJ..."
                          value={supplierSearchTerm}
                          onValueChange={setSupplierSearchTerm}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          <CommandEmpty>
                            {supplierSearchTerm.length < 3 ? (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Digite pelo menos 3 caracteres para buscar
                              </p>
                            ) : supplierLoading ? (
                              <div className="py-6 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                              </div>
                            ) : (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Nenhum fornecedor encontrado
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup className="text-blue-200">
                            {supplierSearchTerm.length >= 3 &&
                              !supplierLoading && (
                                <div className="p-2">
                                  <Button
                                    className="w-full justify-center bg-blue-700 hover:bg-blue-600"
                                    onClick={handleSupplierSearch}
                                  >
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar fornecedores
                                  </Button>
                                </div>
                              )}
                            {supplierResults.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                onSelect={() => handleSelectSupplier1(supplier)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.tradeName || supplier.companyName}
                                  </div>
                                  {supplier.tradeName !==
                                    supplier.companyName && (
                                    <div className="text-xs text-blue-300">
                                      {supplier.companyName}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-300">
                                    CNPJ: {supplier.cnpj}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Segundo fornecedor */}
                <div className="space-y-2">
                  <Label className="text-sm text-white">
                    Fornecedor 2
                  </Label>
                  <Popover
                    open={supplier2Open}
                    onOpenChange={(open) => {
                      setSupplier2Open(open);
                      if (open) loadAllSuppliers();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplier2Open}
                        className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                      >
                        {supplierLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando fornecedores...
                          </span>
                        ) : selectedSupplier2 ? (
                          <span className="flex flex-col text-left truncate">
                            <span className="font-medium">
                              {selectedSupplier2.tradeName ||
                                selectedSupplier2.companyName}
                            </span>
                            <span className="text-xs text-blue-300">
                              CNPJ: {selectedSupplier2.cnpj}
                            </span>
                          </span>
                        ) : (
                          "Selecionar fornecedor"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0 bg-[#1a2332] border-blue-800" align="start" side="bottom" sideOffset={4}>
                      <Command className="bg-[#1a2332]">
                        <CommandInput
                          placeholder="Buscar nome da empresa ou CNPJ..."
                          value={supplierSearchTerm}
                          onValueChange={setSupplierSearchTerm}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          <CommandEmpty>
                            {supplierSearchTerm.length < 3 ? (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Digite pelo menos 3 caracteres para buscar
                              </p>
                            ) : supplierLoading ? (
                              <div className="py-6 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                              </div>
                            ) : (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Nenhum fornecedor encontrado
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup className="text-blue-200">
                            {supplierSearchTerm.length >= 3 &&
                              !supplierLoading && (
                                <div className="p-2">
                                  <Button
                                    className="w-full justify-center bg-blue-700 hover:bg-blue-600"
                                    onClick={handleSupplierSearch}
                                  >
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar fornecedores
                                  </Button>
                                </div>
                              )}
                            {supplierResults.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                onSelect={() => handleSelectSupplier2(supplier)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.tradeName || supplier.companyName}
                                  </div>
                                  {supplier.tradeName !==
                                    supplier.companyName && (
                                    <div className="text-xs text-blue-300">
                                      {supplier.companyName}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-300">
                                    CNPJ: {supplier.cnpj}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Terceiro fornecedor */}
                <div className="space-y-2">
                  <Label className="text-sm text-white">
                    Fornecedor 3
                  </Label>
                  <Popover
                    open={supplier3Open}
                    onOpenChange={(open) => {
                      setSupplier3Open(open);
                      if (open) loadAllSuppliers();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplier3Open}
                        className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                      >
                        {supplierLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando fornecedores...
                          </span>
                        ) : selectedSupplier3 ? (
                          <span className="flex flex-col text-left truncate">
                            <span className="font-medium">
                              {selectedSupplier3.tradeName ||
                                selectedSupplier3.companyName}
                            </span>
                            <span className="text-xs text-blue-300">
                              CNPJ: {selectedSupplier3.cnpj}
                            </span>
                          </span>
                        ) : (
                          "Selecionar fornecedor"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0 bg-[#1a2332] border-blue-800" align="start" side="bottom" sideOffset={4}>
                      <Command className="bg-[#1a2332]">
                        <CommandInput
                          placeholder="Buscar nome da empresa ou CNPJ..."
                          value={supplierSearchTerm}
                          onValueChange={setSupplierSearchTerm}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          <CommandEmpty>
                            {supplierSearchTerm.length < 3 ? (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Digite pelo menos 3 caracteres para buscar
                              </p>
                            ) : supplierLoading ? (
                              <div className="py-6 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                              </div>
                            ) : (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Nenhum fornecedor encontrado
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup className="text-blue-200">
                            {supplierSearchTerm.length >= 3 &&
                              !supplierLoading && (
                                <div className="p-2">
                                  <Button
                                    className="w-full justify-center bg-blue-700 hover:bg-blue-600"
                                    onClick={handleSupplierSearch}
                                  >
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar fornecedores
                                  </Button>
                                </div>
                              )}
                            {supplierResults.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                onSelect={() => handleSelectSupplier3(supplier)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.tradeName || supplier.companyName}
                                  </div>
                                  {supplier.tradeName !==
                                    supplier.companyName && (
                                    <div className="text-xs text-blue-300">
                                      {supplier.companyName}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-300">
                                    CNPJ: {supplier.cnpj}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Seção para Sugestão de Justificativa Clínica */}
            <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                Sugestão de Justificativa Clínica <span className="text-red-500">*</span>
              </h4>
              <div className="space-y-2">
                <Label
                  htmlFor="clinical-justification"
                  className="text-sm text-white"
                >
                  Insira uma sugestão de justificativa clínica para o
                  procedimento
                </Label>
                <Textarea
                  id="clinical-justification"
                  placeholder="Digite a sugestão de justificativa clínica..."
                  value={clinicalJustification}
                  onChange={(e) => setClinicalJustification(e.target.value)}
                  className="min-h-48 bg-[#1a2332] text-white border-blue-800 resize-y"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para seleção de condutas cirúrgicas */}
      {showSurgicalApproachDialog && selectedCidForApproach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#1a2332] border border-blue-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">
                Condutas Cirúrgicas Disponíveis
              </h3>
              <p className="text-blue-300 text-sm mb-4">
                Para o CID-10 <strong className="text-blue-400">{selectedCidForApproach.code}</strong> - {selectedCidForApproach.description}
              </p>
            </div>

            {availableSurgicalApproaches.length > 0 ? (
              <div className="space-y-3 mb-6">
                {availableSurgicalApproaches.map((association, index) => (
                  <div
                    key={index}
                    className="border border-blue-700 rounded-lg p-4 bg-blue-900/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-400 mb-1">
                          {association.approachName}
                        </h4>
                        {association.approachDescription && (
                          <p className="text-sm text-blue-300 mb-2">
                            {association.approachDescription}
                          </p>
                        )}
                        {association.isPreferred && (
                          <span className="inline-block px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full">
                            Conduta Preferencial
                          </span>
                        )}
                      </div>
                      <button
                        className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        onClick={async () => {
                          const approachData = {
                            surgicalApproachId: association.surgicalApproachId,
                            surgicalApproachName: association.approachName,
                            isPrimary: association.isPreferred || false,
                            justificationUsed: `Conduta selecionada para CID-10 ${selectedCidForApproach.code}`,
                            additionalNotes: association.notes || null
                          };
                          
                          // Criar nova linha CID + Conduta
                          const newCidWithApproach = {
                            cid: {
                              id: selectedCidForApproach.id,
                              code: selectedCidForApproach.code,
                              description: selectedCidForApproach.description,
                              category: selectedCidForApproach.category
                            },
                            surgicalApproach: {
                              id: association.surgicalApproachId,
                              name: association.approachName,
                              description: association.approachDescription,
                              isPrimary: association.isPreferred || false
                            }
                          };

                          // Adicionar à lista de CIDs (criando linha separada)
                          if (setMultipleCids) {
                            setMultipleCids((prev: any) => [...prev, newCidWithApproach]);
                          }
                          
                          setSelectedSurgicalApproaches(prev => [...prev, approachData]);
                          
                          // AUTO-PREENCHIMENTO: Buscar dados completos da conduta cirúrgica
                          try {
                            console.log(`🔄 Iniciando auto-preenchimento para conduta cirúrgica ID: ${association.surgicalApproachId}, CID principal: ${selectedCidForApproach.id}`);
                            
                            const response = await fetch(`/api/surgical-approaches/${association.surgicalApproachId}/complete?primaryCidId=${selectedCidForApproach.id}`, {
                              credentials: 'include'
                            });
                            
                            if (response.ok) {
                              const completeData = await response.json();
                              console.log('📋 Dados completos da conduta cirúrgica:', completeData);
                              

                              
                              // Auto-preencher procedimentos CBHPM
                              if (completeData.procedures && completeData.procedures.length > 0) {
                                const proceduresForSelection = completeData.procedures.map((proc: any) => ({
                                  procedure: {
                                    id: proc.id,
                                    code: proc.code,
                                    name: proc.name || proc.description,
                                    description: proc.description,
                                    active: true,
                                    porte: proc.porte
                                  },
                                  quantity: 1,
                                  isPreferred: proc.isPreferred
                                }));
                                
                                console.log(`🏥 Auto-preenchendo ${proceduresForSelection.length} procedimentos CBHPM`);
                                setSecondaryProcedures(proceduresForSelection);
                                
                                // Definir procedimento principal se houver um preferido
                                const preferredProcedure = completeData.procedures.find((proc: any) => proc.isPreferred);
                                if (preferredProcedure && setSelectedProcedure) {
                                  setSelectedProcedure({
                                    id: preferredProcedure.id,
                                    code: preferredProcedure.code,
                                    name: preferredProcedure.name || preferredProcedure.description,
                                    description: preferredProcedure.description,
                                    active: true,
                                    porte: preferredProcedure.porte
                                  });
                                  console.log(`✅ Procedimento principal definido: ${preferredProcedure.code}`);
                                }
                              }
                              
                              // Auto-preencher itens OPME
                              if (completeData.opmeItems && completeData.opmeItems.length > 0) {
                                const opmeForSelection = completeData.opmeItems.map((opme: any) => ({
                                  item: {
                                    id: opme.id,
                                    technicalName: opme.technicalName,
                                    commercialName: opme.commercialName,
                                    manufacturerName: opme.manufacturerName || '',
                                    anvisaRegistrationNumber: opme.anvisaRegistrationNumber,
                                    riskClass: opme.riskClass,
                                    registrationHolder: opme.registrationHolder
                                  },
                                  quantity: opme.quantity || 1
                                }));
                                
                                console.log(`📦 Auto-preenchendo ${opmeForSelection.length} itens OPME`);
                                if (setSelectedOpmeItems) {
                                  setSelectedOpmeItems(opmeForSelection);
                                }
                              }
                              
                              // Auto-preencher fornecedores
                              if (completeData.suppliers && completeData.suppliers.length > 0) {
                                const suppliers = completeData.suppliers.slice(0, 3); // Máximo 3 fornecedores
                                
                                console.log(`🏢 Auto-preenchendo ${suppliers.length} fornecedores`);
                                
                                if (suppliers[0]) {
                                  setSelectedSupplier1({
                                    id: suppliers[0].id,
                                    companyName: suppliers[0].companyName,
                                    tradeName: suppliers[0].tradeName,
                                    cnpj: suppliers[0].cnpj,
                                    municipalityId: suppliers[0].municipalityId,
                                    address: suppliers[0].address,
                                    phone: suppliers[0].phone,
                                    email: suppliers[0].email,
                                    active: suppliers[0].active
                                  });
                                }
                                
                                if (suppliers[1]) {
                                  setSelectedSupplier2({
                                    id: suppliers[1].id,
                                    companyName: suppliers[1].companyName,
                                    tradeName: suppliers[1].tradeName,
                                    cnpj: suppliers[1].cnpj,
                                    municipalityId: suppliers[1].municipalityId,
                                    address: suppliers[1].address,
                                    phone: suppliers[1].phone,
                                    email: suppliers[1].email,
                                    active: suppliers[1].active
                                  });
                                }
                                
                                if (suppliers[2]) {
                                  setSelectedSupplier3({
                                    id: suppliers[2].id,
                                    companyName: suppliers[2].companyName,
                                    tradeName: suppliers[2].tradeName,
                                    cnpj: suppliers[2].cnpj,
                                    municipalityId: suppliers[2].municipalityId,
                                    address: suppliers[2].address,
                                    phone: suppliers[2].phone,
                                    email: suppliers[2].email,
                                    active: suppliers[2].active
                                  });
                                }
                              }
                              
                              // Auto-preencher justificativa clínica
                              if (completeData.justifications && completeData.justifications.length > 0) {
                                const preferredJustification = completeData.justifications.find((just: any) => just.isPreferred) 
                                  || completeData.justifications[0];
                                
                                if (preferredJustification && setClinicalJustification) {
                                  const justificationText = preferredJustification.content || preferredJustification.title;
                                  setClinicalJustification(justificationText);
                                  console.log(`📄 Auto-preenchendo justificativa clínica: ${preferredJustification.title}`);
                                }
                              }
                              
                              toast({
                                title: "Conduta cirúrgica selecionada",
                                description: `${association.approachName} foi selecionada e os campos foram preenchidos automaticamente`,
                                duration: 4000,
                              });
                            } else {
                              console.error('Erro ao buscar dados completos da conduta cirúrgica');
                              toast({
                                title: "Conduta cirúrgica adicionada",
                                description: `${association.approachName} foi associada ao pedido médico`,
                                duration: 3000,
                              });
                            }
                          } catch (error) {
                            console.error('Erro no auto-preenchimento:', error);
                            toast({
                              title: "Conduta cirúrgica adicionada",
                              description: `${association.approachName} foi associada ao pedido médico`,
                              duration: 3000,
                            });
                          }
                          
                          // Salvar no banco imediatamente
                          saveSurgicalApproachesToDatabase([approachData]).then(success => {
                            if (success) {
                              // Fechar o dialog após seleção bem-sucedida
                              setShowSurgicalApproachDialog(false);
                              setSelectedCidForApproach(null);
                              
                              // Limpar busca para permitir nova seleção
                              setSearchTerm("");
                              setOpen(false);
                            }
                          });
                        }}
                      >
                        Selecionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-blue-300">
                  Nenhuma conduta cirúrgica encontrada para este CID-10.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-blue-300 hover:text-white transition-colors"
                onClick={() => {
                  setShowSurgicalApproachDialog(false);
                  setAvailableSurgicalApproaches([]);
                  setSelectedCidForApproach(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente para seleção de regiões anatômicas com integração de procedimentos
interface AnatomicalRegionSelectorProps {
  onRegionSelect?: (region: AnatomicalRegion) => void;
  selectedSurgicalProcedures?: SurgicalProcedure[];
  setSelectedSurgicalProcedures?: (procedures: SurgicalProcedure[]) => void;
  availableProceduresFromRegion?: SurgicalProcedure[];
  setAvailableProceduresFromRegion?: (procedures: SurgicalProcedure[]) => void;
}

export const AnatomicalRegionSelector: React.FC<AnatomicalRegionSelectorProps> = ({
  onRegionSelect,
  selectedSurgicalProcedures = [],
  setSelectedSurgicalProcedures = () => {},
  availableProceduresFromRegion = [],
  setAvailableProceduresFromRegion = () => {}
}) => {
  const [selectedRegion, setSelectedRegion] = useState<AnatomicalRegion | null>(null);
  const [regions, setRegions] = useState<AnatomicalRegion[]>([]);
  const [loadingRegionProcedures, setLoadingRegionProcedures] = useState(false);

  // Carregar regiões anatômicas
  const { data: regionData, isLoading } = useQuery({
    queryKey: ["/api/anatomical-regions"],
  });

  useEffect(() => {
    if (regionData && Array.isArray(regionData)) {
      setRegions(regionData);
    }
  }, [regionData]);

  // Handler para seleção de região
  const handleRegionClick = async (region: AnatomicalRegion) => {
    setSelectedRegion(region);
    setLoadingRegionProcedures(true);

    try {
      // Buscar procedimentos da região apenas para disponibilizar na lista
      const response = await fetch(`/api/anatomical-regions/${region.id}/procedures`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const procedures = await response.json();
        if (procedures && Array.isArray(procedures)) {
          // Armazenar procedimentos disponíveis da região (SEM adicioná-los à seleção)
          setAvailableProceduresFromRegion(procedures);
          console.log(`Região ${region.name}: ${procedures.length} procedimentos disponíveis para seleção manual`);
        } else {
          setAvailableProceduresFromRegion([]);
        }
      } else {
        console.error('Erro na resposta:', response.status);
        setAvailableProceduresFromRegion([]);
      }
      
      // Apenas notificar componente pai
      if (onRegionSelect) {
        onRegionSelect(region);
      }

      toast({
        title: "Região selecionada",
        description: `${region.name} selecionada. Escolha manualmente os procedimentos desejados.`,
      });
    } catch (error) {
      console.error('Erro ao carregar procedimentos da região:', error);
      setAvailableProceduresFromRegion([]);
      toast({
        title: "Erro",
        description: "Erro ao carregar procedimentos da região",
        variant: "destructive",
      });
    } finally {
      setLoadingRegionProcedures(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <span className="ml-2 text-blue-300">Carregando regiões anatômicas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid de ícones circulares das regiões */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 place-items-center">
        {regions.map((region) => (
          <div 
            key={region.id}
            onClick={() => handleRegionClick(region)}
            className={`
              w-32 h-32 
              rounded-full 
              border-2
              cursor-pointer 
              transition-all 
              duration-300
              hover:scale-105
              flex
              items-center
              justify-center
              relative
              group
              ${
                selectedRegion?.id === region.id
                  ? "border-green-400 bg-green-500/20"
                  : "border-gray-400 bg-gray-800/40 hover:border-blue-400 hover:bg-blue-500/10"
              }
            `}
            style={{ 
              borderRadius: '50%',
              width: '128px',
              height: '128px',
              boxShadow: selectedRegion?.id === region.id 
                ? '0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)' 
                : 'none'
            }}
            title={region.name}
          >
            {region.iconUrl && (
              <img
                src={region.iconUrl}
                alt={region.name}
                className="w-20 h-20 object-contain"
              />
            )}
            
            {/* Tooltip personalizado com posicionamento inteligente */}
            <div className={`
              absolute 
              bottom-full 
              mb-2 
              px-3 
              py-2 
              bg-gray-900 
              text-white 
              text-sm 
              rounded-lg 
              shadow-lg 
              opacity-0 
              group-hover:opacity-100 
              transition-opacity 
              duration-200 
              pointer-events-none 
              z-10 
              max-w-xs
              ${
                region.id === 1 || region.id === 2
                  ? 'left-0' // Primeiros ícones: tooltip alinhado à esquerda
                  : region.id === 6 || region.id === 9
                  ? 'right-0' // Últimos ícones: tooltip alinhado à direita  
                  : 'left-1/2 transform -translate-x-1/2' // Ícones centrais: tooltip centralizado
              }
            `}>
              <div className="font-semibold">{region.name}</div>
              {region.description && (
                <div className="text-xs text-gray-300 mt-1 whitespace-normal">{region.description}</div>
              )}
              {/* Seta do tooltip com posicionamento dinâmico */}
              <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 ${
                region.id === 1 || region.id === 2
                  ? 'left-4' // Seta mais à esquerda para tooltips esquerdos
                  : region.id === 6 || region.id === 9  
                  ? 'right-4' // Seta mais à direita para tooltips direitos
                  : 'left-1/2 transform -translate-x-1/2' // Seta centralizada para tooltips centrais
              }`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Painel de informações da região selecionada */}
      {selectedRegion && (
        <div className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 text-center transition-all duration-300">
          <h3 className="text-lg font-medium text-white mb-2">
            {selectedRegion.title || selectedRegion.name}
          </h3>
          {selectedRegion.description && (
            <p className="text-sm text-gray-300 leading-relaxed">
              {selectedRegion.description}
            </p>
          )}
          
          {/* Mostrar status de carregamento de procedimentos */}
          {loadingRegionProcedures && (
            <div className="mt-3 flex items-center justify-center text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Carregando procedimentos...</span>
            </div>
          )}
          

        </div>
      )}
    </div>
  );
};
