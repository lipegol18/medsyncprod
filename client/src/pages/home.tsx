import { useCallback, useEffect, useState } from "react";
import { useLocation, useRouter } from "wouter";
import {
        Card,
        CardContent,
        CardHeader,
        CardTitle,
        CardDescription,
        CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LgpdModal } from "@/components/ui/lgpd-modal";
import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuTrigger,
        DropdownMenuLabel,
        DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { usePendingOrders } from "@/hooks/use-pending-orders";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
        FileText,
        FileCheck,
        Database,
        BarChart,
        ClipboardList,
        PlusCircle,
        ArrowRight,
        Users,
        Activity,
        TrendingUp,
        Calendar,
        Clock,
        CheckCircle2,
        AlertCircle,
        Building2,
        MapPin,
        User,
        HelpCircle,
        BookOpen,
        UserCircle,
} from "lucide-react";
import { useOnboarding } from "@/features/onboarding";

import { addTranslations } from "@/lib/i18n";
import NovoPedidoIcon from "@/assets/icons/novo-pedido-icon.svg";
import PedidosIcon from "@/assets/icons/pedidos-icon.svg";
import PacienteIcon from "@/assets/icons/paciente-icon.svg";
import AvatarCroped from "@/assets/Avatar_croped.png";
import CentroCirurgicoImage from "@/assets/banners/Medsync_1500x300px_v2.png";
import { TrialExpiredModal } from "@/components/trial/trial-expired-modal";
import { PastDueBanner } from "@/components/trial/past-due-banner";
import { PastDueModal } from "@/components/trial/past-due-modal";
import { UserSubscription } from "@/../../shared/schema";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";

// Adicionar traduções para a página inicial
const translations = {
        "pt-BR": {
                "home.welcome": "Bem-vindo ao Sistema MedSync",
                "home.description":
                        "Seu painel de controle para autorizações médicas, pedidos cirúrgicos e gestão de materiais OPME",
                "home.greeting": "Olá",
                "home.stats.title": "Visão Geral",
                "home.stats.orders": "Pedidos",
                "home.stats.patients": "Pacientes",
                "home.stats.activity": "Atividade Recente",
                "home.stats.performance": "Performance",
                "home.quickActions": "Ações Rápidas",
                "home.recentActivity": "Atividade Recente",
                "home.create.title": "Criar Novo Pedido Cirúrgico",
                "home.create.description":
                        "Gere pedidos cirúrgicos com listas OPME de forma rápida e precisa",
                "home.create.button": "Novo Pedido",
                "home.orders.title": "Pedidos Cirúrgicos",
                "home.orders.description":
                        "Visualize todos os seus pedidos cirúrgicos",
                "home.orders.content":
                        "Acesse seus pedidos cirúrgicos em todos os status, acompanhe o andamento e histórico das solicitações.",
                "home.orders.content.admin":
                        "Visualize todos os pedidos cirúrgicos de todos os médicos, com status completo e histórico detalhado.",
                "home.orders.button": "Ver Pedidos",
                "home.patients.title": "Pacientes",
                "home.patients.description": "Gerencie cadastros de pacientes",
                "home.patients.content":
                        "Acesse, cadastre e gerencie informações dos pacientes para procedimentos cirúrgicos.",
                "home.patients.button": "Ver Pacientes",
                "home.catalog.title": "Catálogo OPME",
                "home.catalog.description":
                        "Explore o catálogo de materiais especiais",
                "home.catalog.content":
                        "Acesse a lista completa de órteses, próteses e materiais especiais disponíveis para seus procedimentos.",
                "home.catalog.button": "Ver Catálogo",
                "home.reports.title": "Relatórios",
                "home.reports.description":
                        "Análises e estatísticas de pedidos cirúrgicos",
                "home.reports.content":
                        "Visualize relatórios e estatísticas sobre seus pedidos cirúrgicos, materiais mais utilizados e histórico de procedimentos.",
                "home.reports.button": "Ver Relatórios",
        },
        "en-US": {
                "home.welcome": "Welcome to MedSync System",
                "home.description":
                        "Your control panel for medical authorizations, surgical orders and OPME materials management",
                "home.greeting": "Hello",
                "home.stats.title": "Overview",
                "home.stats.orders": "Orders",
                "home.stats.patients": "Patients",
                "home.stats.activity": "Recent Activity",
                "home.stats.performance": "Performance",
                "home.quickActions": "Quick Actions",
                "home.recentActivity": "Recent Activity",
                "home.create.title": "Create New Surgical Order",
                "home.create.description":
                        "Generate surgical orders with OPME lists quickly and accurately",
                "home.create.button": "New Order",
                "home.orders.title": "Completed Surgical Orders",
                "home.orders.description": "View all your surgical orders",
                "home.orders.content":
                        "Access your surgical orders in all statuses, track progress and request history.",
                "home.orders.content.admin":
                        "View all surgical orders from all doctors, with complete status and detailed history.",
                "home.orders.button": "View Orders",
                "home.patients.title": "Patients",
                "home.patients.description": "Manage patient records",
                "home.patients.content":
                        "Access, register and manage patient information for surgical procedures.",
                "home.patients.button": "View Patients",
                "home.catalog.title": "OPME Catalog",
                "home.catalog.description":
                        "Explore the catalog of special materials",
                "home.catalog.content":
                        "Access the complete list of orthoses, prostheses and special materials available for your procedures.",
                "home.catalog.button": "View Catalog",
                "home.reports.title": "Reports",
                "home.reports.description":
                        "Analysis and statistics of surgical orders",
                "home.reports.content":
                        "View reports and statistics on your surgical orders, most used materials and procedure history.",
                "home.reports.button": "View Reports",
        },
        "es-ES": {
                "home.welcome": "Bienvenido al Sistema MedSync",
                "home.description":
                        "Su panel de control para autorizaciones médicas, pedidos quirúrgicos y gestión de materiales OPME",
                "home.greeting": "Hola",
                "home.stats.title": "Resumen",
                "home.stats.orders": "Pedidos",
                "home.stats.patients": "Pacientes",
                "home.stats.activity": "Actividad Reciente",
                "home.stats.performance": "Rendimiento",
                "home.quickActions": "Acciones Rápidas",
                "home.recentActivity": "Actividad Reciente",
                "home.create.title": "Crear Nuevo Pedido Quirúrgico",
                "home.create.description":
                        "Genere pedidos quirúrgicos con listas OPME de forma rápida y precisa",
                "home.create.button": "Nuevo Pedido",
                "home.orders.title": "Pedidos Quirúrgicos Realizados",
                "home.orders.description":
                        "Visualice todos sus pedidos quirúrgicos",
                "home.orders.content":
                        "Acceda a sus pedidos quirúrgicos en todos los estados, siga el progreso y el historial de solicitudes.",
                "home.orders.content.admin":
                        "Visualice todos los pedidos quirúrgicos de todos los médicos, con estado completo e historial detallado.",
                "home.orders.button": "Ver Pedidos",
                "home.patients.title": "Pacientes",
                "home.patients.description": "Gestione registros de pacientes",
                "home.patients.content":
                        "Acceda, registre y administre información de pacientes para procedimientos quirúrgicos.",
                "home.patients.button": "Ver Pacientes",
                "home.catalog.title": "Catálogo OPME",
                "home.catalog.description":
                        "Explore el catálogo de materiales especiales",
                "home.catalog.content":
                        "Acceda a la lista completa de órtesis, prótesis y materiales especiales disponibles para sus procedimientos.",
                "home.catalog.button": "Ver Catálogo",
                "home.reports.title": "Informes",
                "home.reports.description":
                        "Análisis y estadísticas de pedidos quirúrgicos",
                "home.reports.content":
                        "Visualice informes y estadísticas sobre sus pedidos quirúrgicos, materiales más utilizados e historial de procedimientos.",
                "home.reports.button": "Ver Informes",
        },
};

// Adicionar traduções para cada idioma
addTranslations("pt-BR", translations["pt-BR"]);
addTranslations("en-US", translations["en-US"]);
addTranslations("es-ES", translations["es-ES"]);

// Interface para as estatísticas do dashboard
interface DashboardStats {
        orderCount?: number;
        patientCount?: number;
        doctorPerformance?: Array<{
                name: string;
                value: number;
        }>;
        hospitalVolume?: Array<{
                name: string;
                value: number;
        }>;
        supplierStats?: Array<{
                name: string;
                value: number;
        }>;
}

// Interface para as estatísticas da home
interface HomeStats {
        pendingSchedulingCount: number;
        pendingOrdersCount: number;
}

// Interface para a distribuição de status
interface StatusDistribution {
        id: string | number;
        code: string;
        name: string;
        color: string;
        count: number;
}

export default function Home() {
        const [_, navigate] = useLocation();
        const [labels, setLabels] = useState(translations["pt-BR"]);
        const { user, logoutMutation } = useAuth();

        // Estado para modal de pagamento/trial expirado
        const [showPaymentModal, setShowPaymentModal] = useState(false);
        const [paymentModalType, setPaymentModalType] = useState<'trial_expired' | 'pending_payment'>('trial_expired');

        // Estados para past_due (pagamento em atraso)
        const [showPastDueBanner, setShowPastDueBanner] = useState(false);
        const [showPastDueModal, setShowPastDueModal] = useState(false);
        const [pastDueDays, setPastDueDays] = useState(0);
        const [isPastDueBlocking, setIsPastDueBlocking] = useState(false);

        // Verificar se o usuário é administrador
        const isAdmin = user?.roleId === 1;

        // Query para buscar informações de assinatura do usuário
        const { data: userSubscription } = useQuery<UserSubscription>({
                queryKey: ["/api/user/subscription"],
                enabled: !!user,
        });

        // Verificar status da assinatura do usuário
        // Backend já auto-atualiza trial_expired, então frontend só checa status
        useEffect(() => {
                if (!userSubscription) return;

                // Mostrar modal para status que requerem ação do usuário
                if (userSubscription.status === 'pending_payment') {
                        setPaymentModalType('pending_payment');
                        setShowPaymentModal(true);
                } else if (userSubscription.status === 'trial_expired') {
                        setPaymentModalType('trial_expired');
                        setShowPaymentModal(true);
                } else if (userSubscription.status === 'past_due') {
                        // Calcular dias de atraso a partir de pastDueStartedAt
                        let daysOverdue = 0;
                        if (userSubscription.pastDueStartedAt) {
                                const startDate = new Date(userSubscription.pastDueStartedAt);
                                const now = new Date();
                                const diffTime = Math.abs(now.getTime() - startDate.getTime());
                                daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        }
                        
                        setPastDueDays(daysOverdue);
                        
                        // Nível 1: dias 0-5 -> Banner (não bloqueante)
                        // Nível 2: dias 5-15 -> Modal (não bloqueante)
                        // Nível 3: dias 15+ -> Modal bloqueante
                        if (daysOverdue < 5) {
                                // Nível 1: Banner apenas
                                setShowPastDueBanner(true);
                                setShowPastDueModal(false);
                                setIsPastDueBlocking(false);
                        } else if (daysOverdue < 15) {
                                // Nível 2: Modal não bloqueante
                                setShowPastDueBanner(true);
                                setShowPastDueModal(true);
                                setIsPastDueBlocking(false);
                        } else {
                                // Nível 3: Modal bloqueante
                                setShowPastDueBanner(false);
                                setShowPastDueModal(true);
                                setIsPastDueBlocking(true);
                        }
                } else {
                        // Limpar estados de past_due quando não estiver em atraso
                        setShowPastDueBanner(false);
                        setShowPastDueModal(false);
                        setPastDueDays(0);
                        setIsPastDueBlocking(false);
                }
        }, [userSubscription]);

        // Hook para pedidos aguardando envio
        const { pendingCount } = usePendingOrders();
        const { toast, presets, setFilterConfig, getFilterConfig } = useToast();

        // Estado para armazenar os pedidos
        const [orders, setOrders] = useState<any[]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [hasShownPendingToast, setHasShownPendingToast] = useState(false);
        const [showPatientModal, setShowPatientModal] = useState(false);

        // Buscar estatísticas do dashboard usando a API existente
        const { data: dashboardStats, isLoading: statsLoading } =
                useQuery<DashboardStats>({
                        queryKey: ["/api/reports/stats"],
                        enabled: !!user,
                });

        // Buscar estatísticas da home (cirurgias hoje e pedidos aguardando)
        const { data: homeStats, isLoading: homeStatsLoading } =
                useQuery<HomeStats>({
                        queryKey: ["/api/home/stats"],
                        enabled: !!user,
                });

        // Buscar distribuição de pedidos por status
        const { data: statusDistribution, isLoading: statusDistributionLoading, error: statusDistributionError } = useQuery<StatusDistribution[]>({
                queryKey: ["/api/orders/status-distribution"],
                enabled: !!user,
        });


        // Query para buscar próximas cirurgias agendadas
        const { data: upcomingSurgeries, isLoading: surgeriesLoading } =
                useQuery<any[]>({
                        queryKey: ["/api/surgery-appointments/upcoming"],
                        enabled: !!user,
                });

        // Buscar pedidos diretamente com fetch
        useEffect(() => {
                if (user) {
                        const fetchOrders = async () => {
                                try {
                                        setIsLoading(true);
                                        // Para garantir que estamos usando dados reais, consulte diretamente o banco de dados
                                        const result = await fetch(
                                                `/api/medical-orders?userId=${user.id}`,
                                        );
                                        if (result.ok) {
                                                const data =
                                                        await result.json();
                                                console.log(
                                                        "Pedidos carregados:",
                                                        data,
                                                );
                                                setOrders(
                                                        Array.isArray(data)
                                                                ? data
                                                                : [],
                                                );
                                        } else {
                                                console.error(
                                                        "Erro ao buscar pedidos:",
                                                        await result.text(),
                                                );
                                                setOrders([]);
                                        }
                                } catch (error) {
                                        console.error(
                                                "Erro ao buscar pedidos:",
                                                error,
                                        );
                                        setOrders([]);
                                } finally {
                                        setIsLoading(false);
                                }
                        };

                        fetchOrders();
                }
        }, [user]);

        // Toast para pedidos aguardando envio
        useEffect(() => {
                if (pendingCount > 0 && !hasShownPendingToast && user) {
                        toast({
                                title: "Pedidos Aguardando Envio",
                                description: `Você tem ${pendingCount} ${pendingCount === 1 ? "pedido aguardando" : "pedidos aguardando"} envio. Clique no ícone na barra superior para visualizar.`,
                                duration: 6000, // 6 segundos
                        });
                        setHasShownPendingToast(true);
                }
        }, [pendingCount, hasShownPendingToast, user, toast]);

        // Contar todos os pedidos
        const orderCount = orders.length;

        // Contar pedidos autorizados (aceito e autorizado_parcial)
        const authorizedOrdersCount = orders.filter(
                (order) =>
                        order.status === "aceito" ||
                        order.status === "autorizado_parcial",
        ).length;

        // Atualizar traduções quando o idioma mudar
        useEffect(() => {
                const handleLanguageChange = () => {
                        // Obter o idioma atual
                        const lang = document.documentElement.lang || "pt-BR";
                        setLabels(
                                translations[
                                        lang as keyof typeof translations
                                ] || translations["pt-BR"],
                        );
                };

                // Inicializar
                handleLanguageChange();

                // Adicionar listener para mudanças de idioma
                window.addEventListener("languageChange", handleLanguageChange);

                // Cleanup
                return () => {
                        window.removeEventListener(
                                "languageChange",
                                handleLanguageChange,
                        );
                };
        }, []);

        const handleCreateOrder = useCallback(() => {
                navigate("/create-order");
        }, [navigate]);

        // Hook para onboarding tours
        const { startTour, isRunning } = useOnboarding();

        // Lista de tours disponíveis
        const availableTours = [
                {
                        id: 'dashboard-tour',
                        name: 'Conhecer o Dashboard',
                        description: 'Entenda todos os cards e botões do painel principal',
                        icon: BarChart,
                        path: undefined,
                },
                {
                        id: 'create-order-tour',
                        name: 'Criar Novo Pedido',
                        description: 'Aprenda a criar um pedido cirúrgico em 5 etapas',
                        icon: FileText,
                        path: '/create-order',
                },
                {
                        id: 'patients-tour',
                        name: 'Cadastrar Paciente',
                        description: 'Aprenda a cadastrar e gerenciar pacientes',
                        icon: Users,
                        path: '/patients',
                },
                {
                        id: 'profile-tour',
                        name: 'Editar Perfil',
                        description: 'Aprenda a configurar seu perfil, logo e assinatura',
                        icon: UserCircle,
                        path: '/profile',
                },
        ];

        const handleStartTour = (tourId: string, path?: string) => {
                if (path) {
                        navigate(path);
                        // Pequeno delay para garantir que a página carregou
                        setTimeout(() => {
                                startTour(tourId);
                        }, 500);
                } else {
                        startTour(tourId);
                }
        };

        return (
                <div className="min-h-screen flex flex-col bg-muted">
                        <LgpdModal />

                        {/* Banner de pagamento em atraso (past_due) - Nível 1 */}
                        {showPastDueBanner && (
                                <PastDueBanner 
                                        daysOverdue={pastDueDays}
                                        onDismiss={() => setShowPastDueBanner(false)}
                                />
                        )}

                        <main className="flex-grow bg-muted/30 overflow-visible">
                                <div className="container mx-auto px-4 py-4 max-w-8xl overflow-visible">
                                        {/* Cabeçalho do Dashboard */}
                                        <div className="mb-8 overflow-visible">
                                                <div 
                                                        className="relative flex flex-col lg:flex-row items-center justify-between mb-8 rounded-xl overflow-visible bg-cover bg-center min-h-[150px] md:min-h-[225px] lg:min-h-[300px]"
                                                        style={{
                                                                backgroundImage: `url(${CentroCirurgicoImage})`,
                                                                backgroundBlendMode: 'overlay'
                                                        }}
                                                >
                                                        {/* Botão de Tours - Posicionado no canto superior direito */}
                                                        {user?.roleId === 2 && (
                                                                <div className="absolute top-4 right-4 z-10">
                                                                        <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                        <button
                                                                                                className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-[#2ca8e0] rounded-lg shadow-md transition-all duration-200 font-medium"
                                                                                                disabled={isRunning}
                                                                                                data-testid="button-tours-menu"
                                                                                        >
                                                                                                <BookOpen className="h-4 w-4" />
                                                                                                Tours de Ajuda
                                                                                        </button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end" className="w-64">
                                                                                        <DropdownMenuLabel className="flex items-center gap-2">
                                                                                                <HelpCircle className="h-4 w-4 text-[#2ca8e0]" />
                                                                                                Escolha um tour
                                                                                        </DropdownMenuLabel>
                                                                                        <DropdownMenuSeparator />
                                                                                        {availableTours.map((tour) => (
                                                                                                <DropdownMenuItem
                                                                                                        key={tour.id}
                                                                                                        onClick={() => handleStartTour(tour.id, tour.path)}
                                                                                                        className="flex flex-col items-start gap-1 cursor-pointer py-3"
                                                                                                        data-testid={`tour-option-${tour.id}`}
                                                                                                >
                                                                                                        <div className="flex items-center gap-2 font-medium">
                                                                                                                <tour.icon className="h-4 w-4 text-[#2ca8e0]" />
                                                                                                                {tour.name}
                                                                                                        </div>
                                                                                                        <span className="text-xs text-muted-foreground pl-6">
                                                                                                                {tour.description}
                                                                                                        </span>
                                                                                                </DropdownMenuItem>
                                                                                        ))}
                                                                                </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                </div>
                                                        )}
                                                        <div className="flex flex-col p-6 lg:p-10 text-center lg:text-left">
                                                                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                                                                        Olá
                                                                        Dr(a).{" "}
                                                                        {user?.name ||
                                                                                "Usuário"}
                                                                        !
                                                                </h1>
                                                                <div className="text-lg text-white/80 font-semibold">
                                                                        {homeStatsLoading ? (
                                                                                <p>
                                                                                        Carregando
                                                                                        informações
                                                                                        do
                                                                                        dia...
                                                                                </p>
                                                                        ) : (
                                                                                <>
                                                                                        <p>
                                                                                                Você
                                                                                                tem{" "}
                                                                                                <span className="font-bold">
                                                                                                        {pendingCount ||
                                                                                                                0}
                                                                                                </span>{" "}
                                                                                                {pendingCount ===
                                                                                                1
                                                                                                        ? "pedido aguardando"
                                                                                                        : "pedidos aguardando"}{" "}
                                                                                                envio,
                                                                                        </p>
                                                                                        <p>
                                                                                                e{" "}
                                                                                                <span className="font-bold">
                                                                                                        {homeStats?.pendingSchedulingCount ||
                                                                                                                0}
                                                                                                </span>{" "}
                                                                                                {homeStats?.pendingSchedulingCount ===
                                                                                                1
                                                                                                        ? "pedido aguardando"
                                                                                                        : "pedidos aguardando"}{" "}
                                                                                                agendamento.
                                                                                        </p>
                                                                                </>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>

                                                {/* Layout Principal: 2 colunas */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                                        {/* Coluna Esquerda: Cards + Gráfico */}
                                                        <div className="flex flex-col gap-6">
                                                                {/* Cards de Estatísticas */}
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                {/* Total de Pedidos - Clicável */}
                                                                <Card 
                                                                        className="dashboard-card-interactive"
                                                                        onClick={() => navigate("/orders")}
                                                                        data-testid="card-pedidos-cadastrados"
                                                                >
                                                                        <CardContent className="card-content-padding">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p className="metric-value">
                                                                                                {isLoading
                                                                                                        ? "..."
                                                                                                        : orderCount}
                                                                                        </p>
                                                                                        <div className="metric-label">
                                                                                                <p>
                                                                                                        Pedidos
                                                                                                </p>
                                                                                                <p>
                                                                                                        Cadastrados
                                                                                                </p>
                                                                                        </div>
                                                                                        <div className="text-sm text-muted-foreground mt-2 opacity-70">
                                                                                                Clique para ver todos
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Pedidos Aguardando Envio - Clicável */}
                                                                <Card 
                                                                        className="dashboard-card-interactive"
                                                                        onClick={() => navigate("/orders?statusId=8")}
                                                                        data-testid="card-pedidos-aguardando-envio"
                                                                >
                                                                        <CardContent className="card-content-padding">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={(pendingCount || 0) > 0 ? "metric-value-alert" : "metric-value"}
                                                                                        >
                                                                                                {pendingCount ||
                                                                                                        0}
                                                                                        </p>
                                                                                        <div className="metric-label">
                                                                                                <p>
                                                                                                        Aguardando
                                                                                                </p>
                                                                                                <p>
                                                                                                        Envio
                                                                                                </p>
                                                                                        </div>
                                                                                        <div className="text-sm text-muted-foreground mt-2 opacity-70">
                                                                                                Clique para filtrar
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Aguardando Agendamento - Clicável */}
                                                                <Card 
                                                                        className="dashboard-card-interactive"
                                                                        onClick={() => navigate("/orders?needsScheduling=1")}
                                                                        data-testid="card-pedidos-aguardando-agendamento"
                                                                >
                                                                        <CardContent className="card-content-padding">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={(homeStats?.pendingSchedulingCount || 0) > 0 ? "metric-value-alert" : "metric-value"}
                                                                                        >
                                                                                                {homeStatsLoading
                                                                                                        ? "..."
                                                                                                        : homeStats?.pendingSchedulingCount ||
                                                                                                          0}
                                                                                        </p>
                                                                                        <div className="metric-label">
                                                                                                <p>
                                                                                                        Aguardando
                                                                                                </p>
                                                                                                <p>
                                                                                                        Agendamento
                                                                                                </p>
                                                                                        </div>
                                                                                        <div className="text-sm text-muted-foreground mt-2 opacity-70">
                                                                                                Clique para filtrar
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Pedidos Autorizados - Clicável */}
                                                                <Card 
                                                                        className="dashboard-card-interactive"
                                                                        onClick={() => navigate("/orders?authorized=1")}
                                                                        data-testid="card-pedidos-autorizados"
                                                                >
                                                                        <CardContent className="card-content-padding">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p className="metric-value">
                                                                                                {isLoading
                                                                                                        ? "..."
                                                                                                        : authorizedOrdersCount}
                                                                                        </p>
                                                                                        <p className="metric-label">
                                                                                                Autorizados
                                                                                        </p>
                                                                                        <div className="text-sm text-muted-foreground mt-2 opacity-70">
                                                                                                Clique para filtrar
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Pedidos com Pendências - Clicável */}
                                                                <Card 
                                                                        className="dashboard-card-interactive"
                                                                        onClick={() => navigate("/orders?statusId=5")}
                                                                        data-testid="card-pedidos-pendencias"
                                                                >
                                                                        <CardContent className="card-content-padding">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={(orders.filter((order) => order.status === "pendencia").length || 0) > 0 ? "metric-value-alert" : "metric-value"}
                                                                                        >
                                                                                                {isLoading
                                                                                                        ? "..."
                                                                                                        : orders.filter(
                                                                                                                  (
                                                                                                                          order,
                                                                                                                  ) =>
                                                                                                                          order.status ===
                                                                                                                          "pendencia",
                                                                                                          )
                                                                                                                  .length}
                                                                                        </p>
                                                                                        <p className="metric-label">
                                                                                                Pendências
                                                                                        </p>
                                                                                        <div className="text-sm text-muted-foreground mt-2 opacity-70">
                                                                                                Clique para filtrar
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Aguardando Recurso - Clicável */}
                                                                <Card 
                                                                        className="dashboard-card-interactive"
                                                                        onClick={() => navigate("/orders?statusId=10")}
                                                                        data-testid="card-pedidos-aguardando-recurso"
                                                                >
                                                                        <CardContent className="card-content-padding">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={(orders.filter((order) => order.status === "aguardando_recurso").length || 0) > 0 ? "metric-value-alert" : "metric-value"}
                                                                                        >
                                                                                                {isLoading
                                                                                                        ? "..."
                                                                                                        : orders.filter(
                                                                                                                  (
                                                                                                                          order,
                                                                                                                  ) =>
                                                                                                                          order.status ===
                                                                                                                          "aguardando_recurso",
                                                                                                          )
                                                                                                                  .length}
                                                                                        </p>
                                                                                        <div className="metric-label">
                                                                                                <p>
                                                                                                        Aguardando
                                                                                                </p>
                                                                                                <p>
                                                                                                        Recurso
                                                                                                </p>
                                                                                        </div>
                                                                                        <div className="text-sm text-muted-foreground mt-2 opacity-70">
                                                                                                Clique para filtrar
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* CARD PARA ADICIONAR MAIS ALGUMA INFORMACAO UTIL E EQUALIZAR TAMANHO DOS CARDS */}
                                                                <div className="lg:col-span-3 py-3 px-6">
                                                                        <div className="flex flex-col sm:flex-row gap-3 w-full h-full">
                                                                                                <button
                                                                                                        onClick={() =>
                                                                                                                (window.location.href =
                                                                                                                        "/create-order")
                                                                                                        }
                                                                                                        className="btn-medsync-light flex items-center justify-center gap-2 flex-1"
                                                                                                        data-testid="button-novo-pedido"
                                                                                                >
                                                                                                        <PlusCircle
                                                                                                                size={
                                                                                                                        16
                                                                                                                }
                                                                                                        />
                                                                                                        Novo
                                                                                                        Pedido
                                                                                                </button>
                                                                                                <button
                                                                                                        onClick={() => setShowPatientModal(true)}
                                                                                                        className="btn-medsync-light flex items-center justify-center gap-2 flex-1"
                                                                                                        data-testid="button-novo-paciente"
                                                                                                >
                                                                                                        <Users
                                                                                                                size={
                                                                                                                        16
                                                                                                                }
                                                                                                        />
                                                                                                        Novo
                                                                                                        Paciente
                                                                                                </button>
                                                                        </div>
                                                                </div>
                                                                </div>
                                                                
                                                                {/* Card de Distribuição por Status - Coluna esquerda */}
                                                                <Card className="dashboard-card-static" data-testid="card-distribuicao-status">
                                                        <CardHeader className="pb-3">
                                                                <CardTitle className="flex items-center text-foreground font-semibold text-lg">
                                                                        <TrendingUp className="h-5 w-5 text-muted-foreground mr-2" />
                                                                        Distribuição de Pedidos por Status
                                                                </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                                {statusDistributionLoading ? (
                                                                        <div className="text-center py-8 text-muted-foreground">
                                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-3"></div>
                                                                                <p className="text-sm">Carregando dados...</p>
                                                                        </div>
                                                                ) : statusDistributionError ? (
                                                                        <div className="text-center py-8 text-red-500">
                                                                                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                                                <p className="text-sm">Erro ao carregar dados do gráfico</p>
                                                                                <p className="text-xs mt-1">{statusDistributionError.message || 'Erro desconhecido'}</p>
                                                                        </div>
                                                                ) : !statusDistribution || statusDistribution.length === 0 ? (
                                                                        <div className="text-center py-8 text-muted-foreground">
                                                                                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                                                <p className="text-sm">Nenhum pedido encontrado</p>
                                                                        </div>
                                                                ) : (
                                                                        <div className="flex items-start gap-48">
                                                                                <div className="w-80 h-80 flex items-center justify-center">
                                                                                        <PieChart width={320} height={320}>
                                                                                                <Pie
                                                                                                        data={statusDistribution.filter(item => item.count > 0)}
                                                                                                        cx="50%"
                                                                                                        cy="50%"
                                                                                                        labelLine={false}
                                                                                                        label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                                                                                                        innerRadius={60}
                                                                                                        outerRadius={120}
                                                                                                        fill="#8884d8"
                                                                                                        dataKey="count"
                                                                                                        nameKey="name"
                                                                                                >
                                                                                                        {statusDistribution.filter(item => item.count > 0).map((entry, index) => {
                                                                                                                const medsyncColors = [
                                                                                                                        '#2ca8e0', '#36a9e1', '#124a6b', '#6e6f70', '#5bc0de',
                                                                                                                        '#17a2b8', '#007bff', '#6c757d', '#20c997', '#17a2b8'
                                                                                                                ];
                                                                                                                const color = medsyncColors[index % medsyncColors.length];
                                                                                                                return <Cell key={`cell-${index}`} fill={color} />;
                                                                                                        })}
                                                                                                </Pie>
                                                                                                <Tooltip 
                                                                                                        formatter={(value) => [value, 'Quantidade']}
                                                                                                        labelFormatter={(label) => `${label}`}
                                                                                                />
                                                                                        </PieChart>
                                                                                </div>
                                                                                <div className="flex flex-col gap-3">
                                                                                        {statusDistribution.filter(item => item.count > 0).map((item, index) => {
                                                                                                const medsyncColors = [
                                                                                                        '#2ca8e0', '#36a9e1', '#124a6b', '#6e6f70', '#5bc0de',
                                                                                                        '#17a2b8', '#007bff', '#6c757d', '#20c997', '#17a2b8'
                                                                                                ];
                                                                                                const color = medsyncColors[index % medsyncColors.length];
                                                                                                const total = statusDistribution.filter(i => i.count > 0).reduce((sum, i) => sum + i.count, 0);
                                                                                                const percentage = ((item.count / total) * 100).toFixed(1);
                                                                                                return (
                                                                                                        <div key={index} className="flex items-center justify-between gap-4">
                                                                                                                <div className="flex items-center">
                                                                                                                        <div className="w-4 h-4 rounded mr-3" style={{ backgroundColor: color }}></div>
                                                                                                                        <span className="text-sm font-medium">{item.name}</span>
                                                                                                                </div>
                                                                                                                <span className="text-sm font-bold text-[hsl(var(--medsync-dark-blue))]">{percentage}%</span>
                                                                                                        </div>
                                                                                                );
                                                                                        })}
                                                                                </div>
                                                                        </div>
                                                                )}
                                                        </CardContent>
                                                        <CardFooter className="pt-4">
                                                                <Button 
                                                                        onClick={() => navigate('/reports')}
                                                                        className="w-full bg-medsync-blue hover:bg-medsync-blue-dark text-white transition-colors duration-200"
                                                                >
                                                                        <BarChart className="h-4 w-4 mr-2" />
                                                                        {t("home.reports.button")}
                                                                </Button>
                                                        </CardFooter>
                                                </Card>
                                                </div>

                                                {/* Coluna Direita: Agenda Cirúrgica */}
                                                <div className="flex flex-col">
                                                <Card className="dashboard-card-static h-full flex flex-col" data-testid="card-agenda-cirurgica">
                                                        <CardHeader className="pb-3">
                                                                <CardTitle className="section-title">
                                                                        <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
                                                                        Agenda Cirúrgica
                                                                </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-3 flex-1">
                                                                {surgeriesLoading ? (
                                                                        <div className="text-center py-8 text-muted-foreground">
                                                                                <Clock className="h-8 w-8 mx-auto mb-3 animate-spin" />
                                                                                <p className="text-sm">Carregando agenda...</p>
                                                                        </div>
                                                                ) : !upcomingSurgeries || upcomingSurgeries.length === 0 ? (
                                                                        <div className="text-center py-8 text-muted-foreground">
                                                                                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                                                <p className="text-sm">Nenhuma cirurgia agendada</p>
                                                                        </div>
                                                                ) : (
                                                                        <div className="space-y-3">
                                                                                {upcomingSurgeries.slice(0, 5).map((appointment: any) => (
                                                                                                                        <div
                                                                                                                                key={
                                                                                                                                        appointment.id
                                                                                                                                }
                                                                                                                                className={`grid grid-cols-7 gap-4 px-3 py-2 rounded-lg border-gray-200 border cursor-pointer hover:shadow-md transition-all duration-200 ${
                                                                                                                                        new Date(
                                                                                                                                                appointment.scheduledDate,
                                                                                                                                        ).toDateString() ===
                                                                                                                                        new Date().toDateString()
                                                                                                                                                ? "bg-green-50 hover:bg-green-100"
                                                                                                                                                : "bg-muted/50 hover:bg-accent/10"
                                                                                                                                }`}
                                                                                                                                onClick={() => appointment.medicalOrderId && navigate(`/order/${appointment.medicalOrderId}`)}
                                                                                                                                onKeyDown={(e) => {
                                                                                                                                        if ((e.key === 'Enter' || e.key === ' ') && appointment.medicalOrderId) {
                                                                                                                                                e.preventDefault();
                                                                                                                                                navigate(`/order/${appointment.medicalOrderId}`);
                                                                                                                                        }
                                                                                                                                }}
                                                                                                                                role="button"
                                                                                                                                tabIndex={0}
                                                                                                                                aria-label={`Ver detalhes do pedido de ${appointment.patientName || 'paciente'} - ${appointment.surgicalProcedureName || 'cirurgia'} agendada para ${appointment.scheduledDate ? new Date(appointment.scheduledDate).toLocaleDateString('pt-BR') : 'data não informada'}`}
                                                                                                                                data-testid={`surgery-card-${appointment.medicalOrderId}`}
                                                                                                                        >
                                                                                                                                {/* Coluna 1-3: Nome do Paciente e Procedimentos */}
                                                                                                                                <div className="col-span-3 flex flex-col">
                                                                                                                                        <span className="font-semibold text-sm">
                                                                                                                                                {appointment.patientName ||
                                                                                                                                                        "Paciente não encontrado"}
                                                                                                                                        </span>
                                                                                                                                        {(appointment.surgicalProcedureName ||
                                                                                                                                                appointment.surgicalApproachName) && (
                                                                                                                                                <div className="mb-2 text-xs text-primary-foreground font-bold dtext-gray-600">
                                                                                                                                                        {appointment.surgicalProcedureName &&
                                                                                                                                                        appointment.surgicalApproachName
                                                                                                                                                                ? `${appointment.surgicalProcedureName} - ${appointment.surgicalApproachName}`
                                                                                                                                                                : appointment.surgicalProcedureName ||
                                                                                                                                                                  appointment.surgicalApproachName}
                                                                                                                                                </div>
                                                                                                                                        )}
                                                                                                                                </div>

                                                                                                                                {/* Coluna 4-6: Data e Hora */}
                                                                                                                                <div className="col-span-3 flex flex-col items-center justify-center">
                                                                                                                                        <div className="flex items-center gap-2 font-semibold text-md">
                                                                                                                                                <Calendar className="h-3 w-3" />
                                                                                                                                                <span>
                                                                                                                                                        {appointment.scheduledDate
                                                                                                                                                                ? new Date(
                                                                                                                                                                          appointment.scheduledDate,
                                                                                                                                                                  ).toLocaleDateString(
                                                                                                                                                                          "pt-BR",
                                                                                                                                                                  )
                                                                                                                                                                : "Data não informada"}
                                                                                                                                                </span>
                                                                                                                                                <span className="mx-1">-</span>
                                                                                                                                                <Clock className="h-3 w-3" />
                                                                                                                                                <span>
                                                                                                                                                        {appointment.scheduledTime ||
                                                                                                                                                                "Horário não informado"}
                                                                                                                                                </span>
                                                                                                                                        </div>
                                                                                                                                </div>

                                                                                                                                {/* Coluna 7: Caráter e Duração */}
                                                                                                                                <div className="col-span-1 flex flex-col items-center">
                                                                                                                                        <div
                                                                                                                                                className={`text-xs px-2 py-1 rounded-full ${
                                                                                                                                                        appointment.procedureType ===
                                                                                                                                                        "eletiva"
                                                                                                                                                                ? "bg-blue-100 text-blue-700"
                                                                                                                                                                : appointment.procedureType ===
                                                                                                                                                                    "urgencia"
                                                                                                                                                                  ? "bg-red-100 text-red-700"
                                                                                                                                                                  : "bg-gray-100 text-gray-700"
                                                                                                                                                }`}
                                                                                                                                        >
                                                                                                                                                {appointment.procedureType ===
                                                                                                                                                "eletiva"
                                                                                                                                                        ? "Eletiva"
                                                                                                                                                        : appointment.procedureType ===
                                                                                                                                                            "urgencia"
                                                                                                                                                          ? "Urgência"
                                                                                                                                                          : appointment.procedureType ||
                                                                                                                                                            "Não definida"}
                                                                                                                                        </div>
                                                                                                                                        {appointment.estimatedDuration && (
                                                                                                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                                                                                                        {
                                                                                                                                                                appointment.estimatedDuration
                                                                                                                                                        }
                                                                                                                                                        min
                                                                                                                                                </div>
                                                                                                                                        )}
                                                                                                                                </div>
                                                                                                                        </div>
                                                                                                                ),
                                                                                                        )}

                                                                                                {upcomingSurgeries.length >
                                                                                                        5 && (
                                                                                                        <div className="text-center pt-2">
                                                                                                                <Button
                                                                                                                        variant="outline"
                                                                                                                        size="sm"
                                                                                                                        onClick={() =>
                                                                                                                                navigate(
                                                                                                                                        "/surgery-appointments",
                                                                                                                                )
                                                                                                                        }
                                                                                                                >
                                                                                                                        Ver
                                                                                                                        todas
                                                                                                                        as
                                                                                                                        cirurgias
                                                                                                                </Button>
                                                                                                        </div>
                                                                                                )}
                                                                                        </div>
                                                                                )}
                                                                        </CardContent>
                                                                </Card>
                                                                </div>
                                                        </div>
                                                </div>
                                        </div>
                        </main>

                        {/* Modal de pagamento/trial expirado */}
                        <TrialExpiredModal 
                                isOpen={showPaymentModal}
                                trialEndDate={userSubscription?.trialEndsAt?.toString()}
                                modalType={paymentModalType}
                                userName={user?.name || user?.username}
                                onLogout={() => logoutMutation.mutate()}
                        />

                        {/* Modal de pagamento em atraso (past_due) */}
                        <PastDueModal
                                isOpen={showPastDueModal}
                                daysOverdue={pastDueDays}
                                userName={user?.name || user?.username}
                                isBlocking={isPastDueBlocking}
                                onClose={() => setShowPastDueModal(false)}
                                onLogout={() => logoutMutation.mutate()}
                        />

                        {/* Modal de cadastro de paciente */}
                        <PatientFormDialog
                                open={showPatientModal}
                                onOpenChange={setShowPatientModal}
                        />
                </div>
        );
}
