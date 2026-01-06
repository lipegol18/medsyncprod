import { ReactNode } from "react";
import { Header } from "./header";
import { useTheme } from "@/components/theme-provider";
import { ExternalLink } from "lucide-react";

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
        <footer className="border-t bg-muted/30 py-4 px-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} MedSync. Todos os direitos reservados.</span>
            <a
              href="https://lgpd.somaxi.com.br/formulario/cliente-1765997299970-mo7tsrwb9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
              data-testid="link-lgpd-rights"
            >
              Direitos do Titular LGPD
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}