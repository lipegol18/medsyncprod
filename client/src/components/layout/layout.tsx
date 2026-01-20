import { ReactNode } from "react";
import { Header } from "./header";
import { useTheme } from "@/components/theme-provider";
import { ExternalLink, Shield } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { Link } from "wouter";
import medsyncLogo from "@/assets/medsync-logo-new.svg";

interface LayoutProps {
  children: ReactNode;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export function Layout({ children, includeHeader = false, includeFooter = true }: LayoutProps) {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col">
      {includeHeader && <Header />}
      <main className="flex-grow">
        {children}
      </main>
      {includeFooter && (
        <footer className="border-t bg-gradient-to-r from-[#124a6b] to-[#2ca8e0] text-white py-8 px-6">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              <div className="flex flex-col items-center md:items-start gap-3">
                <img 
                  src={medsyncLogo} 
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
                    data-testid="link-lgpd-rights"
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
                    href="https://www.instagram.com/medsync.brasil/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <SiInstagram className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/20 text-center text-sm text-white/60">
              &copy; {new Date().getFullYear()} MedSync. Todos os direitos reservados.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}