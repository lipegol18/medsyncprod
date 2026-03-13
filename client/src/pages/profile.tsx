import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { Loader2, User, Shield, Calendar, Mail, Key, IdCard, Sun, Moon, Laptop, Building2 as BuildingHospital, Pencil as PencilIcon, Check, X, Upload, Image as ImageIcon, Trash2, ArrowLeft, CreditCard, Clock, BadgeCheck, DollarSign, Package, Search, FileText, Download, ExternalLink, XCircle, RefreshCw, AlertTriangle, Infinity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useLocation } from "wouter";
import { useNavigationTracker } from "@/hooks/use-navigation-tracker";
import { normalizeText } from "@/lib/normalize";
const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { getPreviousPage } = useNavigationTracker();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<number[]>([]);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    signatureNote: "",
  });
  
  // Estado para upload da assinatura
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  
  // Estados para upload de logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Estados para upload do cartão CRM
  const [crmFile, setCrmFile] = useState<File | null>(null);
  const [isUploadingCrm, setIsUploadingCrm] = useState(false);
  
  // Estados para crop de imagens
  const [showSignatureCrop, setShowSignatureCrop] = useState(false);
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [showCrmCrop, setShowCrmCrop] = useState(false);
  const [signatureImageSrc, setSignatureImageSrc] = useState<string>('');
  const [logoImageSrc, setLogoImageSrc] = useState<string>('');
  const [crmImageSrc, setCrmImageSrc] = useState<string>('');
  
  // Estados para controle de zoom e posição
  const [signatureScale, setSignatureScale] = useState(1);
  const [logoScale, setLogoScale] = useState(1);
  const [crmScale, setCrmScale] = useState(1);
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [crmPosition, setCrmPosition] = useState({ x: 0, y: 0 });
  
  // Estados para controle de drag
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingCrm, setIsDraggingCrm] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Estados para drag and drop de arquivos
  const [isDragOverLogo, setIsDragOverLogo] = useState(false);
  const [isDragOverSignature, setIsDragOverSignature] = useState(false);
  const [isDragOverCrm, setIsDragOverCrm] = useState(false);
  
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement>(null);
  const crmCanvasRef = useRef<HTMLCanvasElement>(null);
  const signatureImgRef = useRef<HTMLImageElement>(null);
  const logoImgRef = useRef<HTMLImageElement>(null);
  const crmImgRef = useRef<HTMLImageElement>(null);
  
  // Buscar os dados do papel do usuário
  const { data: userRole, isLoading: isRoleLoading, error: roleError } = useQuery({
    queryKey: ['/api/roles', user?.roleId],
    queryFn: async () => {
      if (!user?.roleId) {
        console.log('❌ Usuário sem roleId:', user);
        return null;
      }
      console.log('🔍 Buscando role para usuário:', user.roleId);
      const data = await apiRequest(`/api/roles/${user.roleId}`, "GET");
      console.log('✅ Dados do role retornados:', data);
      return data;
    },
    enabled: !!user?.roleId,
  });

  // Debug adicional
  console.log('🔧 Debug Role - userRole:', userRole, 'isLoading:', isRoleLoading, 'error:', roleError);
  
  // Buscar hospitais associados para médicos
  const { data: doctorHospitals, isLoading: isHospitalsLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'hospitals'],
    queryFn: async () => {
      if (!user?.id || user?.roleId !== 2) return null; // Apenas para usuários com função de médico (roleId = 2)
      return await apiRequest(`/api/users/${user.id}/hospitals`, "GET");
    },
    enabled: !!user?.id && user?.roleId === 2,
  });
  
  // Buscar pacientes associados ao médico
  const { data: associatedPatients, isLoading: isPatientsLoading } = useQuery({
    queryKey: ['/api/doctors', user?.id, 'patients'],
    queryFn: async () => {
      if (!user?.id || user?.roleId !== 2) return null; // Apenas para usuários com função de médico (roleId = 2)
      return await apiRequest(`/api/doctors/${user.id}/patients`, "GET");
    },
    enabled: !!user?.id && user?.roleId === 2,
  });
  
  // Buscar dados da subscription do usuário
  const { data: userSubscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['/api/user/subscription'],
    queryFn: async () => {
      if (!user?.id) return null;
      return await apiRequest('/api/user/subscription', "GET");
    },
    enabled: !!user?.id,
  });

  // Buscar histórico de faturas do usuário
  const { data: userInvoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['/api/user/invoices'],
    queryFn: async () => {
      if (!user?.id) return [];
      return await apiRequest('/api/user/invoices', "GET");
    },
    enabled: !!user?.id,
  });

  // Estado para modais de confirmação
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Mutation para cancelar assinatura
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/subscription/cancel', "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      setShowCancelModal(false);
      toast({
        title: "Cancelamento agendado",
        description: "Sua assinatura será cancelada ao final do período atual. Você ainda terá acesso até lá.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar a assinatura",
        variant: "destructive",
      });
    },
  });

  // Mutation para reativar assinatura
  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/subscription/reactivate', "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      toast({
        title: "Assinatura reativada",
        description: "O cancelamento foi desfeito. Sua assinatura continuará normalmente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reativar",
        description: error.message || "Não foi possível reativar a assinatura",
        variant: "destructive",
      });
    },
  });

  // Mutation para abrir billing portal
  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/billing-portal', "POST");
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível abrir o portal de pagamentos",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      setFormData(prevState => ({
        ...prevState,
        name: user.name || "",
        email: user.email || "",
        signatureNote: user.signatureNote || "",
      }));
    }
  }, [user]);
  
  // Carregar hospitais quando o diálogo é aberto
  useEffect(() => {
    if (showHospitalDialog && user?.roleId === 2) {
      fetchHospitals();
    }
  }, [showHospitalDialog, user]);
  
  // Função para buscar todos os hospitais disponíveis
  const fetchHospitals = async () => {
    setIsLoadingHospitals(true);
    try {
      // Buscar todos os hospitais disponíveis
      const allHospitals = await apiRequest('/api/hospitals', "GET");
      setHospitals(allHospitals);
      
      // Selecionar os hospitais atuais do médico
      if (doctorHospitals && doctorHospitals.length > 0) {
        // Verifica o formato dos dados e extrai os IDs de forma adequada
        const currentHospitalIds = doctorHospitals.map((h: any) => {
          // Alguns objetos têm hospitalId, outros têm id diretamente
          return h.hospitalId || h.id;
        }).filter((id: number | undefined | null) => id !== undefined && id !== null);
        
        setSelectedHospitalIds(currentHospitalIds);
      } else {
        // Limpar seleções anteriores
        setSelectedHospitalIds([]);
      }
    } catch (error) {
      console.error('Erro ao buscar hospitais:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de hospitais",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsLoading(true);
    try {
      const updatedData = await apiRequest(`/api/users/${user.id}`, "PUT", {
        name: formData.name,
        email: formData.email,
        signatureNote: formData.signatureNote,
      });
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { 
            ...oldData, 
            name: formData.name,
            email: formData.email,
            signatureNote: formData.signatureNote 
          };
        }
        return oldData;
      });
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar seu perfil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    const previousPage = getPreviousPage();
    setLocation(previousPage);
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await apiRequest("/api/change-password", "POST", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      setFormData(prevState => ({
        ...prevState,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar sua senha",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  // Função para alternar a seleção de um hospital
  const toggleHospitalSelection = (hospitalId: number) => {
    setSelectedHospitalIds(prev => {
      if (prev.includes(hospitalId)) {
        return prev.filter(id => id !== hospitalId);
      } else {
        return [...prev, hospitalId];
      }
    });
  };
  
  // Mutation para atualizar os hospitais do médico
  const updateHospitalsMutation = useMutation({
    mutationFn: async (hospitalIds: number[]) => {
      if (!user) throw new Error("Usuário não encontrado");
      
      console.log("Enviando hospitalIds:", hospitalIds);
      
      return await apiRequest(`/api/users/${user.id}/hospitals`, "PUT", {
        hospitalIds: hospitalIds
      });
    },
    onSuccess: () => {
      // Invalidar consulta para atualizar a lista
      queryClient.invalidateQueries({queryKey: ['/api/users', user?.id, 'hospitals']});
      
      toast({
        title: "Hospitais atualizados",
        description: "Suas associações com hospitais foram atualizadas com sucesso",
        variant: "default",
      });
      
      setShowHospitalDialog(false);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar hospitais:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar os hospitais",
        variant: "destructive",
      });
    }
  });
  
  // Função para salvar as alterações nos hospitais
  const handleSaveHospitals = () => {
    updateHospitalsMutation.mutate(selectedHospitalIds);
  };
  
  // Função para obter imagem do canvas
  const getCroppedImageFromCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas não disponível'));
        return;
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Erro ao gerar imagem'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  // Função para desenhar a imagem no canvas com controles de zoom e posição
  const drawImageOnCanvas = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    imageSrc: string,
    scale: number,
    position: { x: number; y: number },
    canvasSize: { width: number; height: number }
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const image = new Image();
    image.onload = () => {
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      ctx.drawImage(
        image,
        position.x,
        position.y,
        scaledWidth,
        scaledHeight
      );
    };
    image.src = imageSrc;
  };

  // Função para resetar posição e zoom
  const resetImagePosition = (
    imageSrc: string,
    canvasSize: { width: number; height: number },
    setScale: (scale: number) => void,
    setPosition: (pos: { x: number; y: number }) => void
  ) => {
    const image = new Image();
    image.onload = () => {
      // Calcular escala para fit na área
      const scaleX = canvasSize.width / image.width;
      const scaleY = canvasSize.height / image.height;
      const scale = Math.max(scaleX, scaleY); // Para cobrir toda a área
      
      // Centralizar imagem
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      const x = (canvasSize.width - scaledWidth) / 2;
      const y = (canvasSize.height - scaledHeight) / 2;
      
      setScale(scale);
      setPosition({ x, y });
    };
    image.src = imageSrc;
  };

  // Funções para controle de drag na assinatura
  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDraggingSignature(true);
    setDragStart({ x: x - signaturePosition.x, y: y - signaturePosition.y });
  };

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingSignature) return;
    
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPosition = {
      x: x - dragStart.x,
      y: y - dragStart.y
    };
    
    setSignaturePosition(newPosition);
    drawImageOnCanvas(
      signatureCanvasRef,
      signatureImageSrc,
      signatureScale,
      newPosition,
      { width: 250, height: 200 }
    );
  };

  const handleSignatureMouseUp = () => {
    setIsDraggingSignature(false);
  };

  // Funções para controle de drag no logo
  const handleLogoMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDraggingLogo(true);
    setDragStart({ x: x - logoPosition.x, y: y - logoPosition.y });
  };

  const handleLogoMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingLogo) return;
    
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPosition = {
      x: x - dragStart.x,
      y: y - dragStart.y
    };
    
    setLogoPosition(newPosition);
    drawImageOnCanvas(
      logoCanvasRef,
      logoImageSrc,
      logoScale,
      newPosition,
      { width: 500, height: 150 }
    );
  };

  const handleLogoMouseUp = () => {
    setIsDraggingLogo(false);
  };

  // Funções para drag and drop de arquivos de logo
  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(false);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLogo(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('🎯 Logo dropado:', file.name);
      
      // Processar arquivo diretamente
      handleLogoFileFromDrop(file);
    }
  };

  // Funções para drag and drop de arquivos de assinatura
  const handleSignatureDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(true);
  };

  const handleSignatureDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(false);
  };

  const handleSignatureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSignature(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('🎯 Assinatura dropada:', file.name);
      
      // Processar arquivo diretamente
      handleSignatureFileFromDrop(file);
    }
  };

  // Função para processar arquivo de logo do drag and drop
  const handleLogoFileFromDrop = (file: File) => {
    console.log('📁 Arquivo de logo do drop:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      console.log('❌ Tipo de arquivo inválido');
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Arquivo muito grande');
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Arquivo válido, iniciando FileReader...');
    
    // Criar URL da imagem e abrir o crop
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('📖 FileReader concluído');
      const imageSrc = e.target?.result as string;
      setLogoImageSrc(imageSrc);
      setShowLogoCrop(true);
      
      console.log('🖼️ Abrindo modal de crop');
      
      // Resetar posição e zoom quando nova imagem é carregada
      setTimeout(() => {
        console.log('🔄 Resetando posição da imagem');
        resetImagePosition(
          imageSrc,
          { width: 500, height: 150 },
          setLogoScale,
          setLogoPosition
        );
      }, 100);
    };
    
    reader.onerror = (error) => {
      console.error('❌ Erro no FileReader:', error);
    };
    
    reader.readAsDataURL(file);
  };

  // Função para processar arquivo de assinatura do drag and drop
  const handleSignatureFileFromDrop = (file: File) => {
    console.log('📁 Arquivo de assinatura do drop:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      console.log('❌ Tipo de arquivo inválido');
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Arquivo muito grande');
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Arquivo válido, iniciando FileReader...');
    
    // Criar URL da imagem e abrir o crop
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('📖 FileReader concluído');
      const imageSrc = e.target?.result as string;
      setSignatureImageSrc(imageSrc);
      setShowSignatureCrop(true);
      
      console.log('🖼️ Abrindo modal de crop');
      
      // Resetar posição e zoom quando nova imagem é carregada
      setTimeout(() => {
        console.log('🔄 Resetando posição da imagem');
        resetImagePosition(
          imageSrc,
          { width: 250, height: 200 },
          setSignatureScale,
          setSignaturePosition
        );
      }, 100);
    };
    
    reader.onerror = (error) => {
      console.error('❌ Erro no FileReader:', error);
    };
    
    reader.readAsDataURL(file);
  };

  // Função para lidar com o upload da assinatura com crop
  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📁 Arquivo de assinatura selecionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        console.log('❌ Tipo de arquivo inválido');
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('❌ Arquivo muito grande');
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Arquivo válido, processando...');
      
      // Prevenir qualquer interferência no estado de autenticação
      e.preventDefault();
      e.stopPropagation();
      
      // Usar requestAnimationFrame para garantir que a operação seja não-bloqueante
      requestAnimationFrame(() => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          if (readerEvent.target?.result) {
            const imageSrc = readerEvent.target.result as string;
            console.log('🖼️ Imagem carregada, abrindo modal de crop');
            
            // Configurar estados de forma sequencial
            setSignatureImageSrc(imageSrc);
            
            // Aguardar um frame antes de abrir o modal
            requestAnimationFrame(() => {
              setShowSignatureCrop(true);
              console.log('✅ Modal de crop aberto');
              
              // Resetar posição após o modal estar aberto
              setTimeout(() => {
                resetImagePosition(
                  imageSrc,
                  { width: 250, height: 200 },
                  setSignatureScale,
                  setSignaturePosition
                );
              }, 200);
            });
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ Erro ao ler arquivo:', error);
          toast({
            title: "Erro",
            description: "Erro ao processar a imagem",
            variant: "destructive",
          });
        };
        
        reader.readAsDataURL(file);
      });
    }
  };
  
  // Função para confirmar o crop da assinatura
  const handleSignatureCropConfirm = async () => {
    if (!signatureImageSrc || !user) return;
    
    console.log('🎯 Iniciando confirmação do crop da assinatura...');
    
    try {
      const croppedImageBlob = await getCroppedImageFromCanvas(signatureCanvasRef);
      console.log('✅ Blob criado:', croppedImageBlob.size, 'bytes');
      
      const croppedFile = new File([croppedImageBlob], 'signature.jpg', { type: 'image/jpeg' });
      console.log('✅ Arquivo criado:', croppedFile.name, croppedFile.size, 'bytes');
      
      // Fechar modal primeiro
      setShowSignatureCrop(false);
      console.log('✅ Modal fechado');
      
      // Aguardar fechamento completo do modal antes do upload
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('🚀 Iniciando upload da assinatura...');
      setIsUploadingSignature(true);
      
      const formData = new FormData();
      formData.append('signature', croppedFile);
      
      const response = await fetch(`/api/users/${user.id}/signature`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao fazer upload da assinatura");
      }
      
      const result = await response.json();
      console.log('✅ Upload da assinatura bem-sucedido:', result);
      
      // Atualizar cache diretamente
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, signatureUrl: result.url };
        }
        return oldData;
      });
      
      toast({
        title: "Assinatura enviada",
        description: "Sua assinatura foi enviada com sucesso",
        variant: "default",
      });
      
    } catch (error) {
      console.error('❌ Erro ao processar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a assinatura: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingSignature(false);
      setSignatureFile(null);
      setSignatureImageSrc('');
    }
  };

  // Função para fazer upload da assinatura
  const handleSignatureUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || signatureFile;
    if (!file || !user) return;
    
    console.log('📤 Preparando upload - Arquivo:', file.name, file.size, 'bytes, Usuário:', user.id);
    setIsUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append('signature', file);
      console.log('📋 FormData preparado');
      
      const response = await fetch(`/api/users/${user.id}/signature`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Resposta do servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro na resposta:', error);
        throw new Error(error.message || "Erro ao fazer upload da assinatura");
      }
      
      const result = await response.json();
      console.log('✅ Upload bem-sucedido:', result);
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, signatureUrl: result.url };
        }
        return oldData;
      });
      
      setSignatureFile(null);
      // Limpar o input de arquivo
      const fileInput = document.getElementById('signature-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Assinatura enviada",
        description: "Sua assinatura foi enviada com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a assinatura",
        variant: "destructive",
      });
    } finally {
      setIsUploadingSignature(false);
    }
  };
  
  // Função para lidar com o upload do logo
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 handleLogoFileChange chamado');
    const file = e.target.files?.[0];
    
    if (file) {
      console.log('📁 Arquivo selecionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        console.log('❌ Tipo de arquivo inválido');
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('❌ Arquivo muito grande');
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Arquivo válido, iniciando FileReader...');
      
      // Criar URL da imagem e abrir o crop
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('📖 FileReader concluído');
        const imageSrc = e.target?.result as string;
        setLogoImageSrc(imageSrc);
        setShowLogoCrop(true);
        
        console.log('🖼️ Abrindo modal de crop');
        
        // Resetar posição e zoom quando nova imagem é carregada
        setTimeout(() => {
          console.log('🔄 Resetando posição da imagem');
          resetImagePosition(
            imageSrc,
            { width: 200, height: 100 },
            setLogoScale,
            setLogoPosition
          );
        }, 100);
      };
      
      reader.onerror = (error) => {
        console.error('❌ Erro no FileReader:', error);
      };
      
      reader.readAsDataURL(file);
    } else {
      console.log('❌ Nenhum arquivo selecionado');
    }
  };

  // Função para confirmar o crop do logo
  const handleLogoCropConfirm = async () => {
    if (!logoImageSrc || !user) return;
    
    try {
      console.log('🎯 Iniciando crop do logo...');
      const croppedImageBlob = await getCroppedImageFromCanvas(logoCanvasRef);
      console.log('✅ Blob do logo criado:', croppedImageBlob.size, 'bytes');
      
      const croppedFile = new File([croppedImageBlob], 'logo.jpg', { type: 'image/jpeg' });
      console.log('✅ Arquivo do logo criado:', croppedFile.name, croppedFile.size, 'bytes');
      
      setLogoFile(croppedFile);
      setShowLogoCrop(false);
      
      // Upload automático após o crop
      console.log('🚀 Iniciando upload do logo...');
      await handleLogoUpload(croppedFile);
    } catch (error) {
      console.error('❌ Erro ao processar crop do logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem do logo: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para remover logo atual
  const handleRemoveLogo = async () => {
    if (!user) return;
    
    try {
      console.log('🗑️ Removendo logo atual do usuário:', user.id);
      const response = await fetch(`/api/users/${user.id}/logo`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao remover logo");
      }
      
      // Atualizar os dados do usuário no cache
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        logoUrl: null,
      }));
      
      toast({
        title: "Sucesso",
        description: "Logo removido com sucesso",
      });
      
      console.log('✅ Logo removido com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover logo: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para remover assinatura atual
  const handleRemoveSignature = async () => {
    if (!user) return;
    
    try {
      console.log('🗑️ Removendo assinatura atual do usuário:', user.id);
      const response = await fetch(`/api/users/${user.id}/signature`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao remover assinatura");
      }
      
      // Atualizar os dados do usuário no cache
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        signatureUrl: null,
      }));
      
      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso",
      });
      
      console.log('✅ Assinatura removida com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover assinatura: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para remover cartão CRM atual
  const handleRemoveCrm = async () => {
    if (!user) return;
    
    try {
      console.log('🗑️ Removendo cartão CRM atual do usuário:', user.id);
      const response = await fetch(`/api/users/${user.id}/crm`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao remover cartão CRM");
      }
      
      // Atualizar os dados do usuário no cache
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        crmUrl: null,
      }));
      
      toast({
        title: "Sucesso",
        description: "Cartão CRM removido com sucesso",
      });
      
      console.log('✅ Cartão CRM removido com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover cartão CRM:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover cartão CRM: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  // Função para fazer upload do cartão CRM
  const handleCrmUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || crmFile;
    if (!file || !user) return;
    
    console.log('📤 Preparando upload do cartão CRM - Arquivo:', file.name, file.size, 'bytes, Usuário:', user.id);
    setIsUploadingCrm(true);
    try {
      const formData = new FormData();
      formData.append('crm', file);
      console.log('📋 FormData do cartão CRM preparado');
      
      const response = await fetch(`/api/users/${user.id}/crm`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Resposta do servidor (cartão CRM):', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro na resposta (cartão CRM):', error);
        throw new Error(error.message || "Erro ao fazer upload do cartão CRM");
      }
      
      const result = await response.json();
      console.log('✅ Upload do cartão CRM bem-sucedido:', result);
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, crmUrl: result.url };
        }
        return oldData;
      });
      
      setCrmFile(null);
      // Limpar o input de arquivo
      const fileInput = document.getElementById('crm-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Cartão CRM enviado",
        description: "Seu cartão CRM foi enviado com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o cartão CRM",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCrm(false);
    }
  };
  
  // Função para lidar com o upload do cartão CRM
  const handleCrmFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 handleCrmFileChange chamado');
    const file = e.target.files?.[0];
    
    if (file) {
      console.log('📁 Arquivo selecionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        console.log('❌ Tipo de arquivo inválido');
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log('❌ Arquivo muito grande');
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Arquivo válido, fazendo upload direto...');
      setCrmFile(file);
      handleCrmUpload(file);
    }
  };
  
  // Funções de drag and drop para cartão CRM
  const handleCrmDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCrm(true);
  };
  
  const handleCrmDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCrm(false);
  };
  
  const handleCrmDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCrm(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setCrmFile(file);
      handleCrmUpload(file);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, envie apenas arquivos de imagem",
        variant: "destructive",
      });
    }
  };
  
  // Função para fazer upload do logo
  const handleLogoUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || logoFile;
    if (!file || !user) return;
    
    console.log('📤 Preparando upload do logo - Arquivo:', file.name, file.size, 'bytes, Usuário:', user.id);
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      console.log('📋 FormData do logo preparado');
      
      const response = await fetch(`/api/users/${user.id}/logo`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('📡 Resposta do servidor (logo):', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erro na resposta (logo):', error);
        throw new Error(error.message || "Erro ao fazer upload do logo");
      }
      
      const result = await response.json();
      console.log('✅ Upload do logo bem-sucedido:', result);
      
      // Atualizar diretamente os dados do usuário no cache em vez de invalidar
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, logoUrl: result.url };
        }
        return oldData;
      });
      
      setLogoFile(null);
      // Limpar o input de arquivo
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Logo enviado",
        description: "Seu logo foi enviado com sucesso",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };
  
  if (!user) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const formatDate = (date: Date | null) => {
    if (!date) return "Não informado";
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="container mx-auto py-6">
      
      {/* Diálogo para gerenciar hospitais associados */}
      <Dialog open={showHospitalDialog} onOpenChange={(open) => {
        setShowHospitalDialog(open);
        if (!open) setHospitalSearchQuery("");
      }}>
        <DialogContent className="sm:max-w-[600px] bg-white border-[hsl(214,14%,84%)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center text-[hsl(var(--medsync-dark-blue))]">
              <BuildingHospital className="mr-2 h-5 w-5" />
              Gerenciar Hospitais Associados
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione os hospitais aos quais você está associado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar hospital pelo nome..."
                value={hospitalSearchQuery}
                onChange={(e) => setHospitalSearchQuery(e.target.value)}
                className="pl-9 border-medsync-blue/30 focus:border-medsync-blue"
                data-testid="input-hospital-search"
              />
              {hospitalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setHospitalSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isLoadingHospitals ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-medsync-blue" />
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {/* Filtrar hospitais pela busca e ordenar: selecionados primeiro */}
                  {hospitals
                    .filter(hospital => 
                      normalizeText(hospital.name).includes(normalizeText(hospitalSearchQuery))
                    )
                    .sort((a, b) => {
                      const aSelected = selectedHospitalIds.includes(a.id);
                      const bSelected = selectedHospitalIds.includes(b.id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(hospital => {
                      const isSelected = selectedHospitalIds.includes(hospital.id);
                      return (
                        <div 
                          key={hospital.id} 
                          className={`flex items-center space-x-3 p-2 rounded-md transition-colors cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-medsync-blue/5 border border-medsync-blue/20' : ''}`}
                          onClick={() => toggleHospitalSelection(hospital.id)}
                        >
                          <Checkbox 
                            id={`hospital-${hospital.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleHospitalSelection(hospital.id)}
                            className="border-medsync-blue data-[state=checked]:bg-medsync-blue data-[state=checked]:border-medsync-blue"
                          />
                          <label 
                            htmlFor={`hospital-${hospital.id}`}
                            className="flex-1 cursor-pointer text-sm font-medium text-[hsl(var(--medsync-dark-blue))] uppercase"
                          >
                            {hospital.name}
                          </label>
                          {isSelected && (
                            <Check className="h-4 w-4 text-medsync-blue flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  
                  {hospitals.filter(h => normalizeText(h.name).includes(normalizeText(hospitalSearchQuery))).length === 0 && (
                    <div className="text-center p-4 text-muted-foreground">
                      {hospitalSearchQuery 
                        ? `Nenhum hospital encontrado para "${hospitalSearchQuery}"`
                        : "Nenhum hospital encontrado."
                      }
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="gap-2 flex-row justify-between border-t border-[hsl(214,14%,84%)] pt-4">
            <div className="text-sm text-muted-foreground">
              {selectedHospitalIds.length} hospitais selecionados
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHospitalDialog(false)}
                disabled={updateHospitalsMutation.isPending}
                className="btn-medsync-dark border-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"
                data-testid="button-cancel-hospitals"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveHospitals}
                disabled={updateHospitalsMutation.isPending}
                className="btn-medsync-dark bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
                data-testid="button-save-hospitals"
              >
                {updateHospitalsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

      
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-6" data-testid="profile-header">
        <div>
          <h1 className="text-3xl font-bold text-[hsl(var(--medsync-dark-blue))]">Meu Perfil</h1>
          <p className="text-[hsl(var(--medsync-dark-blue))] mt-1">Gerencie suas informações pessoais e configurações</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="btn-medsync-light flex items-center gap-2 text-sm px-3 py-1.5"
            data-testid="button-close-profile"
          >
            <X className="h-4 w-4" />
            Fechar
          </button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="info">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
          <TabsTrigger value="subscription">Subscrição</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="w-full shadow-lg">
              <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                <CardTitle className="text-2xl font-bold">
                  Dados do Perfil
                </CardTitle>
                <CardDescription className="text-white">
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleProfileUpdate}>
                <CardContent className="space-y-2 p-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Nome Completo</label>
                    <div className="flex items-center space-x-2">
                      <User className="text-primary w-5 h-5" />
                      <input 
                        id="name" 
                        name="name"
                        value={formData.name} 
                        onChange={handleInputChange}
                        placeholder="Seu nome completo" 
                        className="input-medsync"
                        data-testid="input-name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">E-mail</label>
                    <div className="flex items-center space-x-2">
                      <Mail className="text-primary w-5 h-5" />
                      <input 
                        id="email" 
                        name="email"
                        type="email" 
                        value={formData.email} 
                        onChange={handleInputChange}
                        placeholder="seu.email@exemplo.com" 
                        className="input-medsync"
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Nome de Usuário</label>
                    <div className="flex items-center space-x-2">
                      <IdCard className="text-primary w-5 h-5" />
                      <input 
                        id="username" 
                        value={user.username} 
                        disabled
                        className="input-medsync opacity-70"
                        data-testid="input-username"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">O nome de usuário não pode ser alterado</p>
                  </div>

                  {/* Seção de Logo para médicos */}
                  {user.roleId === 2 && (
                    <div className="space-y-2" data-testid="profile-logo-section">
                      <label className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Logo</label>
                      <div className="flex items-start space-x-2">
                        <ImageIcon className="text-primary w-5 h-5 mt-2" />
                        <div className="flex-1">
                          {user.logoUrl ? (
                            <div className="space-y-3 p-3 border border-[hsl(214,14%,84%)] rounded-md">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Logo atual:</p>
                                <div className="flex gap-2">
                                  <input
                                    id="logo-change-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoFileChange}
                                    className="hidden"
                                  />
                                  <button
                                    onClick={() => document.getElementById('logo-change-upload')?.click()}
                                    className="btn-medsync-dark h-7 px-2 text-xs flex items-center gap-1"
                                    disabled={isUploadingLogo}
                                    data-testid="button-change-logo"
                                  >
                                    <Upload className="h-3 w-3" />
                                    {isUploadingLogo ? "Enviando..." : "Alterar"}
                                  </button>
                                  <button
                                    onClick={handleRemoveLogo}
                                    className="btn-medsync-dark h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                                    disabled={isUploadingLogo}
                                    data-testid="button-remove-logo"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Remover
                                  </button>
                                </div>
                              </div>
                              <div className="relative bg-white rounded-md p-2 border border-[hsl(214,14%,84%)]">
                                <img 
                                  src={user.logoUrl} 
                                  alt="Logo do médico" 
                                  className="max-w-full max-h-24 object-contain mx-auto"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 border rounded-md">
                              <div 
                                className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                                  isDragOverLogo 
                                    ? 'border-primary bg-primary/5 border-solid' 
                                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                                }`}
                                onDragOver={handleLogoDragOver}
                                onDragLeave={handleLogoDragLeave}
                                onDrop={handleLogoDrop}
                                onClick={() => document.getElementById('logo-first-upload')?.click()}
                              >
                                <ImageIcon className={`w-8 h-8 mb-2 ${isDragOverLogo ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className={`text-sm text-center mb-2 ${isDragOverLogo ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                  {isDragOverLogo ? 'Solte a imagem aqui' : 'Nenhum logo cadastrado'}
                                </p>
                                <p className="text-xs text-muted-foreground text-center mb-3">
                                  Arraste uma imagem ou clique para selecionar
                                </p>
                                <input
                                  id="logo-first-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoFileChange}
                                  className="hidden"
                                />
                                <button
                                  className="btn-medsync-dark h-8 px-3 text-xs flex items-center gap-1"
                                  disabled={isUploadingLogo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById('logo-first-upload')?.click();
                                  }}
                                  data-testid="button-upload-logo"
                                >
                                  <Upload className="h-3 w-3" />
                                  {isUploadingLogo ? "Enviando..." : "Selecionar Arquivo"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Campo para assinatura do médico */}
                  {user.roleId === 2 && (
                    <div className="space-y-2" data-testid="profile-signature-section">
                      <label className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Assinatura</label>
                      <div className="flex items-start space-x-2">
                        <ImageIcon className="text-primary w-5 h-5 mt-2" />
                        <div className="flex-1">
                          {user.signatureUrl ? (
                            <div className="space-y-3 p-3 border border-[hsl(214,14%,84%)] rounded-md">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Assinatura atual:</p>
                                <div className="flex gap-2">
                                  <input
                                    id="signature-change-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureFileChange}
                                    className="hidden"
                                  />
                                  <button
                                    onClick={() => document.getElementById('signature-change-upload')?.click()}
                                    className="btn-medsync-dark h-7 px-2 text-xs flex items-center gap-1"
                                    disabled={isUploadingSignature}
                                    data-testid="button-change-signature"
                                  >
                                    <Upload className="h-3 w-3" />
                                    {isUploadingSignature ? "Enviando..." : "Alterar"}
                                  </button>
                                  <button
                                    onClick={handleRemoveSignature}
                                    className="btn-medsync-dark h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                                    disabled={isUploadingSignature}
                                    data-testid="button-remove-signature"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Remover
                                  </button>
                                </div>
                              </div>
                              <div className="relative bg-white rounded-md p-2 border border-[hsl(214,14%,84%)]">
                                <img 
                                  src={user.signatureUrl} 
                                  alt="Assinatura do médico" 
                                  className="max-w-full max-h-24 object-contain mx-auto"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 border rounded-md">
                              <div 
                                className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                                  isDragOverSignature 
                                    ? 'border-primary bg-primary/5 border-solid' 
                                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                                }`}
                                onDragOver={handleSignatureDragOver}
                                onDragLeave={handleSignatureDragLeave}
                                onDrop={handleSignatureDrop}
                                onClick={() => document.getElementById('signature-first-upload')?.click()}
                              >
                                <ImageIcon className={`w-8 h-8 mb-2 ${isDragOverSignature ? 'text-primary' : 'text-muted-foreground'}`} />
                                <p className={`text-sm text-center mb-2 ${isDragOverSignature ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                  {isDragOverSignature ? 'Solte a imagem aqui' : 'Nenhuma assinatura cadastrada'}
                                </p>
                                <p className="text-xs text-muted-foreground text-center mb-3">
                                  Arraste uma imagem ou clique para selecionar
                                </p>
                                <input
                                  id="signature-first-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSignatureFileChange}
                                  className="hidden"
                                />
                                <button
                                  className="btn-medsync-dark h-8 px-3 text-xs flex items-center gap-1"
                                  disabled={isUploadingSignature}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    document.getElementById('signature-first-upload')?.click();
                                  }}
                                  data-testid="button-upload-signature"
                                >
                                  <Upload className="h-3 w-3" />
                                  {isUploadingSignature ? "Enviando..." : "Selecionar Arquivo"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Campo para nota da assinatura - apenas para médicos */}
                      {user.roleId === 2 && (
                        <div className="space-y-2 mt-4" data-testid="profile-signature-note-section">
                          <label htmlFor="signatureNote" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Nota da Assinatura</label>
                          <div className="flex items-start space-x-2">
                            <PencilIcon className="text-primary w-5 h-5 mt-2" />
                            <div className="flex-1">
                              <textarea
                                id="signatureNote"
                                name="signatureNote"
                                placeholder="Ex: CRM 12345 - Especialista em Ortopedia&#10;Membro da Sociedade Brasileira de Ortopedia&#10;Especialista em Cirurgia do Joelho"
                                value={formData.signatureNote}
                                onChange={(e) => {
                                  const lines = e.target.value.split('\n');
                                  if (lines.length <= 4) {
                                    handleInputChange(e as any);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  const lines = e.currentTarget.value.split('\n');
                                  if (e.key === 'Enter' && lines.length >= 4) {
                                    e.preventDefault();
                                  }
                                }}
                                rows={4}
                                className="input-medsync w-full min-h-[100px] max-h-[100px] resize-none"
                                data-testid="textarea-signature-note"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Texto que aparecerá embaixo da sua assinatura nos documentos (até 4 linhas)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-4 border-t rounded-b-lg">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="btn-medsync-dark flex items-center gap-2"
                    data-testid="button-save-profile"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="w-full shadow-lg">
              <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                <CardTitle className="text-2xl font-bold">
                  Informações da Conta
                </CardTitle>
                <CardDescription className="text-white">
                  Detalhes sobre sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-6 rounded-b-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Função no Sistema</label>
                  <div className="flex items-start space-x-2">
                    <User className="text-primary w-5 h-5 mt-2" />
                    <input
                      type="text"
                      value={
                        user.roleId === 1 ? "Administrador" :
                        user.roleId === 2 ? "Médico" :
                        user.roleId === 3 ? "Assistente Básico" :
                        user.roleId === 4 ? "Assistente Administrativo" :
                        "Não definido"
                      }
                      disabled
                      className="input-medsync flex-1"
                      data-testid="input-role"
                    />
                  </div>
                </div>
                
                {user.crm && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">CRM</label>
                    <div className="flex items-start space-x-2">
                      <IdCard className="text-primary w-5 h-5 mt-2" />
                      <input
                        type="text"
                        value={user.crm}
                        disabled
                        className="input-medsync flex-1"
                        data-testid="input-crm"
                      />
                    </div>
                  </div>
                )}
                
                {/* Campo para cartão CRM do médico */}
                {user.roleId === 2 && (
                  <div className="space-y-2" data-testid="profile-crm-section">
                    <label className="text-sm font-medium text-muted-foreground">Cartão CRM</label>
                    <div className="flex items-start space-x-2">
                      <ImageIcon className="text-primary w-5 h-5 mt-2" />
                      <div className="flex-1">
                        {user.crmUrl ? (
                          <div className="space-y-3 p-3 border border-[hsl(214,14%,84%)] rounded-md">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Cartão CRM atual:</p>
                              <div className="flex gap-2">
                                <input
                                  id="crm-change-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleCrmFileChange}
                                  className="hidden"
                                />
                                <button
                                  onClick={() => document.getElementById('crm-change-upload')?.click()}
                                  className="btn-medsync-dark h-7 px-2 text-xs flex items-center gap-1"
                                  disabled={isUploadingCrm}
                                  data-testid="button-change-crm"
                                >
                                  <Upload className="h-3 w-3" />
                                  {isUploadingCrm ? "Enviando..." : "Alterar"}
                                </button>
                                <button
                                  onClick={handleRemoveCrm}
                                  className="btn-medsync-dark h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                                  disabled={isUploadingCrm}
                                  data-testid="button-remove-crm"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remover
                                </button>
                              </div>
                            </div>
                            <div className="relative bg-white rounded-md p-2 border border-[hsl(214,14%,84%)]">
                              <img 
                                src={user.crmUrl} 
                                alt="Cartão CRM do médico" 
                                className="max-w-full max-h-24 object-contain mx-auto"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 border rounded-md">
                            <div 
                              className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                                isDragOverCrm 
                                  ? 'border-primary bg-primary/5 border-solid' 
                                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                              }`}
                              onDragOver={handleCrmDragOver}
                              onDragLeave={handleCrmDragLeave}
                              onDrop={handleCrmDrop}
                              onClick={() => document.getElementById('crm-first-upload')?.click()}
                            >
                              <ImageIcon className={`w-8 h-8 mb-2 ${isDragOverCrm ? 'text-primary' : 'text-muted-foreground'}`} />
                              <p className={`text-sm text-center mb-2 ${isDragOverCrm ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {isDragOverCrm ? 'Solte a imagem aqui' : 'Nenhum cartão CRM cadastrado'}
                              </p>
                              <p className="text-xs text-muted-foreground text-center mb-3">
                                Arraste uma imagem ou clique para selecionar
                              </p>
                              <input
                                id="crm-first-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleCrmFileChange}
                                className="hidden"
                              />
                              <button
                                className="btn-medsync-dark h-8 px-3 text-xs flex items-center gap-1"
                                disabled={isUploadingCrm}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById('crm-first-upload')?.click();
                                }}
                                data-testid="button-upload-crm"
                              >
                                <Upload className="h-3 w-3" />
                                {isUploadingCrm ? "Enviando..." : "Selecionar Arquivo"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                
                {/* Mostrar hospitais associados apenas para médicos - Design conforme novo padrão solicitado */}
                {user.roleId === 2 && (
                  <>
                    <div className="space-y-1 pt-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-sm font-medium">Hospitais associados</p>
                        <button 
                          className="btn-medsync-dark ml-auto h-7 px-2 text-xs flex items-center gap-1"
                          onClick={() => setShowHospitalDialog(true)}
                          data-testid="button-manage-hospitals"
                        >
                          <PencilIcon className="h-3 w-3" />
                          Gerenciar
                        </button>
                      </div>
                      
                      {isHospitalsLoading ? (
                        <div className="flex items-center mt-1">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                          <p className="text-sm">Carregando...</p>
                        </div>
                      ) : !doctorHospitals || doctorHospitals.length === 0 ? (
                        <p className="text-sm mt-1 text-muted-foreground">Nenhum hospital associado</p>
                      ) : (
                        <div className="max-h-[460px] overflow-y-auto pr-2 space-y-2 rounded-md p-3">
                          {doctorHospitals.map((hospital: any, index: number) => {
                            // Buscar o nome do hospital com base na estrutura real dos dados
                            const hospitalName = hospital.hospitalName || 
                                               hospital.name || 
                                               `Hospital ${hospital.hospitalId}`;
                            
                            return (
                              <div 
                                key={hospital.id || hospital.hospitalId || index}
                                className="flex flex-col py-3 px-4 rounded-md bg-white border border-[hsl(214,14%,84%)]"
                              >
                                <div className="flex items-start">
                                  <div className="w-3 h-3 rounded-full bg-medsync-blue mr-3 flex-shrink-0 mt-1"></div>
                                  <div>
                                    <p className="text-sm text-[hsl(var(--medsync-dark-blue))] font-bold break-words">
                                      {hospitalName}
                                    </p>
                                    <span className="block text-xs text-muted-foreground mt-1">
                                      Associado em: {new Date(hospital.createdAt || "2025-05-24").toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="w-full shadow-lg">
              <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                <CardTitle className="text-2xl font-bold">
                  Alterar Senha
                </CardTitle>
                <CardDescription className="text-white">
                  Atualize sua senha de acesso ao sistema
                </CardDescription>
              </CardHeader>
              <form onSubmit={handlePasswordChange}>
                <CardContent className="space-y-4 p-6 rounded-b-lg">
                  <div className="space-y-2">
                    <label htmlFor="currentPassword" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Senha Atual</label>
                    <div className="flex items-center space-x-2">
                      <Key className="text-primary w-5 h-5" />
                      <input 
                        id="currentPassword"
                        name="currentPassword" 
                        type="password" 
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Sua senha atual" 
                        className="input-medsync"
                        data-testid="input-current-password"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Nova Senha</label>
                    <div className="flex items-center space-x-2">
                      <Key className="text-primary w-5 h-5" />
                      <input 
                        id="newPassword"
                        name="newPassword" 
                        type="password" 
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Nova senha" 
                        className="input-medsync"
                        data-testid="input-new-password"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Confirmar Nova Senha</label>
                    <div className="flex items-center space-x-2">
                      <Key className="text-primary w-5 h-5" />
                      <input 
                        id="confirmPassword"
                        name="confirmPassword" 
                        type="password" 
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirme sua nova senha" 
                        className="input-medsync"
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3">
                    <p className="text-xs text-muted-foreground">A senha deve ter no mínimo 8 caracteres e incluir letras, números e caracteres especiais.</p>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-4 border-t rounded-b-lg">
                  <button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="btn-medsync-dark flex items-center gap-2"
                    data-testid="button-change-password"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="w-full shadow-lg">
              <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                <CardTitle className="text-2xl font-bold">
                  Segurança da Conta
                </CardTitle>
                <CardDescription className="text-white">
                  Informações de segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 rounded-b-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-200">Último Login</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-blue-400 w-5 h-5" />
                    <p className="text-base">{user.lastLogin ? formatDate(user.lastLogin) : "Não disponível"}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-200">Conta Criada em</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-blue-400 w-5 h-5" />
                    <p className="text-base">{user.createdAt ? formatDate(user.createdAt) : "Não disponível"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="privacy">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Seção de configurações de aparência removida conforme solicitado */}
            
            <Card className="w-full shadow-lg">
              <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                <CardTitle className="text-2xl font-bold">
                  Termo de Consentimento
                </CardTitle>
                <CardDescription className="text-white">
                  Informações sobre o consentimento de dados pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6 rounded-b-lg">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status do Consentimento</p>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${user.consentAccepted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <p className="text-base">
                      {user.consentAccepted ? "Aceito" : "Pendente"}
                    </p>
                  </div>
                </div>
                
                {user.consentAccepted && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Data de Aceitação</p>
                    <p className="text-base">{formatDate(user.consentAccepted)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ao aceitar o termo de consentimento, você concordou com o processamento de seus dados pessoais conforme descrito em nossa política de privacidade.
                    </p>
                  </div>
                )}
                
                {!user.consentAccepted && (
                  <div className="space-y-2 pt-3">
                    <p className="text-sm text-yellow-500">
                      Você ainda não aceitou o termo de consentimento para tratamento de dados pessoais. 
                      Este termo aparecerá automaticamente na próxima vez que você acessar o sistema.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="subscription">
          <div className="grid gap-6 md:grid-cols-2">
            {isSubscriptionLoading ? (
              <Card className="w-full shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-sm text-muted-foreground">Carregando dados da subscrição...</p>
                  </div>
                </CardContent>
              </Card>
            ) : userSubscription ? (
              <>
                <Card className="w-full shadow-lg">
                  <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                    <CardTitle className="text-2xl font-bold">
                      Plano Atual
                    </CardTitle>
                    <CardDescription className="text-white">
                      Informações sobre sua assinatura ativa
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6 rounded-b-lg">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Nome do Plano</p>
                      <div className="flex items-center space-x-2">
                        <Package className="text-primary w-5 h-5" />
                        <p className="text-base font-semibold text-medsync-blue">{userSubscription.plan?.name || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Status</p>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          userSubscription.status === 'active' ? 'bg-green-500' :
                          userSubscription.status === 'trial' ? 'bg-blue-500' :
                          userSubscription.status === 'expired' ? 'bg-red-500' :
                          userSubscription.status === 'cancelled' ? 'bg-gray-500' :
                          'bg-yellow-500'
                        }`}></div>
                        <p className="text-base capitalize">
                          {userSubscription.status === 'active' ? 'Ativo' :
                           userSubscription.status === 'trial' ? 'Trial' :
                           userSubscription.status === 'expired' ? 'Expirado' :
                           userSubscription.status === 'cancelled' ? 'Cancelado' :
                           'Pendente'}
                        </p>
                      </div>
                    </div>
                    
                    {(userSubscription.plan?.priceMonthly || userSubscription.plan?.priceYearly) && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Tipo de Cobrança</p>
                        <div className="flex items-center space-x-2">
                          <Clock className="text-primary w-5 h-5" />
                          <p className="text-base">
                            {userSubscription.finalPrice && userSubscription.plan.priceYearly && 
                             Math.abs(userSubscription.finalPrice - userSubscription.plan.priceYearly) < 1000
                              ? 'Anual' 
                              : 'Mensal'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {userSubscription.finalPrice && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Valor</p>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="text-primary w-5 h-5" />
                          <div>
                            <p className="text-lg font-bold text-medsync-blue">
                              R$ {(userSubscription.finalPrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {userSubscription.originalPrice && userSubscription.originalPrice > userSubscription.finalPrice && (
                              <p className="text-xs text-muted-foreground line-through">
                                R$ {(userSubscription.originalPrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            )}
                            {userSubscription.discountPercent > 0 && (
                              <p className="text-xs text-green-600 font-medium">
                                {userSubscription.discountPercent}% de desconto aplicado
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ações da Assinatura */}
                    <div className="pt-4 border-t flex flex-wrap gap-2">
                      <button
                        onClick={() => billingPortalMutation.mutate()}
                        disabled={billingPortalMutation.isPending}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {billingPortalMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                        Atualizar Pagamento
                      </button>

                      {userSubscription.status === 'cancelling' ? (
                        <button
                          onClick={() => reactivateSubscriptionMutation.mutate()}
                          disabled={reactivateSubscriptionMutation.isPending}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                        >
                          {reactivateSubscriptionMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Reativar
                        </button>
                      ) : userSubscription.status === 'active' ? (
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      ) : null}
                    </div>

                    {userSubscription.status === 'cancelling' && (
                      <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700">
                          <AlertTriangle className="w-4 h-4" />
                          <p className="text-xs font-medium">
                            Cancelamento agendado para o final do período.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="w-full shadow-lg">
                  <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                    <CardTitle className="text-2xl font-bold">
                      Datas e Período
                    </CardTitle>
                    <CardDescription className="text-white">
                      Informações sobre o período da sua assinatura
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6 rounded-b-lg">
                    {userSubscription.startedAt && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Data de Início</p>
                        <div className="flex items-center space-x-2">
                          <Calendar className="text-primary w-5 h-5" />
                          <p className="text-base">
                            {format(new Date(userSubscription.startedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {userSubscription.expiresAt && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">
                          {userSubscription.status === 'active' ? 'Próxima Cobrança' : 'Data de Expiração'}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Clock className="text-primary w-5 h-5" />
                          <p className="text-base">
                            {format(new Date(userSubscription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {userSubscription.trialEndsAt && userSubscription.status === 'trial' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Trial Expira em</p>
                        <div className="flex items-center space-x-2">
                          <Clock className="text-primary w-5 h-5" />
                          <p className="text-base">
                            {format(new Date(userSubscription.trialEndsAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {userSubscription.paymentProvider && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Provedor de Pagamento</p>
                        <div className="flex items-center space-x-2">
                          <CreditCard className="text-primary w-5 h-5" />
                          <p className="text-base capitalize">{userSubscription.paymentProvider}</p>
                        </div>
                      </div>
                    )}
                    
                    {userSubscription.discountCode && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-sm font-medium text-[hsl(var(--medsync-dark-blue))]">Código de Desconto</p>
                        <div className="flex items-center space-x-2">
                          <BadgeCheck className="text-green-600 w-5 h-5" />
                          <div>
                            <p className="text-base font-mono font-semibold text-green-600">{userSubscription.discountCode}</p>
                            {userSubscription.discountDescription && (
                              <p className="text-xs text-muted-foreground">{userSubscription.discountDescription}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Limites de Uso integrado */}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <Infinity className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800 text-sm">Uso Ilimitado</span>
                        </div>
                        <BadgeCheck className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Histórico de Faturas */}
                <Card className="w-full shadow-lg md:col-span-2">
                  <CardHeader className="bg-medsync-blue text-white flex flex-col rounded-t-lg p-6 pb-3 pt-3 border-b space-y-0">
                    <CardTitle className="text-2xl font-bold">
                      Histórico de Faturas
                    </CardTitle>
                    <CardDescription className="text-white">
                      Suas faturas e recibos de pagamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isInvoicesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="ml-2 text-sm text-muted-foreground">Carregando faturas...</p>
                      </div>
                    ) : userInvoices && userInvoices.length > 0 ? (
                      <div className="space-y-3">
                        {userInvoices.map((invoice: any) => (
                          <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-medsync-blue" />
                              <div>
                                <p className="font-medium text-sm">
                                  {invoice.number || `Fatura ${invoice.id.slice(-8)}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(invoice.created * 1000), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-semibold text-medsync-blue">
                                  R$ {(invoice.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  invoice.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {invoice.status === 'paid' ? 'Pago' :
                                   invoice.status === 'open' ? 'Pendente' :
                                   invoice.status === 'draft' ? 'Rascunho' :
                                   invoice.status}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                {invoice.invoicePdf && (
                                  <a
                                    href={invoice.invoicePdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Baixar PDF"
                                  >
                                    <Download className="w-4 h-4 text-gray-600" />
                                  </a>
                                )}
                                {invoice.hostedInvoiceUrl && (
                                  <a
                                    href={invoice.hostedInvoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Ver online"
                                  >
                                    <ExternalLink className="w-4 h-4 text-gray-600" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="w-full shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-[hsl(var(--medsync-dark-blue))]">Nenhuma assinatura ativa</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Você ainda não possui uma assinatura ativa.
                    </p>
                    <button
                      onClick={() => setLocation('/plans')}
                      className="mt-4 px-6 py-2 bg-medsync-blue text-white rounded-lg hover:bg-medsync-dark-blue transition-colors"
                    >
                      Ver Planos Disponíveis
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Modal de Confirmação de Cancelamento */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Cancelar Assinatura
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar sua assinatura?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Sua assinatura continuará ativa até o final do período atual. 
                  Após isso, você perderá acesso aos recursos premium.
                </p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Você pode continuar usando até o fim do período
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Seus dados serão mantidos por 90 dias
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Você pode reativar a qualquer momento
                </li>
              </ul>
            </div>
            <DialogFooter className="gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {cancelSubscriptionMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Confirmar Cancelamento
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* Dialog para crop da assinatura */}
      <Dialog open={showSignatureCrop} onOpenChange={setShowSignatureCrop}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Assinatura</DialogTitle>
            <DialogDescription>
              Use os controles abaixo para ajustar o tamanho e posição da sua assinatura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={signatureCanvasRef}
                  width={250}
                  height={200}
                  className="block cursor-move"
                  style={{ 
                    border: '1px solid #ccc',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseDown={handleSignatureMouseDown}
                  onMouseMove={handleSignatureMouseMove}
                  onMouseUp={handleSignatureMouseUp}
                  onMouseLeave={handleSignatureMouseUp}
                />
              </div>
              
              <div className="w-full max-w-md space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoom: {Math.round(signatureScale * 100)}%</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={signatureScale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      setSignatureScale(newScale);
                      drawImageOnCanvas(
                        signatureCanvasRef,
                        signatureImageSrc,
                        newScale,
                        signaturePosition,
                        { width: 250, height: 200 }
                      );
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição X</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={signaturePosition.x}
                      onChange={(e) => {
                        const newPosition = { ...signaturePosition, x: parseInt(e.target.value) };
                        setSignaturePosition(newPosition);
                        drawImageOnCanvas(
                          signatureCanvasRef,
                          signatureImageSrc,
                          signatureScale,
                          newPosition,
                          { width: 250, height: 200 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição Y</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={signaturePosition.y}
                      onChange={(e) => {
                        const newPosition = { ...signaturePosition, y: parseInt(e.target.value) };
                        setSignaturePosition(newPosition);
                        drawImageOnCanvas(
                          signatureCanvasRef,
                          signatureImageSrc,
                          signatureScale,
                          newPosition,
                          { width: 250, height: 200 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    resetImagePosition(
                      signatureImageSrc,
                      { width: 250, height: 200 },
                      setSignatureScale,
                      setSignaturePosition
                    );
                    
                    setTimeout(() => {
                      drawImageOnCanvas(
                        signatureCanvasRef,
                        signatureImageSrc,
                        signatureScale,
                        signaturePosition,
                        { width: 250, height: 200 }
                      );
                    }, 100);
                  }}
                  className="btn-medsync-dark w-full text-sm flex items-center justify-center gap-2"
                  data-testid="button-reset-signature-position"
                >
                  Resetar Posição
                </button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <button className="btn-medsync-dark flex items-center gap-2" onClick={() => setShowSignatureCrop(false)} data-testid="button-cancel-signature-crop">
              Cancelar
            </button>
            <button 
              className="btn-medsync-dark bg-blue-500 hover:bg-blue-600 flex items-center gap-2"
              onClick={handleSignatureCropConfirm}
              disabled={isUploadingSignature}
              data-testid="button-confirm-signature-crop"
            >
              {isUploadingSignature ? "Enviando..." : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crop do logo */}
      <Dialog open={showLogoCrop} onOpenChange={setShowLogoCrop}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Logo</DialogTitle>
            <DialogDescription>
              Use os controles abaixo para ajustar o tamanho e posição do seu logo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={logoCanvasRef}
                  width={500}
                  height={150}
                  className="block cursor-move"
                  style={{ 
                    border: '1px solid #ccc',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseDown={handleLogoMouseDown}
                  onMouseMove={handleLogoMouseMove}
                  onMouseUp={handleLogoMouseUp}
                  onMouseLeave={handleLogoMouseUp}
                />
              </div>
              
              <div className="w-full max-w-md space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoom: {Math.round(logoScale * 100)}%</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={logoScale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      setLogoScale(newScale);
                      drawImageOnCanvas(
                        logoCanvasRef,
                        logoImageSrc,
                        newScale,
                        logoPosition,
                        { width: 500, height: 150 }
                      );
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição X</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={logoPosition.x}
                      onChange={(e) => {
                        const newPosition = { ...logoPosition, x: parseInt(e.target.value) };
                        setLogoPosition(newPosition);
                        drawImageOnCanvas(
                          logoCanvasRef,
                          logoImageSrc,
                          logoScale,
                          newPosition,
                          { width: 500, height: 150 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posição Y</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={logoPosition.y}
                      onChange={(e) => {
                        const newPosition = { ...logoPosition, y: parseInt(e.target.value) };
                        setLogoPosition(newPosition);
                        drawImageOnCanvas(
                          logoCanvasRef,
                          logoImageSrc,
                          logoScale,
                          newPosition,
                          { width: 500, height: 150 }
                        );
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    resetImagePosition(
                      logoImageSrc,
                      { width: 500, height: 150 },
                      setLogoScale,
                      setLogoPosition
                    );
                    
                    setTimeout(() => {
                      drawImageOnCanvas(
                        logoCanvasRef,
                        logoImageSrc,
                        logoScale,
                        logoPosition,
                        { width: 500, height: 150 }
                      );
                    }, 100);
                  }}
                  className="btn-medsync-dark w-full text-sm flex items-center justify-center gap-2"
                  data-testid="button-reset-logo-position"
                >
                  Resetar Posição
                </button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <button className="btn-medsync-dark flex items-center gap-2" onClick={() => setShowLogoCrop(false)} data-testid="button-cancel-logo-crop">
              Cancelar
            </button>
            <button 
              className="btn-medsync-dark bg-blue-500 hover:bg-blue-600 flex items-center gap-2"
              onClick={handleLogoCropConfirm}
              disabled={isUploadingLogo}
              data-testid="button-confirm-logo-crop"
            >
              {isUploadingLogo ? "Enviando..." : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
