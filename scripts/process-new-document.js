// Script para processar e extrair dados de documento anexado
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processDocument() {
  console.log("Iniciando processamento do documento anexado...");
  
  const imagePath = path.join(__dirname, '../attached_assets/WhatsApp Image 2025-05-17 at 14.02.49.jpeg');
  
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
      'por',
      { 
        logger: m => console.log(`Tesseract OCR: ${m?.status || JSON.stringify(m)}`)
      }
    );
    
    const extractedText = result.data.text;
    console.log("\nTexto extraído do documento:");
    console.log(extractedText);
    console.log("\n--------------------------\n");
    
    // Extrair informações específicas usando expressões regulares
    const dados = {
      operadora: null,
      numeroCarteirinha: null,
      nomeTitular: null,
      plano: null,
      validade: null,
      cnpj: null,
      endereco: null,
      telefone: null
    };
    
    // Detectar operadora
    const operadoraPatterns = [
      { nome: "Bradesco", keys: [/BRADESCO/i, /BRADESCO SAÚDE/i] },
      { nome: "Unimed", keys: [/UNIMED/i] },
      { nome: "Amil", keys: [/AMIL/i] },
      { nome: "SulAmérica", keys: [/SULAMERICA/i, /SULAMÉRICA/i] },
      { nome: "Hapvida", keys: [/HAPVIDA/i] }
    ];
    
    for (const operadora of operadoraPatterns) {
      if (operadora.keys.some(pattern => pattern.test(extractedText))) {
        dados.operadora = operadora.nome;
        console.log(`✓ Operadora detectada: ${dados.operadora}`);
        break;
      }
    }
    
    // Extrair nome do titular - melhorado para documentos RG
    const nomePatterns = [
      // Padrões específicos para RG
      /PAOLA\s+ESTEFAN\s+\w+/i,
      /(?:Nome|Name)\s*[\/:]?\s*([A-Z][A-Za-zÀ-ÿ\s.,]{5,50})/i,
      /(?:NOME|TITULAR|BENEFICIÁRIO)[:;.]?\s*([A-Z][A-Za-zÀ-ÿ\s.,]{5,50})(?=\s*(?:CPF|NASC|DATA|VALID|ANS))/i,
      /([A-Z][A-Za-zÀ-ÿ\s.,]{10,50})\s+(?:\d{3}[\.\s]\d{3}|CPF)/i,
      /([A-Z][A-Za-zÀ-ÿ]{3,}\s+(?:[A-Z][A-Za-zÀ-ÿ]{2,}\s+){1,5}[A-Z][A-Za-zÀ-ÿ]{2,})/
    ];
    
    for (const pattern of nomePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        const nomeCandidato = match[1].trim();
        if (!nomeCandidato.match(/CARTEIRA|PLANO|SEGURO|SAÚDE|IDENTIFICAÇÃO|VALIDADE/i)) {
          dados.nomeTitular = nomeCandidato;
          console.log(`✓ Nome encontrado: ${dados.nomeTitular}`);
          break;
        }
      }
    }
    
    // Extrair número da carteirinha
    const numeroPatterns = [
      /[Cc]art(?:ão|eira) [Nn]acional [Dd]e [Ss]a[úu]de:?\s*(\d[\d\s.-]{10,20}\d)/i,
      /CNS:?\s*(\d[\d\s.-]{10,20}\d)/i,
      /(?:CARTEIRA|CARTÃO|IDENTIFICAÇÃO|CÓD|Nº):?\s*(\d[\d\s.-]{5,20}\d)/i,
      /(\d{3}\.?\d{3}\.?\d{3}\.?\d{3}\.?\d{1,3})/,
      /(\d{6,20})/
    ];
    
    for (const pattern of numeroPatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.numeroCarteirinha = match[1].replace(/[\s.-]/g, '');
        console.log(`✓ Número da carteirinha encontrado: ${dados.numeroCarteirinha}`);
        break;
      }
    }
    
    // Extrair plano
    const planoPatterns = [
      /(?:PLANO|PRODUTO|CONTRATO):?\s*([A-Z0-9][A-Za-zÀ-ÿ0-9\s.,\/\-]{3,30})/i,
      /(?:TIPO|ACOMODAÇÃO):?\s*([A-Z0-9][A-Za-zÀ-ÿ0-9\s.,\/\-]{3,30})/i
    ];
    
    for (const pattern of planoPatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.plano = match[1].trim();
        console.log(`✓ Plano encontrado: ${dados.plano}`);
        break;
      }
    }
    
    // Extrair validade
    const validadePatterns = [
      /(?:VALIDADE|VÁLIDO ATÉ|VENCIMENTO):?\s*(\d{2}\/\d{2}(?:\/\d{2,4})?)/i,
      /(?:VALIDADE|VÁLIDO ATÉ|VENCIMENTO):?\s*(\d{2}\-\d{2}\-\d{2,4})/i
    ];
    
    for (const pattern of validadePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.validade = match[1];
        console.log(`✓ Validade encontrada: ${dados.validade}`);
        break;
      }
    }
    
    // Extrair CNPJ
    const cnpjPatterns = [
      /CNPJ:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2})/i,
      /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2})/
    ];
    
    for (const pattern of cnpjPatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.cnpj = match[1];
        console.log(`✓ CNPJ encontrado: ${dados.cnpj}`);
        break;
      }
    }
    
    // Extrair telefone
    const telefonePatterns = [
      /(?:TEL|TELEFONE|CENTRAL|CONTATO|SAC):?\s*(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]?)?(\d{4,5}[\s.-]?\d{4})/i,
      /(?:\(?\d{2}\)?[\s.-]?)(\d{4,5}[\s.-]?\d{4})/
    ];
    
    for (const pattern of telefonePatterns) {
      const match = extractedText.match(pattern);
      if (match && match[1]) {
        dados.telefone = match[1].replace(/[\s.-]/g, '');
        console.log(`✓ Telefone encontrado: ${dados.telefone}`);
        break;
      }
    }
    
    // Mostrar campos que não foram encontrados
    if (!dados.nomeTitular) console.log("𐄂 Nome não encontrado");
    if (!dados.numeroCarteirinha) console.log("𐄂 Número da carteirinha não encontrado");
    if (!dados.operadora) console.log("𐄂 Operadora não encontrada");
    if (!dados.plano) console.log("𐄂 Plano não encontrado");
    
    console.log("\nResultado final para preencher no formulário:");
    console.log(`Nome Completo = ${dados.nomeTitular || 'Não detectado'}`);
    console.log(`Número da Carteirinha = ${dados.numeroCarteirinha || 'Não detectado'}`);
    console.log(`Tipo de Plano = ${dados.plano || 'Não detectado'}`);
    console.log(`Operadora = ${dados.operadora || 'Não detectado'}`);
    
    console.log("\nDados adicionais encontrados:");
    if (dados.validade) console.log(`Validade: ${dados.validade}`);
    if (dados.cnpj) console.log(`CNPJ: ${dados.cnpj}`);
    if (dados.telefone) console.log(`Telefone: ${dados.telefone}`);
    
    return dados;
  } catch (error) {
    console.error("Erro ao processar o documento:", error);
  }
}

// Executar a função principal
processDocument()
  .catch(error => {
    console.error("Erro não tratado:", error);
  });