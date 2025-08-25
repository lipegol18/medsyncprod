import { db } from "../server/db";
import { cidCodes } from "../shared/schema";
import { InsertCidCode } from "../shared/schema";

// Lista de CIDs comuns em ortopedia a serem inseridos no banco de dados
const cidSampleData: Array<InsertCidCode & { category: string }> = [
  // Joelho
  { code: "M17.0", description: "Gonartrose primária bilateral", category: "Joelho" },
  { code: "M17.1", description: "Gonartrose primária unilateral", category: "Joelho" },
  { code: "M17.2", description: "Gonartrose pós-traumática bilateral", category: "Joelho" },
  { code: "M17.3", description: "Gonartrose pós-traumática unilateral", category: "Joelho" },
  { code: "M22.4", description: "Condromalácia da rótula", category: "Joelho" },
  { code: "M23.2", description: "Transtorno do menisco devido a ruptura ou lesão antiga", category: "Joelho" },
  { code: "M23.3", description: "Outros transtornos do menisco", category: "Joelho" },
  { code: "M23.4", description: "Afrouxamento do corpo livre na articulação do joelho", category: "Joelho" },
  { code: "M23.5", description: "Instabilidade crônica do joelho", category: "Joelho" },
  { code: "M23.6", description: "Outras rupturas espontâneas de ligamentos do joelho", category: "Joelho" },
  { code: "S83.2", description: "Ruptura recente do menisco", category: "Joelho" },
  { code: "S83.5", description: "Entorse e distensão envolvendo ligamento cruzado (anterior) (posterior) do joelho", category: "Joelho" },
  { code: "S82.1", description: "Fratura da extremidade proximal da tíbia", category: "Joelho" },
  
  // Coluna
  { code: "M40.0", description: "Cifose postural", category: "Coluna" },
  { code: "M40.2", description: "Outras cifoses", category: "Coluna" },
  { code: "M43.1", description: "Espondilolistese", category: "Coluna" },
  { code: "M48.0", description: "Estenose da coluna vertebral", category: "Coluna" },
  { code: "M50.0", description: "Transtorno do disco cervical com mielopatia", category: "Coluna" },
  { code: "M50.1", description: "Transtorno do disco cervical com radiculopatia", category: "Coluna" },
  { code: "M51.0", description: "Transtornos de discos lombares e de outros discos intervertebrais com mielopatia", category: "Coluna" },
  { code: "M51.1", description: "Transtornos de discos lombares e de outros discos intervertebrais com radiculopatia", category: "Coluna" },
  { code: "M54.3", description: "Ciática", category: "Coluna" },
  { code: "M54.4", description: "Lumbago com ciática", category: "Coluna" },
  { code: "M54.5", description: "Dor lombar baixa", category: "Coluna" },
  
  // Ombro
  { code: "M75.0", description: "Capsulite adesiva do ombro", category: "Ombro" },
  { code: "M75.1", description: "Síndrome do manguito rotador", category: "Ombro" },
  { code: "M75.2", description: "Tendinite do bíceps", category: "Ombro" },
  { code: "M75.3", description: "Tendinite calcificante do ombro", category: "Ombro" },
  { code: "M75.4", description: "Síndrome de colisão do ombro", category: "Ombro" },
  { code: "S42.0", description: "Fratura da clavícula", category: "Ombro" },
  { code: "S42.2", description: "Fratura da extremidade superior do úmero", category: "Ombro" },
  
  // Quadril
  { code: "M16.0", description: "Coxartrose primária bilateral", category: "Quadril" },
  { code: "M16.1", description: "Coxartrose primária unilateral", category: "Quadril" },
  { code: "M16.2", description: "Coxartrose devida a displasia bilateral", category: "Quadril" },
  { code: "M16.3", description: "Coxartrose devida a displasia unilateral", category: "Quadril" },
  { code: "S72.0", description: "Fratura do colo do fêmur", category: "Quadril" },
  { code: "S72.1", description: "Fratura pertrocantérica", category: "Quadril" },
  { code: "S72.2", description: "Fratura subtrocantérica", category: "Quadril" },
  
  // Pé e tornozelo
  { code: "M20.1", description: "Halux valgo (adquirido)", category: "Pé e tornozelo" },
  { code: "M20.2", description: "Halux rígido", category: "Pé e tornozelo" },
  { code: "M20.3", description: "Outras deformidades do hálux (adquiridas)", category: "Pé e tornozelo" },
  { code: "M24.2", description: "Distúrbio de ligamento", category: "Pé e tornozelo" },
  { code: "S82.6", description: "Fratura do maléolo lateral", category: "Pé e tornozelo" },
  { code: "S93.0", description: "Luxação da articulação do tornozelo", category: "Pé e tornozelo" },
  
  // Outros
  { code: "M84.4", description: "Fratura patológica não classificada em outra parte", category: "Outros" },
];

async function seedCidCodes() {
  console.log("Iniciando processo de seed dos códigos CID-10...");
  
  try {
    // Verifica quantos CIDs já existem no banco
    const existingCodes = await db.select().from(cidCodes).limit(1);
    
    if (existingCodes.length > 0) {
      console.log(`Já existem códigos CID-10 no banco. Pulando processo de seed.`);
      return;
    }
    
    // Insere os códigos CID-10
    let insertedCount = 0;
    for (const cidCode of cidSampleData) {
      try {
        await db.insert(cidCodes).values(cidCode);
        insertedCount++;
        console.log(`Inserido: ${cidCode.code} - ${cidCode.description}`);
      } catch (e) {
        console.error(`Erro ao inserir ${cidCode.code}: ${e.message}`);
      }
    }
    
    console.log(`${insertedCount} códigos CID-10 inseridos com sucesso!`);
  } catch (error) {
    console.error("Erro ao inserir códigos CID-10:", error);
  } finally {
    process.exit(0);
  }
}

// Executa a função de seed
seedCidCodes();