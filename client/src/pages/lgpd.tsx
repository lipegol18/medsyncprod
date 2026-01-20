import { Layout } from "@/components/layout/layout";
import { Shield, FileText, BookOpen, ScrollText, Cookie, HelpCircle, ExternalLink } from "lucide-react";

export default function LgpdPage() {
  const documentLinks = [
    {
      title: "Política de Privacidade",
      icon: FileText,
      href: "#politica-privacidade",
      description: "Como coletamos, usamos e protegemos seus dados"
    },
    {
      title: "Programa de Privacidade",
      icon: Shield,
      href: "#programa-privacidade",
      description: "Nosso compromisso com a proteção de dados"
    },
    {
      title: "Termos de Uso",
      icon: ScrollText,
      href: "#termos-uso",
      description: "Condições de uso da plataforma MedSync"
    },
    {
      title: "Políticas de Cookies",
      icon: Cookie,
      href: "#politica-cookies",
      description: "Como utilizamos cookies em nosso site"
    },
    {
      title: "Perguntas Frequentes",
      icon: HelpCircle,
      href: "#faq",
      description: "Dúvidas comuns sobre privacidade e LGPD"
    },
  ];

  return (
    <Layout includeHeader={true} includeFooter={true}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 p-8 rounded-xl bg-gradient-to-r from-[#124a6b] to-[#2ca8e0] text-white">
          <div className="flex items-center gap-4">
            <Shield className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold">Privacidade e LGPD</h1>
              <p className="text-white/80 mt-1">Lei Geral de Proteção de Dados Pessoais</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#124a6b]">
              Compromisso com a Proteção dos Seus Dados
            </h2>
            <div className="prose prose-lg text-muted-foreground leading-relaxed">
              <p>
                Na MedSync, a sua privacidade é prioridade. Estamos comprometidos com a 
                transparência no uso das suas informações e em garantir que seus dados 
                pessoais sejam protegidos de acordo com a Lei Geral de Proteção de Dados (LGPD).
              </p>
              <p>
                Nesta página, você encontrará informações sobre como coletamos, utilizamos 
                e armazenamos seus dados, sempre com segurança e respeito.
              </p>
              <p>
                Se precisar de mais detalhes ou quiser exercer seus direitos, estamos 
                à disposição para atender você.
              </p>
            </div>
            
            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Encarregado de Proteção de Dados (DPO)</strong><br />
                E-mail: <a href="mailto:privacidade@medsync.med.br" className="text-muted-foreground hover:underline">privacidade@medsync.med.br</a>
              </p>
            </div>
            
            <a
              href="https://lgpd.somaxi.com.br/formulario/cliente-1765997299970-mo7tsrwb9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2ca8e0] text-white rounded-lg hover:bg-[#124a6b] transition-colors font-medium"
            >
              Exercer Direitos do Titular
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="bg-muted/50 rounded-2xl p-8 shadow-sm">
            <nav className="space-y-6">
              {documentLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="flex items-start gap-4 group hover:opacity-80 transition-opacity"
                >
                  <span className="mt-1 w-3 h-3 rounded-full bg-[#8B1538] flex-shrink-0" />
                  <div>
                    <span className="text-lg font-semibold text-[#1a365d] group-hover:underline">
                      {link.title}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {link.description}
                    </p>
                  </div>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </Layout>
  );
}
