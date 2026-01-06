// Script para processar e extrair dados do novo documento
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processNewDocument() {
  console.log("Iniciando processamento do novo documento...");
  
  const imagePath = path.join(__dirname, '../attached_assets/WhatsApp Image 2025-05-17 at 14.02.49 (1).jpeg');
  
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(imagePath)) {
      console.error(`Arquivo não encontrado: ${imagePath}`);
      return;
    }
    
    console.log("Lendo documento...");
    
    // Processar a imagem com OCR
    const result = await Tesseract.recognize(
      imagePath,
      'por', // Idioma português
      { 
        logger: m => console.log(`Tesseract OCR: ${m?.status || JSON.stringify(m)}`)
      }
    );
    
    const extractedText = result.data.text;
    console.log("\nTexto completo extraído do documento:");
    console.log(extractedText);
    console.log("\n--------------------------\n");
    
    // Dados que podemos extrair de um documento de identidade
    const dadosExtraidos = {
      tipoDocumento: null,
      nome: null,
      rg: null,
      cpf: null,
      dataNascimento: null,
      filiacao: null,
      naturalidade: null,
      dataExpedicao: null
    };
    
    // Verificar se é um documento de identidade (RG)
    const rgPatterns = [
      /REPÚBLICA\s+FEDERATIVA\s+DO\s+BRASIL/i,
      /CARTEIRA\s+DE\s+IDENTIDADE/i,
      /REGISTRO\s+GERAL/i,
      /SECRETARIA/i,
      /DETRAN/i,
      /SSP/i
    ];
    
    const isRG = rgPatterns.some(pattern => pattern.test(extractedText));
    
    if (isRG) {
      dadosExtraidos.tipoDocumento = "RG - Carteira de Identidade";
      console.log("✓ Documento identificado como RG");
      
      // Extrair nome
      const nomePatterns = [
        /Nome\s*[\/:]?\s*([A-Z][A-Za-zÀ-ÿ\s.,]{2,50})/i,
        /Nome \/ Name\s*[\/:]?\s*([A-Z][A-Za-zÀ-ÿ\s.,]{2,50})/i,
        /([A-Z][A-Za-zÀ-ÿ\s.,]{5,40})\s+(?:\d{3}[\.\s]\d{3}|CPF|Sexo)/i
      ];
      
      for (const pattern of nomePatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          const nomeCandidato = match[1].trim().replace(/\s+/g, ' ');
          // Verificar se não é uma palavra-chave ou termo comum em documentos
          if (!nomeCandidato.match(/REPÚBLICA|FEDERATIVA|BRASIL|IDENTIDADE|REGISTRO|GERAL/i)) {
            dadosExtraidos.nome = nomeCandidato;
            console.log(`✓ Nome encontrado: ${dadosExtraidos.nome}`);
            break;
          }
        }
      }
      
      // Buscar nomes específicos no texto
      if (!dadosExtraidos.nome) {
        const linhas = extractedText.split('\n').filter(l => l.trim().length > 0);
        
        for (const linha of linhas) {
          const linhaTratada = linha.trim();
          // Possível nome composto apenas por letras maiúsculas (padrão comum em RGs)
          if (/^[A-ZÀ-Ÿ\s]{10,50}$/.test(linhaTratada) && 
              !linhaTratada.match(/REPÚBLICA|FEDERATIVA|BRASIL|IDENTIDADE|REGISTRO|GERAL|SECRETARIA|SEGURANÇA/i)) {
            dadosExtraidos.nome = linhaTratada;
            console.log(`✓ Nome encontrado em linha: ${dadosExtraidos.nome}`);
            break;
          }
        }
      }
      
      // Extrair RG
      const rgNumeroPatterns = [
        /Registro\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /RG\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /Identidade\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /Number\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /(\d{1,2})\.(\d{3})\.(\d{3}[-]?\d?)/
      ];
      
      for (const pattern of rgNumeroPatterns) {
        const match = extractedText.match(pattern);
        if (match) {
          if (match[1] && match[2] && match[3]) {
            // Formato com grupos capturados de cada parte do RG
            dadosExtraidos.rg = `${match[1]}.${match[2]}.${match[3]}`;
          } else if (match[1]) {
            // Formato direto
            dadosExtraidos.rg = match[1].trim();
          }
          console.log(`✓ RG encontrado: ${dadosExtraidos.rg}`);
          break;
        }
      }
      
      // Extrair CPF
      const cpfPatterns = [
        /CPF\s*[\/:]?\s*(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/i,
        /(\d{3}\.?\d{3}\.?\d{3}[-]?\d{2})/
      ];
      
      for (const pattern of cpfPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          dadosExtraidos.cpf = match[1].trim();
          console.log(`✓ CPF encontrado: ${dadosExtraidos.cpf}`);
          break;
        }
      }
      
      // Extrair data de nascimento
      const nascimentoPatterns = [
        /Nascimento\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Data\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Data de Nascimento\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Date of Birth\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /(\d{2})\/(\d{2})\/(\d{4})/
      ];
      
      for (const pattern of nascimentoPatterns) {
        const match = extractedText.match(pattern);
        if (match) {
          if (match[1] && match[2] && match[3]) {
            dadosExtraidos.dataNascimento = `${match[1]}/${match[2]}/${match[3]}`;
          } else if (match[1]) {
            dadosExtraidos.dataNascimento = match[1].trim();
          }
          console.log(`✓ Data de nascimento: ${dadosExtraidos.dataNascimento}`);
          break;
        }
      }
      
      // Extrair filiação
      const filiacaoPatterns = [
        /Filiação\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,]{5,100})/i,
        /Pai\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,]{5,50})/i,
        /Mãe\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,]{5,50})/i
      ];
      
      for (const pattern of filiacaoPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          const filiacaoCandidato = match[1].trim().replace(/\s+/g, ' ');
          if (!filiacaoCandidato.match(/REPÚBLICA|FEDERATIVA|BRASIL|IDENTIDADE|REGISTRO|GERAL/i)) {
            dadosExtraidos.filiacao = filiacaoCandidato;
            console.log(`✓ Filiação encontrada: ${dadosExtraidos.filiacao}`);
            break;
          }
        }
      }
      
      // Extrair naturalidade
      const naturalidadePatterns = [
        /Naturalidade\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,]{2,50})/i,
        /Natural\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,]{2,50})/i
      ];
      
      for (const pattern of naturalidadePatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          dadosExtraidos.naturalidade = match[1].trim();
          console.log(`✓ Naturalidade encontrada: ${dadosExtraidos.naturalidade}`);
          break;
        }
      }
      
      // Extrair data de expedição
      const expedicaoPatterns = [
        /Expedição\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Exp\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Emissão\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Expedida em\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i
      ];
      
      for (const pattern of expedicaoPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          dadosExtraidos.dataExpedicao = match[1].trim();
          console.log(`✓ Data de expedição encontrada: ${dadosExtraidos.dataExpedicao}`);
          break;
        }
      }
    } else {
      console.log("⚠️ Documento não identificado como RG.");
      
      // Verificar se é uma carteirinha de plano de saúde
      const planoSaudePatterns = [
        /PLANO\s+DE\s+SAÚDE/i,
        /CARTÃO\s+NACIONAL\s+DE\s+SAÚDE/i,
        /CARTEIRINHA/i,
        /BRADESCO\s+SAÚDE/i,
        /AMIL/i,
        /UNIMED/i,
        /SULAMÉRICA/i
      ];
      
      const isPlanoSaude = planoSaudePatterns.some(pattern => pattern.test(extractedText));
      
      if (isPlanoSaude) {
        dadosExtraidos.tipoDocumento = "Carteirinha de Plano de Saúde";
        console.log("✓ Documento identificado como Carteirinha de Plano de Saúde");
        
        // Extrair operadora
        const operadoraPatterns = [
          /BRADESCO\s+SAÚDE/i,
          /UNIMED/i,
          /AMIL/i,
          /SULAMÉRICA/i,
          /HAPVIDA/i,
          /NOTREDAME/i,
          /INTERMEDICA/i
        ];
        
        for (const pattern of operadoraPatterns) {
          if (pattern.test(extractedText)) {
            const match = extractedText.match(pattern);
            if (match) {
              console.log(`✓ Operadora encontrada: ${match[0]}`);
              break;
            }
          }
        }
        
        // Extrair número da carteirinha
        const numeroPatterns = [
          /Carteirinha:?\s*([0-9\-\.\/ ]+)/i,
          /Cartão:?\s*([0-9\-\.\/ ]+)/i,
          /Número:?\s*([0-9\-\.\/ ]+)/i,
          /(\d{3}\s?\d{3}\s?\d{3}\s?\d{3})/
        ];
        
        for (const pattern of numeroPatterns) {
          const match = extractedText.match(pattern);
          if (match && match[1]) {
            console.log(`✓ Número da carteirinha encontrado: ${match[1].trim()}`);
            break;
          }
        }
      } else {
        dadosExtraidos.tipoDocumento = "Outro documento não identificado";
        console.log("⚠️ Tipo de documento não identificado. Extraindo informações disponíveis.");
      }
    }
    
    // Buscar informações adicionais no texto, independente do tipo de documento
    // Procurar possíveis datas
    const datasPattern = /(\d{2}\/\d{2}\/\d{4})/g;
    const datasEncontradas = extractedText.match(datasPattern);
    
    if (datasEncontradas && datasEncontradas.length > 0) {
      console.log("\nDatas encontradas no documento:");
      datasEncontradas.forEach(data => {
        console.log(`- ${data}`);
      });
    }
    
    // Procurar sequências de números que poderiam ser documentos
    const numerosPattern = /\b\d{2,}\b/g;
    const numerosEncontrados = extractedText.match(numerosPattern);
    
    if (numerosEncontrados && numerosEncontrados.length > 0) {
      console.log("\nSequências numéricas encontradas no documento:");
      numerosEncontrados.forEach(numero => {
        if (numero.length > 5) { // Mostra apenas sequências mais longas
          console.log(`- ${numero}`);
        }
      });
    }
    
    // Mostrar campos que não foram encontrados
    if (!dadosExtraidos.nome) console.log("𐄂 Nome não encontrado");
    if (!dadosExtraidos.rg && dadosExtraidos.tipoDocumento === "RG - Carteira de Identidade") console.log("𐄂 RG não encontrado");
    if (!dadosExtraidos.cpf) console.log("𐄂 CPF não encontrado");
    if (!dadosExtraidos.dataNascimento) console.log("𐄂 Data de nascimento não encontrada");
    
    // Lista de linhas para análise adicional
    console.log("\nAnálise linha a linha do documento (para identificação manual):");
    const linhas = extractedText.split('\n').filter(l => l.trim().length > 0);
    for (let i = 0; i < linhas.length; i++) {
      console.log(`Linha ${i+1}: ${linhas[i].trim()}`);
    }
    
    console.log("\nResultado final da extração do documento:");
    console.log(`Tipo: ${dadosExtraidos.tipoDocumento || 'Não identificado'}`);
    console.log(`Nome: ${dadosExtraidos.nome || 'Não detectado'}`);
    
    if (dadosExtraidos.tipoDocumento === "RG - Carteira de Identidade") {
      console.log(`RG: ${dadosExtraidos.rg || 'Não detectado'}`);
      console.log(`CPF: ${dadosExtraidos.cpf || 'Não detectado'}`);
      console.log(`Data de Nascimento: ${dadosExtraidos.dataNascimento || 'Não detectado'}`);
      if (dadosExtraidos.filiacao) console.log(`Filiação: ${dadosExtraidos.filiacao}`);
      if (dadosExtraidos.naturalidade) console.log(`Naturalidade: ${dadosExtraidos.naturalidade}`);
      if (dadosExtraidos.dataExpedicao) console.log(`Data de Expedição: ${dadosExtraidos.dataExpedicao}`);
    }
    
    return dadosExtraidos;
  } catch (error) {
    console.error("Erro ao processar o documento:", error);
  }
}

// Executar a função principal
processNewDocument()
  .catch(error => {
    console.error("Erro não tratado:", error);
  });