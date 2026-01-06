import { db } from "../server/db";
import { brazilianStates } from "../shared/schema";

async function seedEstadosBrasil() {
  console.log("Iniciando importação dos estados brasileiros...");
  
  const estados = [
    // North Region
    { stateCode: "AC", name: "Acre", ibgeCode: 12, region: "North" },
    { stateCode: "AM", name: "Amazonas", ibgeCode: 13, region: "North" },
    { stateCode: "AP", name: "Amapá", ibgeCode: 16, region: "North" },
    { stateCode: "PA", name: "Pará", ibgeCode: 15, region: "North" },
    { stateCode: "RO", name: "Rondônia", ibgeCode: 11, region: "North" },
    { stateCode: "RR", name: "Roraima", ibgeCode: 14, region: "North" },
    { stateCode: "TO", name: "Tocantins", ibgeCode: 17, region: "North" },
    
    // Northeast Region
    { stateCode: "AL", name: "Alagoas", ibgeCode: 27, region: "Northeast" },
    { stateCode: "BA", name: "Bahia", ibgeCode: 29, region: "Northeast" },
    { stateCode: "CE", name: "Ceará", ibgeCode: 23, region: "Northeast" },
    { stateCode: "MA", name: "Maranhão", ibgeCode: 21, region: "Northeast" },
    { stateCode: "PB", name: "Paraíba", ibgeCode: 25, region: "Northeast" },
    { stateCode: "PE", name: "Pernambuco", ibgeCode: 26, region: "Northeast" },
    { stateCode: "PI", name: "Piauí", ibgeCode: 22, region: "Northeast" },
    { stateCode: "RN", name: "Rio Grande do Norte", ibgeCode: 24, region: "Northeast" },
    { stateCode: "SE", name: "Sergipe", ibgeCode: 28, region: "Northeast" },
    
    // Midwest Region
    { stateCode: "DF", name: "Distrito Federal", ibgeCode: 53, region: "Midwest" },
    { stateCode: "GO", name: "Goiás", ibgeCode: 52, region: "Midwest" },
    { stateCode: "MS", name: "Mato Grosso do Sul", ibgeCode: 50, region: "Midwest" },
    { stateCode: "MT", name: "Mato Grosso", ibgeCode: 51, region: "Midwest" },
    
    // Southeast Region
    { stateCode: "ES", name: "Espírito Santo", ibgeCode: 32, region: "Southeast" },
    { stateCode: "MG", name: "Minas Gerais", ibgeCode: 31, region: "Southeast" },
    { stateCode: "RJ", name: "Rio de Janeiro", ibgeCode: 33, region: "Southeast" },
    { stateCode: "SP", name: "São Paulo", ibgeCode: 35, region: "Southeast" },
    
    // South Region
    { stateCode: "PR", name: "Paraná", ibgeCode: 41, region: "South" },
    { stateCode: "RS", name: "Rio Grande do Sul", ibgeCode: 43, region: "South" },
    { stateCode: "SC", name: "Santa Catarina", ibgeCode: 42, region: "South" },
  ];

  try {
    // Verificar se a tabela já tem dados
    const estadosExistentes = await db.select().from(brazilianStates);
    
    if (estadosExistentes.length > 0) {
      console.log(`Tabela já possui ${estadosExistentes.length} estados. Pulando importação.`);
      return;
    }
    
    // Inserir os estados no banco de dados
    await db.insert(brazilianStates).values(estados);
    
    console.log(`Sucesso! ${estados.length} estados brasileiros foram importados.`);
  } catch (error) {
    console.error("Erro ao importar estados:", error);
  } finally {
    process.exit(0);
  }
}

seedEstadosBrasil();