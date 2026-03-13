import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash, 
  Save,
  X
} from "lucide-react";
import type { Hospital } from "@shared/schema";
import { HospitalLogoCropUpload } from "@/components/hospital-logo-crop-upload";
import { uploadHospitalLogo } from "@/lib/hospital-utils";

type BrazilianState = {
  id: number;
  stateCode: string;
  name: string;
  ibgeCode: number;
  region: string;
};

type Municipality = {
  id: number;
  name: string;
  ibgeCode: number;
  stateId: number;
  createdAt: string;
};

export default function AdminHospitals() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [brazilianStates, setBrazilianStates] = useState<BrazilianState[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentHospital, setCurrentHospital] = useState<Hospital | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formBusinessName, setFormBusinessName] = useState("");
  const [formCNPJ, setFormCNPJ] = useState("");
  const [formCNES, setFormCNES] = useState("");
  const [formIbgeStateCode, setFormIbgeStateCode] = useState<number>(33);
  const [formIbgeCityCode, setFormIbgeCityCode] = useState<number | null>(null);
  const [formCEP, setFormCEP] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formLogoFile, setFormLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");

  // Protecção de rota — apenas administradores (roleId = 1)
  if (user && user.roleId !== 1) {
    setLocation("/welcome");
    return null;
  }
  
  useEffect(() => {
    fetchHospitals();
    fetchBrazilianStates();
  }, []);

  useEffect(() => {
    if (formIbgeStateCode) {
      fetchMunicipalities(formIbgeStateCode);
    }
  }, [formIbgeStateCode]);

  const getCityNameFromIbgeCode = (ibgeCityCode: number | null): string => {
    if (!ibgeCityCode) return "Não informado";
    const city = municipalities.find(m => m.ibgeCode === ibgeCityCode);
    return city ? city.name : "Cidade não encontrada";
  };

  const getStateNameFromIbgeCode = (ibgeStateCode: number): string => {
    const state = brazilianStates.find(s => s.ibgeCode === ibgeStateCode);
    return state ? state.name : "Estado não encontrado";
  };

  const fetchBrazilianStates = async () => {
    try {
      const response = await fetch("/api/brazilian-states", {
        method: "GET",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include"
      });
      if (!response.ok) throw new Error(`Erro ao carregar estados: ${response.status}`);
      const states = await response.json();
      setBrazilianStates(states);
    } catch (error) {
      console.error("Erro ao carregar estados brasileiros:", error);
      toast({ title: "Erro", description: "Não foi possível carregar a lista de estados", variant: "destructive" });
    }
  };

  const fetchMunicipalities = async (stateIbgeCode: number, preserveCity = false) => {
    try {
      const response = await fetch(`/api/municipalities/by-state/${stateIbgeCode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include"
      });
      if (!response.ok) throw new Error("Falha ao carregar municípios");
      const data = await response.json();
      setMunicipalities(data);
      if (!preserveCity) setFormIbgeCityCode(null);
    } catch (error) {
      console.error("Erro ao carregar municípios:", error);
      setMunicipalities([]);
      if (!preserveCity) setFormIbgeCityCode(null);
    }
  };
  
  const fetchHospitals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hospitals", {
        method: "GET",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include"
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const data = await response.json();
      const sortedHospitals = [...data].sort((a, b) => {
        const nameA = a.name.trim().replace(/\t/g, '');
        const nameB = b.name.trim().replace(/\t/g, '');
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      });
      setHospitals(sortedHospitals);
    } catch (err) {
      setError("Erro ao carregar hospitais. Tente novamente mais tarde.");
      console.error("Error fetching hospitals:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenCreate = () => {
    setFormName("");
    setFormBusinessName("");
    setFormCNPJ("");
    setFormCNES("");
    setFormIbgeStateCode(33);
    setFormIbgeCityCode(null);
    setFormCEP("");
    setFormAddress("");
    setFormNumber("");
    setFormLogoUrl("");
    setFormLogoFile(null);
    setFormPhone("");
    setFormEmail("");
    setOpenCreateDialog(true);
  };
  
  const handleOpenEdit = async (hospital: Hospital) => {
    setCurrentHospital(hospital);
    setFormName(hospital.name);
    setFormBusinessName(hospital.businessName || "");
    setFormCNPJ(hospital.cnpj);
    setFormCNES(hospital.cnes || "");
    setFormCEP(hospital.cep || "");
    setFormAddress(hospital.address || "");
    setFormNumber(hospital.number?.toString() || "");
    setFormLogoUrl(hospital.logoUrl || "");
    setFormLogoFile(null);
    setFormPhone((hospital as any).phone || "");
    setFormEmail((hospital as any).email || "");
    const stateCode = hospital.ibgeStateCode || 33;
    setFormIbgeStateCode(stateCode);
    if (stateCode) await fetchMunicipalities(stateCode, true);
    setFormIbgeCityCode(hospital.ibgeCityCode || null);
    setOpenEditDialog(true);
  };
  
  const handleCreate = async () => {
    if (formCNPJ.length > 0 && !validateCNPJ(formCNPJ)) {
      toast({ title: "CNPJ inválido", description: "Por favor, verifique se o CNPJ está correto.", variant: "destructive" });
      return;
    }
    try {
      const hospital = await apiRequest("/api/hospitals", "POST", {
        name: formName,
        businessName: formBusinessName || null,
        cnpj: formCNPJ,
        cnes: formCNES || null,
        ibgeStateCode: formIbgeStateCode,
        ibgeCityCode: formIbgeCityCode,
        cep: formCEP || null,
        address: formAddress || null,
        number: formNumber ? parseInt(formNumber) : null,
        logoUrl: null,
        phone: formPhone || null,
        email: formEmail || null,
      });
      if (formLogoFile) {
        setUploadingLogo(true);
        const logoUrl = await uploadHospitalLogo(hospital.id, formLogoFile);
        setUploadingLogo(false);
        if (logoUrl) {
          try { await apiRequest(`/api/hospitals/${hospital.id}`, "PUT", { logoUrl }); } 
          catch (e) { console.error("Falha ao atualizar hospital com logoUrl:", e); }
        }
      }
      setOpenCreateDialog(false);
      toast({ title: "Hospital criado", description: "O hospital foi adicionado com sucesso." });
      fetchHospitals();
    } catch (error) {
      console.error("Error creating hospital:", error);
      toast({ title: "Erro ao criar hospital", description: "Não foi possível adicionar o hospital. Verifique os dados e tente novamente.", variant: "destructive" });
    }
  };
  
  const handleUpdate = async () => {
    if (!currentHospital) return;
    if (formCNPJ.length > 0 && !validateCNPJ(formCNPJ)) {
      toast({ title: "CNPJ inválido", description: "Por favor, verifique se o CNPJ está correto.", variant: "destructive" });
      return;
    }
    try {
      let logoUrlToUse = formLogoUrl;
      if (formLogoFile) {
        setUploadingLogo(true);
        const uploadedLogoUrl = await uploadHospitalLogo(currentHospital.id, formLogoFile, formLogoUrl);
        setUploadingLogo(false);
        if (uploadedLogoUrl) logoUrlToUse = uploadedLogoUrl;
      }
      const response = await fetch(`/api/hospitals/${currentHospital.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formName,
          businessName: formBusinessName || null,
          cnpj: formCNPJ,
          cnes: formCNES || null,
          ibgeStateCode: formIbgeStateCode,
          ibgeCityCode: formIbgeCityCode,
          cep: formCEP || null,
          address: formAddress || null,
          number: formNumber ? parseInt(formNumber) : null,
          logoUrl: logoUrlToUse || null,
          phone: formPhone || null,
          email: formEmail || null,
        })
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const updatedHospital = await response.json();
      setHospitals(prev => prev.map(h => h.id === updatedHospital.id ? updatedHospital : h));
      setOpenEditDialog(false);
      toast({ title: "Hospital atualizado", description: "As informações do hospital foram atualizadas com sucesso." });
      fetchHospitals();
    } catch (error) {
      console.error("Error updating hospital:", error);
      toast({ title: "Erro ao atualizar hospital", description: "Não foi possível atualizar as informações do hospital. Tente novamente.", variant: "destructive" });
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este hospital?")) return;
    try {
      await apiRequest(`/api/hospitals/${id}`, "DELETE");
      toast({ title: "Hospital excluído", description: "O hospital foi removido com sucesso." });
      fetchHospitals();
    } catch (error) {
      console.error("Error deleting hospital:", error);
      toast({ title: "Erro ao excluir hospital", description: "Não foi possível excluir o hospital. Tente novamente.", variant: "destructive" });
    }
  };
  
  const validateCNPJ = (cnpj: string): boolean => {
    try {
      cnpj = cnpj.replace(/\D/g, '');
      if (cnpj.length !== 14) return false;
      if (/^(\d)\1+$/.test(cnpj)) return false;
      const tableFirstDigit = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const tableSecondDigit = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += parseInt(cnpj.charAt(i)) * tableFirstDigit[i];
      let firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (firstDigit !== parseInt(cnpj.charAt(12))) return false;
      sum = 0;
      for (let i = 0; i < 13; i++) sum += parseInt(cnpj.charAt(i)) * tableSecondDigit[i];
      let secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (secondDigit !== parseInt(cnpj.charAt(13))) return false;
      return true;
    } catch { return false; }
  };

  const formatCNPJ = (cnpj: string) => {
    const n = cnpj.replace(/\D/g, '');
    if (n.length !== 14) return cnpj;
    return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };
  
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.replace(/\D/g, '');
    if (n.length > 14) return;
    setFormCNPJ(n);
  };
  
  const handleCNESChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.replace(/\D/g, '');
    if (n.length > 7) return;
    setFormCNES(n);
  };
  
  const formatCEP = (cep: string) => {
    const n = cep.replace(/\D/g, '');
    if (n.length !== 8) return cep;
    return n.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  };
  
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.replace(/\D/g, '');
    if (n.length > 8) return;
    setFormCEP(n);
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormNumber(e.target.value.replace(/\D/g, ''));
  };
  
  const handleLogoFileChange = (file: File | null) => {
    setFormLogoFile(file);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Gestão de Hospitais</h2>
              <p className="text-blue-300">
                Cadastre e gerencie os hospitais onde os procedimentos são realizados
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Novo Hospital
            </Button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Hospitais Cadastrados</h3>
            <p className="text-sm text-blue-300 mb-4">Visualize e gerencie os hospitais no sistema</p>
              
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="h-12 w-full bg-blue-900/20 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-red-300 mb-2">{error}</p>
                <p className="text-sm text-blue-300">Tente novamente mais tarde</p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-blue-300 mb-2">Nenhum hospital encontrado</p>
                <p className="text-sm text-blue-300/70">Clique em "Novo Hospital" para adicionar um registro ao sistema</p>
              </div>
            ) : (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-slate-800/50 border-slate-700">
                        <TableHead className="text-blue-300">Hospital</TableHead>
                        <TableHead className="text-blue-300">CNPJ</TableHead>
                        <TableHead className="text-blue-300">Localização</TableHead>
                        <TableHead className="text-blue-300 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hospitals.map((hospital) => (
                        <TableRow key={hospital.id} className="hover:bg-slate-800/50 border-slate-700">
                          <TableCell className="text-white font-medium">
                            <div className="flex items-center gap-3">
                              {hospital.logoUrl ? (
                                <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={hospital.logoUrl} 
                                    alt={hospital.name} 
                                    className="max-w-full max-h-full object-contain" 
                                    onError={(e) => {
                                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230a558c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='12' y1='8' x2='12' y2='16'%3E%3C/line%3E%3Cline x1='8' y1='12' x2='16' y2='12'%3E%3C/line%3E%3C/svg%3E";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded bg-blue-900/30 flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-blue-300" />
                                </div>
                              )}
                              <div>
                                <div>{hospital.name}</div>
                                <div className="text-xs text-blue-300/70">{hospital.businessName || ""}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatCNPJ(hospital.cnpj)}
                            <div className="text-xs text-blue-300/70">CNES: {hospital.cnes || "Não informado"}</div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {getCityNameFromIbgeCode(hospital.ibgeCityCode)}
                            <div className="text-xs text-blue-300/70">{getStateNameFromIbgeCode(hospital.ibgeStateCode)}</div>
                            <div className="text-xs text-blue-300/70">CEP: {formatCEP(hospital.cep || "")}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(hospital)}
                                className="border-blue-700 text-blue-300 hover:bg-blue-900/30"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(hospital.id)}
                                className="border-red-700 text-red-300 hover:bg-red-900/30"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Dialog: Criar Hospital */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Hospital</DialogTitle>
            <DialogDescription>Preencha as informações do hospital</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome do Hospital *</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo do hospital" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="businessName">Razão Social</Label>
                <Input id="businessName" value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} placeholder="Razão social (opcional)" />
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={formCNPJ} onChange={handleCNPJChange} placeholder="00000000000000" maxLength={14} />
              </div>
              <div>
                <Label htmlFor="cnes">CNES</Label>
                <Input id="cnes" value={formCNES} onChange={handleCNESChange} placeholder="0000000" maxLength={7} />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Select value={formIbgeStateCode?.toString()} onValueChange={(v) => setFormIbgeStateCode(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state.id} value={state.ibgeCode.toString()}>{state.name} ({state.stateCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">Município</Label>
                <Select value={formIbgeCityCode?.toString() || ""} onValueChange={(v) => setFormIbgeCityCode(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o município" /></SelectTrigger>
                  <SelectContent>
                    {municipalities.map((city) => (
                      <SelectItem key={city.id} value={city.ibgeCode.toString()}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={formCEP} onChange={handleCEPChange} placeholder="00000000" maxLength={8} />
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={formNumber} onChange={handleNumberChange} placeholder="Número" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Rua, Avenida..." />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(21) 99999-9999" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="contato@hospital.com.br" />
              </div>
              <div className="col-span-2">
                <Label>Logo do Hospital</Label>
                <HospitalLogoCropUpload onFileChange={handleLogoFileChange} currentLogoUrl={formLogoUrl} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={uploadingLogo} className="bg-blue-500 hover:bg-blue-600">
              {uploadingLogo ? "Enviando..." : "Criar Hospital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Hospital */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Hospital</DialogTitle>
            <DialogDescription>Atualize as informações do hospital</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-name">Nome do Hospital *</Label>
                <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-businessName">Razão Social</Label>
                <Input id="edit-businessName" value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-cnpj">CNPJ</Label>
                <Input id="edit-cnpj" value={formCNPJ} onChange={handleCNPJChange} maxLength={14} />
              </div>
              <div>
                <Label htmlFor="edit-cnes">CNES</Label>
                <Input id="edit-cnes" value={formCNES} onChange={handleCNESChange} maxLength={7} />
              </div>
              <div>
                <Label htmlFor="edit-state">Estado</Label>
                <Select value={formIbgeStateCode?.toString()} onValueChange={(v) => setFormIbgeStateCode(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state.id} value={state.ibgeCode.toString()}>{state.name} ({state.stateCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-city">Município</Label>
                <Select value={formIbgeCityCode?.toString() || ""} onValueChange={(v) => setFormIbgeCityCode(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o município" /></SelectTrigger>
                  <SelectContent>
                    {municipalities.map((city) => (
                      <SelectItem key={city.id} value={city.ibgeCode.toString()}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-cep">CEP</Label>
                <Input id="edit-cep" value={formCEP} onChange={handleCEPChange} maxLength={8} />
              </div>
              <div>
                <Label htmlFor="edit-number">Número</Label>
                <Input id="edit-number" value={formNumber} onChange={handleNumberChange} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-address">Endereço</Label>
                <Input id="edit-address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input id="edit-phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(21) 99999-9999" />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="contato@hospital.com.br" />
              </div>
              <div className="col-span-2">
                <Label>Logo do Hospital</Label>
                <HospitalLogoCropUpload onFileChange={handleLogoFileChange} currentLogoUrl={formLogoUrl} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)} className="mr-2">Cancelar</Button>
            <Button onClick={handleUpdate} disabled={uploadingLogo} className="bg-blue-500 hover:bg-blue-600">
              {uploadingLogo ? "Enviando..." : "Atualizar Hospital"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
