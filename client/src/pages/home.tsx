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
} from "lucide-react";

import { addTranslations } from "@/lib/i18n";
import NovoPedidoIcon from "@/assets/icons/novo-pedido-icon.svg";
import PedidosIcon from "@/assets/icons/pedidos-icon.svg";
import PacienteIcon from "@/assets/icons/paciente-icon.svg";
import AvatarCroped from "@/assets/Avatar_croped.png";
import { TrialExpiredModal } from "@/components/trial/trial-expired-modal";

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
        const { user } = useAuth();

        // Estado para modal de trial expirado
        const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

        // Verificar se o usuário é administrador
        const isAdmin = user?.roleId === 1;

        // Verificar status do trial do usuário
        useEffect(() => {
                if (user && user.trialStatus === 'active' && user.trialEndDate) {
                        const now = new Date();
                        const trialEndDate = new Date(user.trialEndDate);
                        
                        if (now > trialEndDate) {
                                // Trial expirou - mostrar modal
                                setShowTrialExpiredModal(true);
                        }
                }
        }, [user]);

        // Hook para pedidos aguardando envio
        const { pendingCount } = usePendingOrders();
        const { toast } = useToast();

        // Estado para armazenar os pedidos
        const [orders, setOrders] = useState<any[]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [hasShownPendingToast, setHasShownPendingToast] = useState(false);

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

        return (
                <div className="min-h-screen flex flex-col bg-muted">
                        <LgpdModal />

                        <main className="flex-grow bg-muted/30 overflow-visible">
                                <div className="container mx-auto px-4 py-6 max-w-8xl overflow-visible">
                                        {/* Cabeçalho do Dashboard */}
                                        <div className="mb-8 overflow-visible">
                                                <div className="relative flex flex-col lg:flex-row items-center justify-between mb-8 rounded-xl bg-gradient-to-r from-blue-400 to-blue-200 overflow-visible">
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
                                                        <div className="flex-shrink-0 relative mr-0 lg:mr-48 mt-4 lg:mt-0">
                                                                <img
                                                                        src={
                                                                                AvatarCroped
                                                                        }
                                                                        alt="Avatar do médico"
                                                                        className="w-32 h-32 lg:w-56 lg:h-56 object-contain -mt-6 lg:-mt-12"
                                                                />
                                                        </div>
                                                </div>

                                                {/* Cards de Estatísticas */}
                                                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-8">
                                                        {/* Coluna esquerda - 3 cards pequenos */}
                                                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                {/* Total de Pedidos */}
                                                                <Card className="border-gray-200 bg-card shadow-sm">
                                                                        <CardContent className="p-6">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p className="text-5xl font-bold text-medsync-blue">
                                                                                                {isLoading
                                                                                                        ? "..."
                                                                                                        : orderCount}
                                                                                        </p>
                                                                                        <div className="text-xl font-bold text-muted-foreground mt-2 text-center">
                                                                                                <p>
                                                                                                        Pedidos
                                                                                                </p>
                                                                                                <p>
                                                                                                        Cadastrados
                                                                                                </p>
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Pedidos Aguardando Envio */}
                                                                <Card className="border-gray-200 bg-card shadow-sm">
                                                                        <CardContent className="p-6">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={`text-5xl font-bold ${(pendingCount || 0) > 0 ? "text-red-600" : "text-medsync-blue"}`}
                                                                                        >
                                                                                                {pendingCount ||
                                                                                                        0}
                                                                                        </p>
                                                                                        <div className="text-xl font-bold text-muted-foreground mt-2 text-center">
                                                                                                <p>
                                                                                                        Aguardando
                                                                                                </p>
                                                                                                <p>
                                                                                                        Envio
                                                                                                </p>
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Aguardando Agendamento */}
                                                                <Card className="border-gray-200 bg-card shadow-sm">
                                                                        <CardContent className="p-6">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={`text-5xl font-bold ${(homeStats?.pendingSchedulingCount || 0) > 0 ? "text-red-600" : "text-medsync-blue"}`}
                                                                                        >
                                                                                                {homeStatsLoading
                                                                                                        ? "..."
                                                                                                        : homeStats?.pendingSchedulingCount ||
                                                                                                          0}
                                                                                        </p>
                                                                                        <div className="text-xl font-bold text-muted-foreground mt-2 text-center">
                                                                                                <p>
                                                                                                        Aguardando
                                                                                                </p>
                                                                                                <p>
                                                                                                        Agendamento
                                                                                                </p>
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Pedidos Autorizados - Segunda linha */}
                                                                <Card className="border-gray-200 bg-card shadow-sm">
                                                                        <CardContent className="p-6">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p className="text-5xl font-bold text-medsync-blue">
                                                                                                {isLoading
                                                                                                        ? "..."
                                                                                                        : authorizedOrdersCount}
                                                                                        </p>
                                                                                        <p className="text-xl font-bold text-muted-foreground mt-2">
                                                                                                Autorizados
                                                                                        </p>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Pedidos com Pendências - Segunda linha */}
                                                                <Card className="border-gray-200 bg-card shadow-sm">
                                                                        <CardContent className="p-6">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={`text-5xl font-bold ${(orders.filter((order) => order.status === "pendencia").length || 0) > 0 ? "text-red-600" : "text-medsync-blue"}`}
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
                                                                                        <p className="text-xl font-bold text-muted-foreground mt-2">
                                                                                                Pendências
                                                                                        </p>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* Aguardando Recurso - Segunda linha */}
                                                                <Card className="border-gray-200 bg-card shadow-sm">
                                                                        <CardContent className="p-6">
                                                                                <div className="flex flex-col items-center justify-center">
                                                                                        <p
                                                                                                className={`text-5xl font-bold ${(orders.filter((order) => order.status === "aguardando_recurso").length || 0) > 0 ? "text-red-600" : "text-medsync-blue"}`}
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
                                                                                        <div className="text-xl font-bold text-muted-foreground mt-2 text-center">
                                                                                                <p>
                                                                                                        Aguardando
                                                                                                </p>
                                                                                                <p>
                                                                                                        Recurso
                                                                                                </p>
                                                                                        </div>
                                                                                </div>
                                                                        </CardContent>
                                                                </Card>

                                                                {/* CARD PARA ADICIONAR MAIS ALGUMA INFORMACAO UTIL E EQUALIZAR TAMANHO DOS CARDS */}
                                                                <div className="lg:col-span-3 py-3 px-6">
                                                                        <div className="flex flex-col sm:flex-row gap-3 w-full h-full">
                                                                                                <Button
                                                                                                        onClick={() =>
                                                                                                                (window.location.href =
                                                                                                                        "/create-order")
                                                                                                        }
                                                                                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 px-4 w-full bg-medsync-blue hover:bg-sky-700 text-white font-semibold py-3 h-12 text-base transition-all duration-200 flex-1 shadow-lg"
                                                                                                >
                                                                                                        <PlusCircle
                                                                                                                size={
                                                                                                                        16
                                                                                                                }
                                                                                                        />
                                                                                                        Novo
                                                                                                        Pedido
                                                                                                </Button>
                                                                                                <Button
                                                                                                        onClick={() =>
                                                                                                                (window.location.href =
                                                                                                                        "/patients")
                                                                                                        }
                                                                                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 px-4 w-full bg-medsync-blue hover:bg-sky-700 text-white font-semibold py-3 h-12 text-base transition-all duration-200 flex-1 shadow-lg"
                                                                                                >
                                                                                                        <Users
                                                                                                                size={
                                                                                                                        16
                                                                                                                }
                                                                                                        />
                                                                                                        Novo
                                                                                                        Paciente
                                                                                                </Button>
                                                                        </div>
                                                                </div>
                                                        </div>

                                                        {/* Agenda Cirúrgica */}
                                                        <div className="lg:col-span-3">
                                                                <Card className="border-gray-200 bg-card shadow-sm h-full">
                                                                        <CardHeader className="pb-3">
                                                                                <CardTitle className="flex items-center text-foreground font-semibold text-lg">
                                                                                        <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
                                                                                        Agenda
                                                                                        Cirúrgica
                                                                                </CardTitle>
                                                                        </CardHeader>
                                                                        <CardContent className="space-y-3">
                                                                                {surgeriesLoading ? (
                                                                                        <div className="text-center py-8 text-muted-foreground">
                                                                                                <Clock className="h-8 w-8 mx-auto mb-3 animate-spin" />
                                                                                                <p className="text-sm">
                                                                                                        Carregando
                                                                                                        agenda...
                                                                                                </p>
                                                                                        </div>
                                                                                ) : !upcomingSurgeries ||
                                                                                  upcomingSurgeries.length ===
                                                                                          0 ? (
                                                                                        <div className="text-center py-8 text-muted-foreground">
                                                                                                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                                                                <p className="text-sm">
                                                                                                        Nenhuma
                                                                                                        cirurgia
                                                                                                        agendada
                                                                                                </p>
                                                                                        </div>
                                                                                ) : (
                                                                                        <div className="space-y-3">
                                                                                                {upcomingSurgeries
                                                                                                        .slice(
                                                                                                                0,
                                                                                                                5,
                                                                                                        )
                                                                                                        .map(
                                                                                                                (
                                                                                                                        appointment: any,
                                                                                                                ) => (
                                                                                                                        <div
                                                                                                                                key={
                                                                                                                                        appointment.id
                                                                                                                                }
                                                                                                                                className={`grid grid-cols-7 gap-4 px-3 py-2 rounded-lg border-gray-200 border ${
                                                                                                                                        new Date(
                                                                                                                                                appointment.scheduledDate,
                                                                                                                                        ).toDateString() ===
                                                                                                                                        new Date().toDateString()
                                                                                                                                                ? "bg-green-50"
                                                                                                                                                : "bg-muted/50"
                                                                                                                                }`}
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

                                        {/* Card de Distribuição por Status */}
                                        <div className="w-full">
                                                <Card className="border-gray-200 bg-card shadow-sm">
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
                                                                        <div className="h-96 flex items-center">
                                                                                <div className="flex-1 flex justify-center items-center">
                                                                                        <PieChart width={600} height={600}>
                                                                                                <Pie
                                                                                                        data={statusDistribution.filter(item => item.count > 0)}
                                                                                                        cx={300}
                                                                                                        cy={300}
                                                                                                        labelLine={false}
                                                                                                        innerRadius={80}
                                                                                                        outerRadius={160}
                                                                                                        fill="#8884d8"
                                                                                                        dataKey="count"
                                                                                                        nameKey="name"
                                                                                                >
                                                                                                        {statusDistribution.filter(item => item.count > 0).map((entry, index) => {
                                                                                                                // Cores vibrantes personalizadas
                                                                                                                const vibrantColors = [
                                                                                                                        '#FF6B6B', // Vermelho vibrante
                                                                                                                        '#4ECDC4', // Turquesa
                                                                                                                        '#45B7D1', // Azul vibrante
                                                                                                                        '#96CEB4', // Verde menta
                                                                                                                        '#FFEAA7', // Amarelo suave
                                                                                                                        '#DDA0DD', // Roxo suave
                                                                                                                        '#98D8C8', // Verde água
                                                                                                                        '#F7DC6F', // Amarelo dourado
                                                                                                                        '#BB8FCE', // Lavanda
                                                                                                                        '#85C1E9'  // Azul claro
                                                                                                                ];
                                                                                                                const color = vibrantColors[index % vibrantColors.length];
                                                                                                                return <Cell key={`cell-${index}`} fill={color} />;
                                                                                                        })}
                                                                                                </Pie>
                                                                                                <Tooltip 
                                                                                                        formatter={(value) => [value, 'Quantidade']}
                                                                                                        labelFormatter={(label) => `${label}`}
                                                                                                />
                                                                                        </PieChart>
                                                                                </div>
                                                                                <div className="flex-1 pl-6">
                                                                                        <div className="space-y-3">
                                                                                                {statusDistribution.filter(item => item.count > 0).map((item, index) => {
                                                                                                        // Mesmas cores vibrantes da legenda
                                                                                                        const vibrantColors = [
                                                                                                                '#FF6B6B', // Vermelho vibrante
                                                                                                                '#4ECDC4', // Turquesa
                                                                                                                '#45B7D1', // Azul vibrante
                                                                                                                '#96CEB4', // Verde menta
                                                                                                                '#FFEAA7', // Amarelo suave
                                                                                                                '#DDA0DD', // Roxo suave
                                                                                                                '#98D8C8', // Verde água
                                                                                                                '#F7DC6F', // Amarelo dourado
                                                                                                                '#BB8FCE', // Lavanda
                                                                                                                '#85C1E9'  // Azul claro
                                                                                                        ];
                                                                                                        const color = vibrantColors[index % vibrantColors.length];
                                                                                                        
                                                                                                        return (
                                                                                                                <div key={index} className="flex items-center">
                                                                                                                        <div 
                                                                                                                                className="w-4 h-4 rounded mr-3" 
                                                                                                                                style={{ backgroundColor: color }}
                                                                                                                        ></div>
                                                                                                                        <span className="text-sm font-medium">{item.name}</span>
                                                                                                                        <span className="ml-auto text-sm text-muted-foreground">({item.count})</span>
                                                                                                                </div>
                                                                                                        );
                                                                                                })}
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                )}
                                                        </CardContent>
                                                        <CardFooter className="pt-4">
                                                                <Button 
                                                                        onClick={() => navigate('/reports')}
                                                                        className="w-full bg-sky-600 hover:bg-sky-700 text-white transition-colors duration-200"
                                                                >
                                                                        <BarChart className="h-4 w-4 mr-2" />
                                                                        {t("home.reports.button")}
                                                                </Button>
                                                        </CardFooter>
                                                </Card>
                                        </div>
                                </div>
                        </main>

                        {/* Modal de trial expirado */}
                        <TrialExpiredModal 
                                isOpen={showTrialExpiredModal}
                                trialEndDate={user?.trialEndDate}
                        />
                </div>
        );
}
