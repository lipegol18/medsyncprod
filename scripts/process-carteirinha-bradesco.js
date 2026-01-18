// Script para processar e extrair dados da carteirinha Bradesco
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processCarteirinhaBradesco() {
  console.log("Iniciando processamento da carteirinha Bradesco...");
  
  const imagePath = path.join(__dirname, '../attached_assets/carterinha Bradesco.jpeg');
  
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(imagePath)) {
      console.error(`Arquivo não encontrado: ${imagePath}`);
      return;
    }
    
    console.log("Lendo carteirinha Bradesco...");
    
    // Processar a imagem com OCR
    const result = await Tesseract.recognize(
      imagePath,
      'por', // Idioma português
      { 
        logger: m => console.log(`Tesseract OCR: ${m?.status || JSON.stringify(m)}`)
      }
    );
    
    const extractedText = result.data.text;
    console.log("\nTexto extraído da carteirinha Bradesco:");
    console.log(extractedText);
    console.log("\n--------------------------\n");
    
    // Dados extraídos da carteirinha
    const dados = {
      operadora: "Bradesco",
      numeroCarteirinha: null,
      nomeTitular: null,
      plano: null,
      validade: null
    };
    
    // Extrair nome do titular
    const nomePatterns = [
      /(\w+\s+\w+\s+\w+\s*\w*)\s+\d{3}/i,
      /(\w+\s+\w+\s+\w+\s*\w*)\s+BRADESCO/i
    ];
    
    for (const pattern of nomePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        const nomeCandidato = match[1].trim();
        if (!nomeCandidato.match(/BRADESCO|SAUDE|PLANO|CARTAO|CENTRAL|NACIONAL|CNS/i)) {
          dados.nomeTitular = nomeCandidato;
          console.log(`✓ Nome encontrado: ${dados.nomeTitular}`);
          break;
        }
      }
    }
    
    // Extrair nome por linhas curtas que podem ser nomes
    if (!dados.nomeTitular) {
      const linhas = extractedText.split('\n').filter(l => l.trim().length > 0);
      
      for (const linha of linhas) {
        const linhaTratada = linha.trim();
        // Verificar se é um possível nome (mais de 5 caracteres, sem números, não são palavras-chave)
        if (linhaTratada.length > 5 && 
            linhaTratada.length < 40 &&
            !linhaTratada.match(/\d/) && 
            !linhaTratada.match(/BRADESCO|SAUDE|PLANO|CARTAO|CENTRAL|CNS|NACIONAL|VÁLIDO/i)) {
          
          // Verificar se tem pelo menos duas palavras (nome e sobrenome)
          const palavras = linhaTratada.split(/\s+/).filter(p => p.length > 1);
          if (palavras.length >= 2) {
            dados.nomeTitular = linhaTratada;
            console.log(`✓ Nome encontrado em outra linha: ${dados.nomeTitular}`);
            break;
          }
        }
      }
    }
    
    // Extrair número da carteirinha
    const numeroPatterns = [
      /(\d{15,16})/,
      /(\d{9}[\s\-]?\d{2})/,
      /(\d{3}\s?\d{3}\s?\d{3}\s?\d{3})/
    ];
    
    for (const pattern of numeroPatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.numeroCarteirinha = match[1].replace(/\s+/g, '');
        console.log(`✓ Número da carteirinha encontrado: ${dados.numeroCarteirinha}`);
        break;
      }
    }
    
    // Extrair plano
    const planoPatterns = [
      /SAÚDE\s+([A-Z][A-Z0-9\s]{3,30})/i,
      /PLANO:?\s*([A-Za-z0-9\s\-\.\/]+)/i,
      /NACIONAL/i,
      /PREFERENCIAL/i
    ];
    
    for (const pattern of planoPatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        if (match[1]) {
          dados.plano = match[1].trim();
        } else {
          dados.plano = match[0].trim();
        }
        console.log(`✓ Plano encontrado: ${dados.plano}`);
        break;
      }
    }
    
    // Extrair data de validade
    const validadePatterns = [
      /VALIDADE:?\s*(\d{2}\/\d{2}\/\d{2,4})/i,
      /VÁLIDO ATÉ:?\s*(\d{2}\/\d{2}\/\d{2,4})/i
    ];
    
    for (const pattern of validadePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.validade = match[1];
        console.log(`✓ Validade encontrada: ${dados.validade}`);
        break;
      }
    }
    
    // Mostrar campos que não foram encontrados
    if (!dados.nomeTitular) console.log("𐄂 Nome não encontrado");
    if (!dados.numeroCarteirinha) console.log("𐄂 Número da carteirinha não encontrado");
    if (!dados.plano) console.log("𐄂 Plano não encontrado");
    
    console.log("\nResultado final para preencher no formulário:");
    console.log(`Nome Completo = ${dados.nomeTitular || 'Não detectado'}`);
    console.log(`Número da Carteirinha = ${dados.numeroCarteirinha || 'Não detectado'}`);
    console.log(`Tipo de Plano = ${dados.plano || 'Não detectado'}`);
    console.log(`Operadora = ${dados.operadora}`);
    
    return dados;
  } catch (error) {
    console.error("Erro ao processar a carteirinha:", error);
  }
}

// Executar a função principal
processCarteirinhaBradesco()
  .catch(error => {
    console.error("Erro não tratado:", error);
  });