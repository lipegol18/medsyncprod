import { db } from "../server/db";
import { municipalities } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedMunicipiosRJ() {
  console.log("Iniciando importação dos municípios do Rio de Janeiro...");
  
  const municipios = [
    { name: "Angra dos Reis", ibgeCode: 3300100, stateId: 23 },
    { name: "Aperibé", ibgeCode: 3300159, stateId: 23 },
    { name: "Araruama", ibgeCode: 3300209, stateId: 23 },
    { name: "Areal", ibgeCode: 3300225, stateId: 23 },
    { name: "Armação dos Búzios", ibgeCode: 3300233, stateId: 23 },
    { name: "Arraial do Cabo", ibgeCode: 3300258, stateId: 23 },
    { name: "Barra do Piraí", ibgeCode: 3300308, stateId: 23 },
    { name: "Barra Mansa", ibgeCode: 3300407, stateId: 23 },
    { name: "Belford Roxo", ibgeCode: 3300456, stateId: 23 },
    { name: "Bom Jardim", ibgeCode: 3300506, stateId: 23 },
    { name: "Bom Jesus do Itabapoana", ibgeCode: 3300605, stateId: 23 },
    { name: "Cabo Frio", ibgeCode: 3300704, stateId: 23 },
    { name: "Cachoeiras de Macacu", ibgeCode: 3300803, stateId: 23 },
    { name: "Cambuci", ibgeCode: 3300902, stateId: 23 },
    { name: "Campos dos Goytacazes", ibgeCode: 3301009, stateId: 23 },
    { name: "Cantagalo", ibgeCode: 3301108, stateId: 23 },
    { name: "Carapebus", ibgeCode: 3300936, stateId: 23 },
    { name: "Cardoso Moreira", ibgeCode: 3301157, stateId: 23 },
    { name: "Carmo", ibgeCode: 3301207, stateId: 23 },
    { name: "Casimiro de Abreu", ibgeCode: 3301306, stateId: 23 },
    { name: "Comendador Levy Gasparian", ibgeCode: 3300951, stateId: 23 },
    { name: "Conceição de Macabu", ibgeCode: 3301405, stateId: 23 },
    { name: "Cordeiro", ibgeCode: 3301504, stateId: 23 },
    { name: "Duas Barras", ibgeCode: 3301603, stateId: 23 },
    { name: "Duque de Caxias", ibgeCode: 3301702, stateId: 23 },
    { name: "Engenheiro Paulo de Frontin", ibgeCode: 3301801, stateId: 23 },
    { name: "Guapimirim", ibgeCode: 3301850, stateId: 23 },
    { name: "Iguaba Grande", ibgeCode: 3301876, stateId: 23 },
    { name: "Itaboraí", ibgeCode: 3301900, stateId: 23 },
    { name: "Itaguaí", ibgeCode: 3302007, stateId: 23 },
    { name: "Italva", ibgeCode: 3302056, stateId: 23 },
    { name: "Itaocara", ibgeCode: 3302106, stateId: 23 },
    { name: "Itaperuna", ibgeCode: 3302205, stateId: 23 },
    { name: "Itatiaia", ibgeCode: 3302254, stateId: 23 },
    { name: "Japeri", ibgeCode: 3302270, stateId: 23 },
    { name: "Laje do Muriaé", ibgeCode: 3302304, stateId: 23 },
    { name: "Macaé", ibgeCode: 3302403, stateId: 23 },
    { name: "Macuco", ibgeCode: 3302452, stateId: 23 },
    { name: "Magé", ibgeCode: 3302502, stateId: 23 },
    { name: "Mangaratiba", ibgeCode: 3302601, stateId: 23 },
    { name: "Maricá", ibgeCode: 3302700, stateId: 23 },
    { name: "Mendes", ibgeCode: 3302809, stateId: 23 },
    { name: "Mesquita", ibgeCode: 3302858, stateId: 23 },
    { name: "Miguel Pereira", ibgeCode: 3302908, stateId: 23 },
    { name: "Miracema", ibgeCode: 3303005, stateId: 23 },
    { name: "Natividade", ibgeCode: 3303104, stateId: 23 },
    { name: "Nilópolis", ibgeCode: 3303203, stateId: 23 },
    { name: "Niterói", ibgeCode: 3303302, stateId: 23 },
    { name: "Nova Friburgo", ibgeCode: 3303401, stateId: 23 },
    { name: "Nova Iguaçu", ibgeCode: 3303500, stateId: 23 },
    { name: "Paracambi", ibgeCode: 3303609, stateId: 23 },
    { name: "Paraíba do Sul", ibgeCode: 3303708, stateId: 23 },
    { name: "Paraty", ibgeCode: 3303807, stateId: 23 },
    { name: "Paty do Alferes", ibgeCode: 3303856, stateId: 23 },
    { name: "Petrópolis", ibgeCode: 3303906, stateId: 23 },
    { name: "Pinheiral", ibgeCode: 3303955, stateId: 23 },
    { name: "Piraí", ibgeCode: 3304003, stateId: 23 },
    { name: "Porciúncula", ibgeCode: 3304102, stateId: 23 },
    { name: "Porto Real", ibgeCode: 3304110, stateId: 23 },
    { name: "Quatis", ibgeCode: 3304128, stateId: 23 },
    { name: "Queimados", ibgeCode: 3304144, stateId: 23 },
    { name: "Quissamã", ibgeCode: 3304151, stateId: 23 },
    { name: "Resende", ibgeCode: 3304201, stateId: 23 },
    { name: "Rio Bonito", ibgeCode: 3304300, stateId: 23 },
    { name: "Rio Claro", ibgeCode: 3304409, stateId: 23 },
    { name: "Rio das Flores", ibgeCode: 3304508, stateId: 23 },
    { name: "Rio das Ostras", ibgeCode: 3304524, stateId: 23 },
    { name: "Rio de Janeiro", ibgeCode: 3304557, stateId: 23 },
    { name: "Santa Maria Madalena", ibgeCode: 3304607, stateId: 23 },
    { name: "Santo Antônio de Pádua", ibgeCode: 3304706, stateId: 23 },
    { name: "São Fidélis", ibgeCode: 3304805, stateId: 23 },
    { name: "São Francisco de Itabapoana", ibgeCode: 3304755, stateId: 23 },
    { name: "São Gonçalo", ibgeCode: 3304904, stateId: 23 },
    { name: "São João da Barra", ibgeCode: 3305000, stateId: 23 },
    { name: "São João de Meriti", ibgeCode: 3305109, stateId: 23 },
    { name: "São José de Ubá", ibgeCode: 3305133, stateId: 23 },
    { name: "São José do Vale do Rio Preto", ibgeCode: 3305158, stateId: 23 },
    { name: "São Pedro da Aldeia", ibgeCode: 3305208, stateId: 23 },
    { name: "São Sebastião do Alto", ibgeCode: 3305307, stateId: 23 },
    { name: "Sapucaia", ibgeCode: 3305406, stateId: 23 },
    { name: "Saquarema", ibgeCode: 3305505, stateId: 23 },
    { name: "Seropédica", ibgeCode: 3305554, stateId: 23 },
    { name: "Silva Jardim", ibgeCode: 3305604, stateId: 23 },
    { name: "Sumidouro", ibgeCode: 3305703, stateId: 23 },
    { name: "Tanguá", ibgeCode: 3305752, stateId: 23 },
    { name: "Teresópolis", ibgeCode: 3305802, stateId: 23 },
    { name: "Trajano de Moraes", ibgeCode: 3305901, stateId: 23 },
    { name: "Três Rios", ibgeCode: 3306008, stateId: 23 },
    { name: "Valença", ibgeCode: 3306107, stateId: 23 },
    { name: "Varre-Sai", ibgeCode: 3306156, stateId: 23 },
    { name: "Vassouras", ibgeCode: 3306206, stateId: 23 },
    { name: "Volta Redonda", ibgeCode: 3306305, stateId: 23 }
  ];

  try {
    // Verificar se a tabela já possui municípios do RJ
    const municipiosExistentes = await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.stateId, 23));
    
    if (municipiosExistentes.length > 0) {
      console.log(`Tabela já possui ${municipiosExistentes.length} municípios do RJ. Pulando importação.`);
      return;
    }
    
    // Inserir os municípios no banco de dados
    await db.insert(municipalities).values(municipios);
    
    console.log(`Sucesso! ${municipios.length} municípios do Rio de Janeiro foram importados.`);
  } catch (error) {
    console.error("Erro ao importar municípios:", error);
  } finally {
    console.log("Operação de importação finalizada.");
    process.exit(0);
  }
}

// Executar a função imediatamente
seedMunicipiosRJ();