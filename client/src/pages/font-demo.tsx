import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function FontDemo() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-foreground mb-2">
          Demonstração das Fontes Proxima Nova
        </h1>
        <p className="text-muted-foreground">
          Todas as variações instaladas e prontas para uso no sistema
        </p>
      </div>

      {/* Proxima Nova Regular */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-foreground">Proxima Nova - Variações Regulares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="font-proxima-light text-lg">
              <span className="text-muted-foreground">Light (300):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-light italic text-lg">
              <span className="text-muted-foreground">Light Italic (300):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-regular text-lg">
              <span className="text-muted-foreground">Regular (400):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-regular italic text-lg">
              <span className="text-muted-foreground">Regular Italic (400):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-semibold text-lg">
              <span className="text-muted-foreground">Semibold (600):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-semibold italic text-lg">
              <span className="text-muted-foreground">Semibold Italic (600):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-bold text-lg">
              <span className="text-muted-foreground">Bold (700):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-bold italic text-lg">
              <span className="text-muted-foreground">Bold Italic (700):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-extrabold text-lg">
              <span className="text-muted-foreground">Extrabold (800):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-black text-lg">
              <span className="text-muted-foreground">Black (900):</span> MedSync - Plataforma de Autorização Médica
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proxima Nova Condensed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-foreground">Proxima Nova Condensed - Variações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="font-proxima-cond-light text-lg">
              <span className="text-muted-foreground">Condensed Light (300):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-cond-light italic text-lg">
              <span className="text-muted-foreground">Condensed Light Italic (300):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-cond-regular text-lg">
              <span className="text-muted-foreground">Condensed Regular (400):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-cond-regular italic text-lg">
              <span className="text-muted-foreground">Condensed Regular Italic (400):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-cond-semibold text-lg">
              <span className="text-muted-foreground">Condensed Semibold (600):</span> MedSync - Plataforma de Autorização Médica
            </div>
            <div className="font-proxima-cond-semibold italic text-lg">
              <span className="text-muted-foreground">Condensed Semibold Italic (600):</span> MedSync - Plataforma de Autorização Médica
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uso com classes Tailwind */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-foreground">Usando Classes Tailwind CSS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="font-proxima font-light text-lg">
              <span className="text-muted-foreground">font-proxima font-light:</span> Texto usando Tailwind CSS
            </div>
            <div className="font-proxima font-normal text-lg">
              <span className="text-muted-foreground">font-proxima font-normal:</span> Texto usando Tailwind CSS
            </div>
            <div className="font-proxima font-semibold text-lg">
              <span className="text-muted-foreground">font-proxima font-semibold:</span> Texto usando Tailwind CSS
            </div>
            <div className="font-proxima font-bold text-lg">
              <span className="text-muted-foreground">font-proxima font-bold:</span> Texto usando Tailwind CSS
            </div>
            <div className="font-proxima font-extrabold text-lg">
              <span className="text-muted-foreground">font-proxima font-extrabold:</span> Texto usando Tailwind CSS
            </div>
            <div className="font-proxima font-black text-lg">
              <span className="text-muted-foreground">font-proxima font-black:</span> Texto usando Tailwind CSS
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemplos práticos para MedSync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-foreground">Exemplos Práticos para MedSync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-proxima-bold text-xl text-primary-foreground">
              Título Principal - Proxima Nova Bold
            </h3>
            <p className="font-proxima-regular text-base text-foreground">
              Texto de conteúdo usando Proxima Nova Regular para melhor legibilidade em parágrafos longos e descrições detalhadas.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-proxima-semibold text-lg text-primary-foreground">
              Subtítulo - Proxima Nova Semibold
            </h4>
            <p className="font-proxima-light text-sm text-muted-foreground">
              Texto auxiliar em Proxima Nova Light para informações secundárias.
            </p>
          </div>

          <div className="bg-primary p-4 rounded-lg">
            <h5 className="font-proxima-black text-white text-center text-lg">
              Cabeçalho Destacado - Proxima Nova Black
            </h5>
          </div>

          <div className="border-l-4 border-accent pl-4">
            <p className="font-proxima-cond-semibold text-base text-foreground">
              Citação ou destaque importante usando Proxima Nova Condensed Semibold para economizar espaço mantendo o impacto visual.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FontDemo;