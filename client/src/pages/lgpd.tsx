import { useState, useEffect } from "react";
import { Shield, FileText, ScrollText, Cookie, HelpCircle, ExternalLink, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LgpdPage() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
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
    <div>
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
                João Lucas Soares e Rubia Alencastro<br />
                Telefone: (51) 93300-5747<br />
                E-mail: <a href="mailto:privacidade@medsync.med.br" className="text-[#2ca8e0] hover:underline">privacidade@medsync.med.br</a>
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

        {/* Seção: Política de Privacidade */}
        <section id="politica-privacidade" className="mt-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-[#2ca8e0]" />
            <h2 className="text-2xl font-bold text-[#124a6b]">Política de Privacidade</h2>
          </div>
          <div className="bg-white rounded-xl border p-8 prose prose-lg max-w-none">
            <p className="text-sm text-muted-foreground mb-4">Versão 1.0/2026 - Última atualização: 21/01/2026</p>
            
            <h3 className="text-lg font-bold text-[#124a6b] mt-6">1. Objetivo desta Política</h3>
            <p>A Medsync é controladora dos dados pessoais. Emprega os melhores esforços para fornecer medidas de proteção adequadas em todas as suas operações e para implementar as políticas e os procedimentos mais consistentes, efetivos e rigorosos. Por reconhecer a importância da sua privacidade, desenvolvemos esta Política para informá-lo a respeito das condições sob as quais Tratamos e Protegemos seus Dados Pessoais.</p>
            <p>Os termos dessa Política se aplicam aos Usuários e Visitantes do website https://medsync.med.br/, também conhecidos como CANAIS DIGITAIS.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">2. Origem dos Dados Pessoais</h3>
            <p>A Medsync coleta e trata os seus Dados Pessoais que poderão ser fornecidos:</p>
            <ul>
              <li>Pela empresa que contrata os serviços da Medsync em seu benefício;</li>
              <li>Por coleta de informações por meio de outras fontes confiáveis.</li>
            </ul>
            <p>As informações coletadas incluem:</p>
            <ul>
              <li><strong>Pessoa física:</strong> nome, CPF, e-mail, UF, telefone/celular, endereço, registros do conselho de classe;</li>
              <li><strong>Pessoa jurídica:</strong> razão social, CNPJ, nome e CPF do representante legal, endereço completo e telefone.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">3. Finalidades para as quais utilizamos Dados Pessoais</h3>
            <p>Os Dados Pessoais são utilizados para:</p>
            <ul>
              <li>Administrar, prestar os serviços e cumprir obrigações decorrentes dos serviços disponibilizados;</li>
              <li>Informar sobre novidades, serviços, funcionalidades, conteúdos, benefícios e promoções;</li>
              <li>Criação de plano de ação de melhoria de nossos serviços e produtos;</li>
              <li>Colaborar e cumprir ordem judicial ou requisição por autoridade administrativa.</li>
            </ul>
            <p><strong>A Medsync não vende ou comercializa informações que possam identificá-lo.</strong></p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">4. Hipóteses do Tratamento de Dados Pessoais</h3>
            <p>A Medsync realiza o Tratamento dos Dados Pessoais como parte do desempenho e gestão de nosso relacionamento contratual, em virtude da execução de contrato ou procedimentos preliminares, em conformidade com obrigações legais ou regulatórias, ou quando necessário para o exercício regular de direitos em processo judicial, administrativo ou arbitral.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">5. Compartilhamento de Dados Pessoais</h3>
            <p>Restringimos o acesso a seus Dados Pessoais somente aos nossos profissionais devidamente autorizados. Podemos compartilhar seus Dados Pessoais com entidades dentro do grupo e com prestadores de serviços autorizados (Call Center, agentes de relacionamento, serviços de BackOffice, consultores de tecnologia).</p>
            <p>Além disso, podemos compartilhar Dados Pessoais quando acreditamos ter a obrigação de cumprir lei, regulamento ou ordem judicial, responder a autoridades públicas, proteger propriedade ou direitos da MEDSYNC, ou proteger interesses legítimos de terceiros.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">6. Armazenamento de seus Dados Pessoais</h3>
            <p>Armazenamos seus Dados Pessoais em nossas bases, em ambiente seguro, garantindo o sigilo e a confidencialidade, somente pelo tempo necessário para cumprir as finalidades para as quais foram coletados. Findo o prazo, os Dados Pessoais serão excluídos com uso de métodos de descarte seguro ou utilizados de forma anonimizada para fins estatísticos.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">7. Transferência Internacional de Dados Pessoais</h3>
            <p>Eventualmente, seus Dados Pessoais podem ser transferidos para destinatários localizados fora do Brasil. Na hipótese de transferência internacional, adotaremos as medidas necessárias para assegurar garantias adequadas de acordo com a LGPD.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">8. Exercício de seus Direitos Decorrentes da LGPD</h3>
            <p>A Medsync respeita os direitos que você possui na qualidade de titular de Dados Pessoais e possibilita seu exercício em conformidade com o artigo 18 da Lei n. 13.709/2018. Para exercer seus direitos, entre em contato pelo e-mail: <a href="mailto:privacidade@medsync.med.br" className="text-[#2ca8e0]">privacidade@medsync.med.br</a></p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">9. Segurança Aplicável à Proteção de Dados Pessoais</h3>
            <p>Implementamos as melhores práticas de mercado de segurança técnicas e administrativas para proteger os seus Dados Pessoais de acessos não autorizados e de situações acidentais ou ilícitas.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">10. Lei Aplicável e Jurisdição</h3>
            <p>Esta Política será regida pela legislação brasileira, sendo eleito o Foro da Comarca de Niterói para dirimir qualquer litígio.</p>
          </div>
        </section>

        {/* Seção: Programa de Privacidade */}
        <section id="programa-privacidade" className="mt-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-[#2ca8e0]" />
            <h2 className="text-2xl font-bold text-[#124a6b]">Programa de Privacidade</h2>
          </div>
          <div className="bg-white rounded-xl border p-8 prose prose-lg max-w-none">
            <p className="text-sm text-muted-foreground mb-4">Versão 1.0/2026</p>
            
            <div className="bg-[#124a6b]/5 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-bold text-[#124a6b] mt-0">Termo de Aprovação das Políticas de Privacidade e Proteção de Dados Pessoais e Termos de Uso</h3>
              <p className="mb-2"><strong>MEDSYNC CIRURGIAS LTDA</strong>, inscrita no CNPJ nº 62.433.954/0001-45, com sede na Estrada Francisco da Cruz Nunes, nº 3095, Sala 209, Itaipu, Niterói/RJ, CEP 24.340-000, Brasil.</p>
            </div>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">1. Objetivo do Termo de Aprovação</h3>
            <p>Este Termo tem como finalidade formalizar a aprovação, aplicação e validade das políticas externas relativas ao tratamento de dados pessoais no âmbito da Medsync, garantindo que os princípios, salvaguardas, medidas técnicas e administrativas exigidos pela LGPD sejam integralmente cumpridos.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">2. Vigência e Validade</h3>
            <p>As políticas validadas entram em vigor na data da assinatura deste Termo, mantendo-se válidas por prazo indeterminado ou até que sejam formalmente revisadas, atualizadas ou substituídas, mediante aprovação da governança de privacidade da empresa.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">3. Encarregados de Dados (DPO)</h3>
            <p>A Medsync nomeou os seguintes Encarregados de Dados para conduzir as práticas de proteção de dados pessoais:</p>
            <ul>
              <li><strong>João Lucas Soares</strong> - Encarregado de Dados</li>
              <li><strong>Rubia Alencastro</strong> - Encarregado de Dados</li>
            </ul>
            <p>Contato: (51) 93300-5747 | <a href="mailto:privacidade@medsync.med.br" className="text-[#2ca8e0]">privacidade@medsync.med.br</a></p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">4. Práticas Implementadas</h3>
            <p>As novas práticas de proteção de dados estão implementadas desde Novembro de 2025, sempre objetivando a manutenção da SEGURANÇA DOS DADOS adotados pela companhia.</p>

            <div className="bg-muted/50 p-4 rounded-lg mt-6">
              <p className="text-sm text-muted-foreground mb-0">
                <strong>Data de Aprovação:</strong> Niterói, RJ - 26/01/2026<br />
                <strong>Aprovado por:</strong> João Lucas Soares (DPO), Rubia Alencastro (DPO), Felipe Correati (CTO)
              </p>
            </div>
          </div>
        </section>

        {/* Seção: Termos de Uso */}
        <section id="termos-uso" className="mt-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <ScrollText className="h-8 w-8 text-[#2ca8e0]" />
            <h2 className="text-2xl font-bold text-[#124a6b]">Termos de Uso</h2>
          </div>
          <div className="bg-white rounded-xl border p-8 prose prose-lg max-w-none">
            <p className="text-sm text-muted-foreground mb-4">Versão 1.0/2026</p>
            
            <h3 className="text-lg font-bold text-[#124a6b] mt-6">1. Introdução</h3>
            <p>Bem-vindo aos CANAIS DIGITAIS da Medsync. Este documento apresenta os Termos e Condições de Uso, relacionando as principais regras a serem observadas por todos que acessarem os Canais Digitais da Medsync.</p>
            <p>Como condição para acesso e uso das funcionalidades exclusivas de nossos CANAIS DIGITAIS, o USUÁRIO declara que fez a leitura completa e atenta do presente Termo, estando plenamente ciente de todas as suas disposições.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">2. Cadastro</h3>
            <p>Para acessar algumas funcionalidades, o USUÁRIO deverá realizar seu cadastro. Somente é permitido a cada USUÁRIO a realização de um único cadastro. O cadastro está condicionado ao fornecimento de dados pessoais e cadastrais corretos, completos e atualizados.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">3. Segurança</h3>
            <p>Os CANAIS DIGITAIS utilizam barreiras de proteção e procedimentos de segurança para salvaguardar os ativos. O acesso às áreas transacionais é realizado mediante uso de login e senha, criada pelo próprio USUÁRIO, sendo de utilização individual e intransferível.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">4. Responsabilidades do Usuário</h3>
            <ul>
              <li>Utilizar corretamente os CANAIS DIGITAIS respeitando as condições e finalidade;</li>
              <li>Fornecer dados cadastrais corretos, completos e atualizados;</li>
              <li>Manter o sigilo dos dados de acesso (login e senha);</li>
              <li>Adotar senha forte e não reutilizar em outros sites;</li>
              <li>Respeitar todos os direitos de propriedade intelectual da Medsync;</li>
              <li>Não acessar áreas de programação, banco de dados ou códigos fonte;</li>
              <li>Não realizar engenharia reversa ou copiar/modificar as funcionalidades.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">5. Responsabilidades da Medsync</h3>
            <ul>
              <li>Preservar a funcionalidade dos CANAIS DIGITAIS;</li>
              <li>Exibir funcionalidades de maneira clara, completa e precisa;</li>
              <li>Proteger os dados coletados pelas funcionalidades disponibilizadas.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">6. Disponibilidade</h3>
            <p>A Medsync envida esforços para manutenção da disponibilidade contínua. Pode ocorrer indisponibilidade temporária decorrente de manutenção ou motivo de força maior. Procedimentos de manutenção serão informados por canais oficiais de comunicação.</p>
          </div>
        </section>

        {/* Seção: Política de Cookies */}
        <section id="politica-cookies" className="mt-16 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Cookie className="h-8 w-8 text-[#2ca8e0]" />
            <h2 className="text-2xl font-bold text-[#124a6b]">Política de Cookies</h2>
          </div>
          <div className="bg-white rounded-xl border p-8 prose prose-lg max-w-none">
            <p className="text-sm text-muted-foreground mb-4">Versão 1.0/2026</p>
            
            <h3 className="text-lg font-bold text-[#124a6b] mt-6">1. Introdução</h3>
            <p>Esta Política de Cookies é parte integrante da nossa Política de Privacidade. O site da Medsync usa cookies para melhorar seu desempenho, aprimorar a experiência de navegação e oferecer uma experiência personalizada.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">2. O que são Cookies?</h3>
            <p>Os "cookies" são pequenos arquivos de texto com letras e números, que são instalados em um computador ou dispositivo móvel do visitante que acessa um site. Alguns são essenciais para o funcionamento apropriado do site.</p>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">3. Tipos de Cookies Utilizados</h3>
            <ul>
              <li><strong>Cookies Essenciais/Necessários:</strong> Essenciais para o funcionamento do site, como preferências de privacidade, login ou preenchimento de formulários.</li>
              <li><strong>Cookies de Desempenho:</strong> Ajudam a melhorar o desempenho e design do site, medindo visitas e interações.</li>
              <li><strong>Cookies Funcionais:</strong> Lembram das configurações selecionadas, proporcionando personalização.</li>
              <li><strong>Cookies de Sessão:</strong> Rastreiam a sessão do usuário e são excluídos após o término.</li>
              <li><strong>Cookies de Publicidade:</strong> Usados por parceiros de publicidade para mostrar anúncios relevantes.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">4. Finalidades</h3>
            <ul>
              <li>Ajudar na navegação;</li>
              <li>Auxiliar no registro de eventos e login;</li>
              <li>Analisar o uso de produtos, serviços ou aplicativos;</li>
              <li>Medir o uso do site (estatísticas);</li>
              <li>Facilitar compartilhamento em redes sociais;</li>
              <li>Ajudar com esforços promocionais e de marketing;</li>
              <li>Aumentar a segurança na navegação.</li>
            </ul>

            <h3 className="text-lg font-bold text-[#124a6b] mt-6">5. Como Desabilitar os Cookies</h3>
            <p>Você pode configurar seu navegador para aceitar ou excluir cookies antes de serem instalados. Visite a seção "Ajuda" do seu navegador para instruções específicas.</p>
          </div>
        </section>

        {/* Seção: Perguntas Frequentes */}
        <section id="faq" className="mt-16 scroll-mt-8 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="h-8 w-8 text-[#2ca8e0]" />
            <h2 className="text-2xl font-bold text-[#124a6b]">Perguntas Frequentes</h2>
          </div>
          <div className="bg-white rounded-xl border p-8">
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-[#124a6b]">1. O que é a LGPD?</h3>
                <p className="text-muted-foreground mt-2">Lei Geral de Proteção de Dados, que disciplina como deverão ser tratados os dados pessoais de clientes, colaboradores e prestadores de serviço nos meios físicos e digitais.</p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-[#124a6b]">2. Todas as empresas devem se adequar à LGPD?</h3>
                <p className="text-muted-foreground mt-2">Sim, independente do porte, tamanho e faturamento, se houver tratamento de dados pessoais com fins comerciais, precisa observar a Lei, mesmo que o negócio não for formalizado (possua CNPJ).</p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-[#124a6b]">3. Somente a adequação contratual jurídica é considerada suficiente?</h3>
                <p className="text-muted-foreground mt-2">Não, porque além dos ajustes jurídicos, é necessário adotar medidas de segurança, técnicas e administrativas, previstas no Art. 46 da Lei nº 13.709/18.</p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-[#124a6b]">4. Qual o papel da SOMAXI em meu negócio?</h3>
                <p className="text-muted-foreground mt-2">Empresa responsável pelas novas práticas a respeito da LGPD.</p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-[#124a6b]">5. Quem deverá se comunicar com os titulares e a ANPD?</h3>
                <p className="text-muted-foreground mt-2">O Encarregado de Dados (DPO), nomeado pela SOMAXI GROUP, será o "porta-voz do seu negócio" quando o assunto for proteção e privacidade de dados.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-[#124a6b]">6. Por que treinar toda empresa sobre a LGPD é importante?</h3>
                <p className="text-muted-foreground mt-2">Para evidenciar que toda empresa tomou ciência sobre as novas práticas de proteção de dados pessoais.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg bg-[#2ca8e0] hover:bg-[#124a6b] text-white"
          size="icon"
          aria-label="Voltar ao topo"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
