import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  HelpCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Shield,
  Monitor,
  Stethoscope,
  Eye,
  FileText,
  BarChart3,
  Edit,
  ExternalLink,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { SiFacebook, SiInstagram, SiLinkedin } from "react-icons/si";
import { useSupportContact } from "@/lib/support-contact";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { LoginModal } from "@/components/auth/login-modal";
import { RegisterModal } from "@/components/auth/register-modal";
import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import {
  type LoginForm,
  type ForgotPasswordForm,
  type ResetPasswordForm,
} from "@/schemas/auth-schemas";
import MedSyncLogo from "@/assets/medsync-logo-new.svg";
import MedSyncLogoGray from "@/assets/logos/Medsync_Logo_Gray.svg";
import MedSyncLogoWhite from "@/assets/logos/Medsync_Logo_White.svg";
import sectionDoctorImage from "@/assets/section_doctor_image.png";
import sectionYStylized from "@/assets/section_y_stylized.svg";
import iconHome1 from "@/assets/icons/icon_home_1.svg";
import iconHome2 from "@/assets/icons/icon_home_2.svg";
import iconHome3 from "@/assets/icons/icon_home_3.svg";
import iconHome4 from "@/assets/icons/icon_home_4.svg";
import iconDoctor from "@/assets/icons/icon-doctor.svg";
import medsyncBanner from "@/assets/banners/Medsync_Consultorio_3288x1102.png";
import { onlyNumbers } from "@/lib/utils";
import { useValidation } from "@/hooks/use-validation";

export default function AuthPage() {
  const { openSupport } = useSupportContact();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<
    "login" | "register" | "forgot-password"
  >("login");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [selectedPlanCard, setSelectedPlanCard] = useState<
    "START" | "PRO" | "CLINICA" | null
  >(null);
  const [, setLocation] = useLocation();
  const { validateUnique, isValidating } = useValidation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Estados para hover sincronizado
  const [hoveredPlan, setHoveredPlan] = useState<
    "START" | "PRO" | "CLINICA" | null
  >(null);

  // Função para selecionar plano
  const handlePlanSelection = (planType: "START" | "PRO" | "CLINICA") => {
    setSelectedPlanCard(planType);
    toast({
      title: `Plano ${planType} selecionado`,
      description: `Você selecionou o plano ${planType}. Continue para finalizar sua escolha.`,
    });
  };

  // Buscar planos de assinatura
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["/api/subscriptions/plans"],
  });

  // Force light theme on auth page
  useEffect(() => {
    const htmlElement = document.documentElement;
    const originalClasses = htmlElement.className;

    // Remove any existing theme classes and force light theme
    htmlElement.classList.remove("dark", "light", "system");
    htmlElement.classList.add("light", "auth-page-forced-light");

    // Override any CSS custom properties if needed
    htmlElement.style.setProperty("color-scheme", "light");

    console.log("Auth page: Forced light theme");

    // Cleanup function to restore original theme when leaving auth page
    return () => {
      htmlElement.className = originalClasses;
      htmlElement.classList.remove("auth-page-forced-light");
      htmlElement.style.removeProperty("color-scheme");
      console.log("Auth page: Restored original theme");
    };
  }, []);

  // Check for reset password token in URL FIRST, then redirect if needed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get("reset");
    
    // Se há token de reset, mostrar formulário de reset (mesmo se logado)
    if (resetToken) {
      setShowResetForm(true);
      setModalType("forgot-password"); // IMPORTANTE: Mudar para o modal correto
      setShowModal(true);
      toast({
        title: "Token de recuperação detectado",
        description: "Digite sua nova senha abaixo",
      });
      return; // Não redirecionar, mostrar form de reset
    }
    
    // Só redirecionar se NÃO há token de reset e usuário está logado
    if (!isLoading && user) {
      setLocation("/welcome");
    }
  }, [user, isLoading, setLocation, toast]);

  // Mutations
  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) =>
      apiRequest("/api/auth/login", "POST", data),
    onSuccess: async () => {
      // Invalidar queries de autenticação para forçar refresh
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Aguardar um pouco para garantir que a query foi atualizada
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast({ title: "Login realizado com sucesso!" });
      setShowModal(false);
      setLocation("/welcome");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      // O webhook N8N envia o email de recuperação via automação externa
      // Ver: server/auth.ts (endpoint /api/forgot-password)
      return await apiRequest("/api/forgot-password", "POST", data);
    },
    onSuccess: (response: any) => {
      setResetEmailSent(true);

      if (response.token) {
        // Modo desenvolvimento - webhook falhou, exibir token diretamente
        toast({
          title: "Modo Desenvolvimento",
          description: `Link copiado para área de transferência`,
        });

        // Copiar URL para clipboard
        const resetUrl = `${window.location.origin}/auth?reset=${response.token}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(resetUrl);
        }

        console.log("🔗 URL de reset de senha:", resetUrl);
      } else {
        toast({ title: "Instruções de recuperação enviadas!" });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar solicitação",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordForm) => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("reset");
      return apiRequest("/api/reset-password", "POST", { ...data, token });
    },
    onSuccess: () => {
      toast({ title: "Senha atualizada com sucesso!" });
      setShowResetForm(false);
      setModalType("login");
      // Limpar URL
      window.history.replaceState({}, "", "/auth");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Token inválido ou expirado",
        variant: "destructive",
      });
    },
  });

  // Função auxiliar para validar campos únicos
  const handleFieldValidation = async (
    field: "cpf" | "crm" | "phone" | "email" | "username",
    value: string,
  ) => {
    if (!value.trim()) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
      return;
    }

    const normalizedValue = field === "cpf" ? onlyNumbers(value) : value;
    const isUnique = await validateUnique(field, normalizedValue);

    if (!isUnique) {
      const fieldNames = {
        cpf: "CPF",
        crm: "CRM",
        phone: "Telefone",
        email: "Email",
        username: "Username",
      };
      setValidationErrors((prev) => ({
        ...prev,
        [field]: `${fieldNames[field]} já está em uso`,
      }));
    } else {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleLoginClick = () => {
    setModalType("login");
    setShowModal(true);
  };

  const handleRegisterClick = () => {
    setModalType("register");
    setShowModal(true);
  };

  // Modal handlers
  const handleLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleForgotPasswordSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  const handleResetPasswordSubmit = (data: ResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-muted shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center min-h-[9rem] py-4 sm:py-0.5 gap-4 sm:gap-0">
            {/* Logo */}
            <div className="flex items-center justify-center cursor-pointer pt-2 sm:pt-6">
              <img src={MedSyncLogoGray} alt="MedSync Logo" className="h-24 sm:h-32 scale-90" />
            </div>

            {/* Login/Register buttons */}
            <div className="flex border px-1 py-1 rounded-2xl border-medsync-blue">
              <button
                onClick={handleLoginClick}
                className="btn-medsync-auth"
              >
                <strong>Login</strong>
              </button>
              <Button
                onClick={handleRegisterClick}
                variant="ghost"
                className="bg-transparent px-8 py-2 rounded-xl font-medium text-base border-0 h-9 hover:bg-accent/10 text-medsync-blue"
              >
                <strong>Registrar</strong>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="py-24 auth-hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${medsyncBanner})`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-start">
            {/* Left side - Text content aligned left */}
            <div className="text-white z-10 max-w-md lg:max-w-2xl -mt-8">
              <div className="mb-4 text-left relative">
                <img
                  src={MedSyncLogoWhite}
                  alt="MedSync Logo"
                  className="h-20 sm:h-28 lg:h-36 mt-6 ml-11 relative z-10"
                />
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight -mt-8 sm:-mt-12 ml-4 sm:ml-16 font-lato relative z-20">
                  <span className="text-white">Inteligência</span>
                  <br />
                  <span className="text-white whitespace-nowrap">
                    Médica Integrada
                  </span>
                </h1>
              </div>
              <p className="text-lg mb-4 text-primary/80 italic leading-relaxed text-center">
                "A Revolução nas Autorizações Cirúrgicas.
                <br />
                Menos espera. Mais cuidado."
              </p>
              <div className="text-left ml-16">
                <button
                  onClick={handleRegisterClick}
                  className="btn-medsync-auth"
                >
                  <strong>Teste grátis</strong>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-6xl font-bold mb-4">
            <span className="text-medsync-blue">
              Organização
            </span>
            <br />
            <span className="text-gray-900">Centralizada</span>
          </h2>
          <p className="text-md text-gray-600 mb-12 font-bold">
            Exames, laudos, documentos e pedidos em um só lugar.
          </p>

          {/* Four benefit cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img
                    src={iconHome1}
                    alt="Economia de tempo"
                    className="w-16 h-16"
                  />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-medsync-blue">
                  Economia
                  <br />
                  de tempo
                </h3>
                <p className="text-sm text-gray-600">
                  Fluxos guiados e preenchimento automático.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img
                    src={iconHome2}
                    alt="Redução de glosas"
                    className="w-16 h-16"
                  />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-medsync-blue">
                  Redução
                  <br />
                  de glosas
                </h3>
                <p className="text-sm text-gray-600">
                  Preenchimento técnico, testado previamente e baseado em normas
                  da tabela{" "}
                  <span className="font-medium text-medsync-blue">
                    CBHPM
                  </span>
                  .
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img
                    src={iconHome3}
                    alt="Produção otimizada"
                    className="w-16 h-16"
                  />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-medsync-blue">
                  Produção
                  <br />
                  otimizada
                </h3>
                <p className="text-sm text-gray-600">
                  Mais cirurgias realizadas, mais receita para você e sua
                  equipe.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mx-auto mb-4">
                  <img
                    src={iconHome4}
                    alt="Segurança e Rastreio"
                    className="w-16 h-16"
                  />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-medsync-blue">
                  Segurança
                  <br />e Rastreio
                </h3>
                <p className="text-sm text-gray-600">
                  Cada pedido com histórico completo e backup.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Blue Section with Background Image */}
      <section
        className="mb-16 relative overflow-hidden py-12 pb-28 blue-section-rounded"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4 sm:gap-8">
          {/* Container da imagem do médico */}
          {/* <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 sm:p-8 mx-4 sm:mx-8 flex-1 flex items-center justify-center sm:justify-end">
            <img
              src={sectionDoctorImage}
              alt="Doctor"
              className="h-64 sm:h-80 lg:h-96 w-auto object-contain"
            />
          </div> */}

          {/* Container das caixas de texto com Y sobreposto */}
          <div className="relative mx-4 sm:mx-8">
            <div className="flex flex-col gap-4 sm:gap-8">
              {/* Primeira caixa */}
              <div className="flex justify-start pl-0 sm:pl-12 lg:pl-56">
                <div className="text-white text-base sm:text-xl font-medium leading-relaxed border border-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 max-w-xs sm:max-w-none">
                  <div className="w-1/2 h-px bg-white mb-3"></div>
                  <p>
                    Indicado para{" "}
                    <strong>
                      cirurgiões e<br />
                      clínicas
                    </strong>{" "}
                    que buscam eficiência
                    <br />
                    e rastreabilidade nos processos
                    <br />
                    cirúrgicos.
                  </p>
                </div>
              </div>

              {/* Segunda caixa */}
              <div className="flex justify-end pr-0 sm:pr-12 lg:pr-56 -mt-1 sm:-mt-8">
                <div className="text-white text-base sm:text-xl font-medium leading-relaxed border border-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 max-w-xs sm:max-w-none">
                  <div className="w-1/2 h-px bg-white mb-3"></div>
                  <p>
                    Ideal para <strong>médicos cirurgiões</strong>
                    <br />
                    que desejam ganhar tempo,
                    <br />
                    evitar glosas e{" "}
                    <strong>
                      aumentar sua
                      <br />
                      produtividade.
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Y Stylized sobreposto apenas nas caixas de texto */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-20 sm:pt-32 lg:pt-44">
              <img
                src={sectionYStylized}
                alt="Y Stylized"
                className="h-32 sm:h-48 lg:h-72 w-auto opacity-80 sm:opacity-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-12">
            O{" "}
            <span className="text-medsync-blue">
              sistema inteligente
            </span>
            <br />
            que automatiza
            <br />
            pedidos cirúrgicos
          </h2>

          {/* Three feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-medsync-blue">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  Organiza toda a<br />
                  documentação
                </h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-medsync-blue">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  Integra convênios
                  <br />e hospitais
                </h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-medsync-blue">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  Acelera aprovação
                  <br />
                  de cirurgias
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Login/Register Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          className="max-w-4xl w-[calc(100vw-16px)] sm:w-full mx-auto bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Cabeçalho completo */}
          <DialogHeader className="flex flex-col px-4 lg:px-6">
            {/* Logo no modal */}
            <div className="flex justify-center">
              <img
                src={MedSyncLogoGray}
                alt="MedSync Logo"
                className="h-16 w-auto lg:h-24 py-2"
              />
            </div>
            {modalType === "login" && (
              <>
                <DialogTitle className="sr-only">Login MedSync</DialogTitle>
                <DialogDescription className="sr-only">
                  Faça login na plataforma MedSync
                </DialogDescription>
              </>
            )}
            {modalType === "register" && (
              <>
                <DialogTitle className="sr-only">Registro MedSync</DialogTitle>
                <DialogDescription className="sr-only">
                  Registre-se na plataforma MedSync
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          <div className="p-4 sm:p-6 lg:px-12 lg:pb-12 lg:pt-4 bg-white">
            {modalType === "login" ? (
              <LoginModal
                onSubmit={handleLoginSubmit}
                onSwitchToRegister={() => setModalType("register")}
                onSwitchToForgotPassword={() => setModalType("forgot-password")}
                isLoading={loginMutation.isPending}
              />
            ) : modalType === "register" ? (
              <RegisterModal
                onSwitchToLogin={() => setModalType("login")}
                validationErrors={validationErrors}
                onFieldValidation={handleFieldValidation}
              />
            ) : modalType === "forgot-password" ? (
              <ForgotPasswordModal
                onSubmitForgotPassword={handleForgotPasswordSubmit}
                onSubmitResetPassword={handleResetPasswordSubmit}
                onBackToLogin={() => setModalType("login")}
                isLoadingForgot={forgotPasswordMutation.isPending}
                isLoadingReset={resetPasswordMutation.isPending}
                resetEmailSent={resetEmailSent}
                showResetForm={showResetForm}
                setResetEmailSent={setResetEmailSent}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-[#124a6b] to-[#2ca8e0] text-white py-8 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="flex flex-col items-center md:items-start gap-3">
              <img 
                src={MedSyncLogo} 
                alt="MedSync" 
                className="h-10 brightness-0 invert"
              />
              <p className="text-sm text-white/80 text-center md:text-left">
                Simplificando autorizações médicas no Brasil
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-2 text-sm">
              <span className="font-semibold text-white">MedSync Cirurgias LTDA</span>
              <span className="text-white/80">CNPJ: 62.433.954/0001-45</span>
              <div className="flex flex-col items-center gap-1 mt-2">
                <Link
                  href="/lgpd"
                  className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                >
                  <Shield className="h-3 w-3" />
                  Política de Privacidade e LGPD
                </Link>
                <a
                  href="https://lgpd.somaxi.com.br/formulario/cliente-1765997299970-mo7tsrwb9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                  data-testid="link-lgpd-rights-auth"
                >
                  Direitos do Titular LGPD
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-sm font-medium">Siga-nos</span>
              <div className="flex items-center gap-4">
                <a
                  href="https://facebook.com/medsync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <SiFacebook className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/medsync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <SiInstagram className="h-5 w-5" />
                </a>
                <a
                  href="https://linkedin.com/company/medsync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <SiLinkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/20 text-center text-sm text-white/60">
            &copy; {new Date().getFullYear()} MedSync. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Botão flutuante do WhatsApp */}
      <div
        className="fixed bottom-6 right-6 z-50 transform transition-all duration-300 hover:scale-110"
        onClick={() => {
          openSupport("Olá! Gostaria de saber mais sobre o MedSync.");
        }}
      >
        <div className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-lg cursor-pointer transition-colors duration-200 group">
          <FaWhatsapp className="h-6 w-6" />
        </div>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <div className="bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap">
            Entre em contato via WhatsApp
          </div>
        </div>
      </div>
    </div>
  );
}
