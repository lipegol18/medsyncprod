import { db } from "../server/db";
import { municipalities } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';

async function importMunicipiosMgSp() {
  console.log("Iniciando importação dos municípios de MG e SP...");
  
  try {
    // Ler o arquivo CSV
    const csvPath = path.join(process.cwd(), 'attached_assets', 'municipios_to_import_1749409391436.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Pular cabeçalho
    
    const municipiosMG: Array<{name: string, ibgeCode: number, stateId: number}> = [];
    const municipiosSP: Array<{name: string, ibgeCode: number, stateId: number}> = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(';');
      if (columns.length < 4) continue;
      
      const ufCode = columns[0]?.trim();
      const municipioName = columns[3]?.trim();
      const ibgeCode = parseInt(columns[2]?.trim());
      
      if (!municipioName || !ibgeCode) continue;
      
      // MG = código 31, stateId = 22
      if (ufCode === '31') {
        municipiosMG.push({
          name: municipioName,
          ibgeCode: ibgeCode,
          stateId: 22
        });
      }
      // SP = código 35, stateId = 24
      else if (ufCode === '35') {
        municipiosSP.push({
          name: municipioName,
          ibgeCode: ibgeCode,
          stateId: 24
        });
      }
    }
    
    console.log(`Encontrados ${municipiosMG.length} municípios de MG`);
    console.log(`Encontrados ${municipiosSP.length} municípios de SP`);
    
    // Verificar municípios existentes de MG
    const municipiosExistentesMG = await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.stateId, 22));
    
    if (municipiosExistentesMG.length < 800 && municipiosMG.length > 0) {
      console.log("Importando municípios de Minas Gerais...");
      // Filtrar municípios que já existem pelo código IBGE
      const codigosExistentesMG = municipiosExistentesMG.map(m => m.ibgeCode);
      const municipiosNovos = municipiosMG.filter(m => !codigosExistentesMG.includes(m.ibgeCode));
      
      if (municipiosNovos.length > 0) {
        await db.insert(municipalities).values(municipiosNovos);
        console.log(`✓ ${municipiosNovos.length} novos municípios de MG importados`);
      } else {
        console.log("Todos os municípios de MG já estão cadastrados");
      }
    } else {
      console.log(`MG já possui ${municipiosExistentesMG.length} municípios cadastrados`);
    }
    
    // Verificar municípios existentes de SP
    const municipiosExistentesSP = await db
      .select()
      .from(municipalities)
      .where(eq(municipalities.stateId, 24));
    
    if (municipiosExistentesSP.length < 600 && municipiosSP.length > 0) {
      console.log("Importando municípios de São Paulo...");
      // Filtrar municípios que já existem pelo código IBGE
      const codigosExistentesSP = municipiosExistentesSP.map(m => m.ibgeCode);
      const municipiosNovos = municipiosSP.filter(m => !codigosExistentesSP.includes(m.ibgeCode));
      
      if (municipiosNovos.length > 0) {
        await db.insert(municipalities).values(municipiosNovos);
        console.log(`✓ ${municipiosNovos.length} novos municípios de SP importados`);
      } else {
        console.log("Todos os municípios de SP já estão cadastrados");
      }
    } else {
      console.log(`SP já possui ${municipiosExistentesSP.length} municípios cadastrados`);
    }
    
    console.log("Importação finalizada com sucesso!");
    
  } catch (error) {
    console.error("Erro ao importar municípios:", error);
  } finally {
    process.exit(0);
  }
}

// Executar a função
importMunicipiosMgSp();