import { Link, useLocation } from "wouter";
import { MedicalServices, Notifications, AccountCircle } from "@mui/icons-material";
import { LanguageSwitcher } from "@/components/language-switcher";
import { t, getCurrentLanguage, SupportedLanguage, addTranslations } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, Sun, Moon, Laptop, CheckCircle, Info, AlertCircle, Send } from "lucide-react";
import { Bell, BellRing } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { usePendingOrders } from "@/hooks/use-pending-orders";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminMenu } from "@/components/admin-menu";
// Importar o logo
import MedSyncLogo from "../../assets/medsync-logo-new.png";

interface NavItem {
  name: string;
  path: string;
  translationKey: string;
}

// Traduções do menu principal
const navTranslations = {
  'pt-BR': {
    'nav.newOrder': 'Novo Pedido',
    'nav.orders': 'Meus Pedidos',
    'nav.patients': 'Meus Pacientes',
    'nav.hospitals': 'Hospitais',
    'nav.catalog': 'Catálogo OPME',
    'nav.reports': 'Relatórios',
    'nav.suppliers': 'Fornecedores',
    'nav.users': 'Usuários',
    'nav.roles': 'Perfis de Acesso',
    'nav.admin': 'Administração',
    'nav.profile': 'Meu Perfil',
    'nav.settings': 'Configurações',
    'nav.logout': 'Sair da Conta',
    'nav.myAccount': 'Minha Conta',
  },
  'en-US': {
    'nav.newOrder': 'New Order',
    'nav.orders': 'Surgical Orders',
    'nav.patients': 'My Patients',
    'nav.hospitals': 'Hospitals',
    'nav.catalog': 'OPME Catalog',
    'nav.reports': 'Reports',
    'nav.suppliers': 'Suppliers',
    'nav.users': 'Users',
    'nav.roles': 'Access Profiles',
    'nav.admin': 'Administration',
    'nav.profile': 'My Profile',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.myAccount': 'My Account',
  },
  'es-ES': {
    'nav.orders': 'Pedidos Quirúrgicos',
    'nav.patients': 'Mis Pacientes',
    'nav.hospitals': 'Hospitales',
    'nav.catalog': 'Catálogo OPME',
    'nav.reports': 'Informes',
    'nav.suppliers': 'Proveedores',
    'nav.users': 'Usuarios',
    'nav.roles': 'Perfiles de Acceso',
    'nav.admin': 'Administración',
    'nav.profile': 'Mi Perfil',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar Sesión',
    'nav.myAccount': 'Mi Cuenta',
  }
};

// Adicionar traduções à biblioteca i18n
Object.entries(navTranslations).forEach(([lang, translations]) => {
  addTranslations(lang as SupportedLanguage, translations);
});

// Interface estendida para incluir categoria de menu
interface NavItem {
  name: string;
  path: string;
  translationKey: string;
  category?: string; // 'main' (padrão) ou 'admin'
}

const navItems: NavItem[] = [
  // Menu principal
  { name: "novo-pedido", path: "/create-order", translationKey: 'nav.newOrder', category: 'main' },
  { name: "pedidos", path: "/orders", translationKey: 'nav.orders', category: 'main' },
  { name: "pacientes", path: "/patients", translationKey: 'nav.patients', category: 'main' },
  { name: "agenda-cirurgica", path: "/surgery-appointments", translationKey: 'nav.surgeryAppointments', category: 'main' },
  { name: "relatorios", path: "/reports", translationKey: 'nav.reports', category: 'main' },
  { name: "contato", path: "/contact", translationKey: 'nav.contact', category: 'main' },
  
  // Items que serão agrupados sob "Administração"
  { name: "hospitais", path: "/hospitals", translationKey: 'nav.hospitals', category: 'admin' },
  { name: "catalogo", path: "/opme-catalog", translationKey: 'nav.catalog', category: 'admin' },
  { name: "fornecedores", path: "/suppliers", translationKey: 'nav.suppliers', category: 'admin' },
  { name: "operadoras", path: "/insurance-providers", translationKey: 'nav.insurance_providers', category: 'admin' },
  { name: "usuarios", path: "/users", translationKey: 'nav.users', category: 'admin' },
  { name: "papeis", path: "/roles", translationKey: 'nav.roles', category: 'admin' },
  { name: "mensagens", path: "/admin/contact-messages", translationKey: 'nav.contact_messages', category: 'admin' },
];

export function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage().code);
  const { theme, setTheme } = useTheme();
  
  // Hook de notificações
  const { 
    notifications, 
    unreadCount, 
    isOpen: notificationsOpen,
    toggleNotifications,
    closeNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  
  // Hook de pedidos aguardando envio
  const {
    pendingOrders,
    pendingCount,
    isOpen: pendingOrdersOpen,
    togglePendingOrders,
    closePendingOrders
  } = usePendingOrders();
  
  // Função para lidar com o logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Atualizar os itens do menu quando o idioma mudar
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage().code);
    };
    
    // Inicializar
    handleLanguageChange();
    
    // Adicionar listener para mudanças de idioma
    window.addEventListener('languageChange', handleLanguageChange);
    
    // Remover listener ao desmontar
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  return (
    <header className="bg-blue-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-0.5 flex justify-between items-center min-h-[9rem]">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <img 
              src={MedSyncLogo} 
              alt="MedSync Logo" 
              className="h-36 mr-4" 
            />
          </div>
        </Link>
        
        {/* Navegação principal no centro */}
        <nav className="flex-1 flex justify-center">
          <ul className="flex items-center">
            {navItems
              .filter(item => item.category === 'main' || !item.category)
              .map((item) => (
                <li key={item.name}>
                  <Link href={item.path}>
                    <span className={`py-1 px-3 inline-block whitespace-nowrap cursor-pointer text-white border-b-2 text-sm hover:bg-blue-700 transition-colors ${
                      location === item.path
                        ? "border-white bg-blue-700"
                        : "border-transparent hover:border-blue-400"
                    }`}>
                      {t(item.translationKey)}
                    </span>
                  </Link>
                </li>
            ))}
            
            {/* Menu de Administração */}
            <li>
              <AdminMenu />
            </li>
          </ul>
        </nav>
        
        {/* Ícones à direita */}
        <div className="flex items-center gap-2">
          {/* Componente de notificações */}
          <DropdownMenu open={notificationsOpen} onOpenChange={() => toggleNotifications()}>
            <DropdownMenuTrigger asChild>
              <div className="p-2 text-white hover:text-blue-200 transition-colors relative cursor-pointer hover:bg-blue-700 rounded">
                {unreadCount > 0 ? (
                  <>
                    <BellRing className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-4 min-w-[16px] flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#1a2332] border border-blue-800">
              <DropdownMenuLabel className="flex items-center justify-between font-semibold border-b border-blue-800 py-2 px-4">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllAsRead()}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </DropdownMenuLabel>
              
              {!Array.isArray(notifications) || notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificação.
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    className="p-3 hover:bg-blue-900/30 cursor-pointer" 
                    onClick={() => {
                      if (notification.id) {
                        markAsRead(notification.id);
                      }
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                      closeNotifications();
                    }}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-start gap-2">
                        {notification.type === 'success' && <span className="h-4 w-4 mt-1 text-green-400">✓</span>}
                        {notification.type === 'info' && <span className="h-4 w-4 mt-1 text-blue-400">i</span>}
                        {notification.type === 'warning' && <span className="h-4 w-4 mt-1 text-yellow-400">!</span>}
                        
                        <div className="flex-1">
                          <p className={`font-medium ${notification.read ? 'text-gray-400' : 'text-white'}`}>
                            {notification.message}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        
                        {!notification.read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 mt-2"></span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              
              <DropdownMenuSeparator className="bg-blue-800" />
              <DropdownMenuItem 
                className="p-2 text-center text-blue-400 hover:bg-blue-900/30"
                onClick={() => {
                  markAllAsRead();
                  closeNotifications();
                }}
              >
                Marcar todas como lidas
              </DropdownMenuItem>
              <Link href="/notifications">
                <DropdownMenuItem 
                  className="p-2 text-center hover:bg-blue-900/30"
                  onClick={() => closeNotifications()}
                >
                  <span className="w-full block text-center">
                    Ver todas
                  </span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Badge de pedidos aguardando envio */}
          <DropdownMenu open={pendingOrdersOpen} onOpenChange={() => togglePendingOrders()}>
            <DropdownMenuTrigger asChild>
              <div className="p-2 text-white hover:text-blue-200 transition-colors relative cursor-pointer hover:bg-blue-700 rounded">
                {pendingCount > 0 ? (
                  <>
                    <Send className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs h-4 min-w-[16px] flex items-center justify-center">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </Badge>
                  </>
                ) : (
                  <Send className="h-5 w-5 opacity-50" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-[#1a2332] border border-blue-800">
              <DropdownMenuLabel className="flex items-center justify-between font-semibold border-b border-blue-800 py-2 px-4">
                <span>Aguardando Envio</span>
                <span className="text-orange-400 text-xs">
                  {pendingCount} {pendingCount === 1 ? 'pedido' : 'pedidos'}
                </span>
              </DropdownMenuLabel>
              
              {!Array.isArray(pendingOrders) || pendingOrders.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum pedido aguardando envio.
                </div>
              ) : (
                pendingOrders.slice(0, 5).map((order) => (
                  <DropdownMenuItem 
                    key={order.id}
                    className="p-3 hover:bg-blue-900/30 cursor-pointer" 
                    onClick={() => {
                      window.location.href = `/order/${order.id}`;
                      closePendingOrders();
                    }}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-start gap-2">
                        <Send className="h-4 w-4 mt-1 text-orange-400" />
                        
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            Pedido #{order.id}
                          </p>
                          <p className="text-sm text-gray-300">
                            {order.patientName}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-orange-500 mt-2"></span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              
              <DropdownMenuSeparator className="bg-blue-800" />
              <Link href="/orders?statusId=8">
                <DropdownMenuItem 
                  className="p-2 text-center hover:bg-blue-900/30"
                  onClick={() => closePendingOrders()}
                >
                  <span className="w-full block text-center text-orange-400">
                    Ver todos os pedidos
                  </span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Menu de usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-white hover:text-blue-200 transition-colors focus:outline-none hover:bg-blue-700 rounded">
                <AccountCircle />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1a2332] border-blue-800 shadow-lg">
              {user ? (
                <>
                  <DropdownMenuLabel className="font-normal text-white">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-white">{user.name || user.username}</p>
                      <p className="text-xs leading-none text-blue-300">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-blue-800" />
                  <DropdownMenuItem asChild className="hover:bg-blue-800 focus:bg-blue-800">
                    <Link href="/profile">
                      <div className="flex items-center w-full text-white">
                        <User className="mr-2 h-4 w-4 text-blue-400" />
                        <span>{t('nav.profile')}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-blue-800" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-blue-800 focus:bg-blue-800">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('nav.logout')}</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild className="hover:bg-blue-800 focus:bg-blue-800">
                  <Link href="/auth">
                    <div className="flex items-center w-full text-white">
                      <User className="mr-2 h-4 w-4 text-blue-400" />
                      <span>Login</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}