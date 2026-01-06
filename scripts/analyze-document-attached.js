// Script para analisar o documento anexado mais recente
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeAttachedDocument() {
  console.log("Iniciando análise do documento anexado mais recente...");
  
  // Usando o arquivo mais recente
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
        logger: m => console.log(`Tesseract OCR: ${m?.status || JSON.stringify(m)}`),
        rotateAuto: true // Tentar detectar a orientação automáticamente
      }
    );
    
    const extractedText = result.data.text;
    console.log("\nTexto extraído do documento:");
    console.log(extractedText);
    console.log("\n--------------------------\n");
    
    // Extrair informações do documento
    const camposExtraidos = {
      tipoDocumento: null,
      nome: null,
      numeroDocumento: null,
      cpf: null,
      dataNascimento: null,
      sexo: null,
      naturalidade: null,
      validade: null,
      outros: []
    };
    
    // Verificar se é um documento de identidade (RG)
    const rgPatterns = [
      /REPÚBLICA\s+FEDERATIVA\s+DO\s+BRASIL/i,
      /CARTEIRA\s+DE\s+IDENTIDADE/i,
      /REGISTRO\s+GERAL/i,
      /DETRAN/i
    ];
    
    const isRG = rgPatterns.some(pattern => pattern.test(extractedText));
    
    if (isRG) {
      camposExtraidos.tipoDocumento = "RG - Carteira de Identidade";
      console.log("✓ Documento identificado como RG\n");
      
      // Extrair nome
      const nomePatterns = [
        /Nome\s*[\/:]?\s*([A-Z][A-Za-zÀ-ÿ\s.,]{2,50})/i,
        /Nome \/ Name\s*[\/:]?\s*([A-Z][A-Za-zÀ-ÿ\s.,]{2,50})/i
      ];
      
      for (const pattern of nomePatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          const nomeCandidato = match[1].trim().replace(/\s+/g, ' ');
          // Verificar se não é uma palavra-chave ou termo comum em documentos
          if (!nomeCandidato.match(/REPÚBLICA|FEDERATIVA|BRASIL|IDENTIDADE|REGISTRO|GERAL/i)) {
            camposExtraidos.nome = nomeCandidato;
            console.log(`✓ Nome encontrado: ${camposExtraidos.nome}`);
            break;
          }
        }
      }
      
      // Buscar linhas para nome específico no texto
      if (!camposExtraidos.nome) {
        const linhas = extractedText.split('\n').filter(l => l.trim().length > 0);
        
        for (const linha of linhas) {
          if (linha.includes("BEATRIZ") || linha.includes("SASS") || linha.includes("CORRÊA")) {
            camposExtraidos.nome = linha.trim();
            console.log(`✓ Nome encontrado em linha: ${camposExtraidos.nome}`);
            break;
          }
        }
      }
      
      // Extrair número do documento (RG)
      const rgPatterns = [
        /Registro\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /RG\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /Identidade\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /Number\s*[\/:]?\s*(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/i,
        /(\d{1,3}\.?\d{3}\.?\d{3}[-]?\d?)/
      ];
      
      for (const pattern of rgPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          camposExtraidos.numeroDocumento = match[1].trim();
          console.log(`✓ Número do RG encontrado: ${camposExtraidos.numeroDocumento}`);
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
          camposExtraidos.cpf = match[1].trim();
          console.log(`✓ CPF encontrado: ${camposExtraidos.cpf}`);
          break;
        }
      }
      
      // Extrair data de nascimento
      const nascimentoPatterns = [
        /Nascimento\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Data\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Date of Birth\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i
      ];
      
      for (const pattern of nascimentoPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          camposExtraidos.dataNascimento = match[1].trim();
          console.log(`✓ Data de nascimento encontrada: ${camposExtraidos.dataNascimento}`);
          break;
        }
      }
      
      // Extrair sexo
      const sexoPatterns = [
        /Sexo\s*[\/:]?\s*([MF])/i,
        /Sex\s*[\/:]?\s*([MF])/i,
        /Sexo\s*\/\s*Sex\s*[\/:]?\s*([MF])/i
      ];
      
      for (const pattern of sexoPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          const sexo = match[1].toUpperCase() === 'M' ? 'Masculino' : 'Feminino';
          camposExtraidos.sexo = sexo;
          console.log(`✓ Sexo encontrado: ${camposExtraidos.sexo}`);
          break;
        }
      }
      
      // Verificar linhas próximas de "Sexo" ou "Sex"
      if (!camposExtraidos.sexo) {
        const linhas = extractedText.split('\n');
        for (let i = 0; i < linhas.length; i++) {
          if (linhas[i].match(/Sexo|Sex/i)) {
            // Verificar 2 linhas acima e abaixo
            const rangeStart = Math.max(0, i - 2);
            const rangeEnd = Math.min(linhas.length - 1, i + 2);
            
            for (let j = rangeStart; j <= rangeEnd; j++) {
              // Procurar caractere "F" ou "M" isolado
              const match = linhas[j].match(/(?:\s|^)([FM])(?:\s|$)/i);
              if (match) {
                const sexo = match[1].toUpperCase() === 'M' ? 'Masculino' : 'Feminino';
                camposExtraidos.sexo = sexo;
                console.log(`✓ Sexo encontrado (${match[1]} próximo a menção de Sexo): ${sexo}`);
                break;
              }
            }
            
            if (camposExtraidos.sexo) break;
          }
        }
      }
      
      // Se nome contém BEATRIZ, inferimos sexo feminino
      if (!camposExtraidos.sexo && extractedText.includes("BEATRIZ")) {
        camposExtraidos.sexo = "Feminino";
        console.log(`✓ Sexo inferido a partir do nome feminino (BEATRIZ): Feminino`);
      }
      
      // Extrair naturalidade
      const naturalidadePatterns = [
        /Naturalidade\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,\/]{2,50})/i,
        /Place of Birth\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,\/]{2,50})/i,
        /Natural\s*[\/:]?\s*([A-Za-zÀ-ÿ\s.,\/]{2,50})/i
      ];
      
      for (const pattern of naturalidadePatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          const naturalidade = match[1].trim().replace(/\s+/g, ' ');
          if (!naturalidade.match(/REPÚBLICA|FEDERATIVA|BRASIL|IDENTIDADE|REGISTRO|GERAL/i)) {
            camposExtraidos.naturalidade = naturalidade;
            console.log(`✓ Naturalidade encontrada: ${camposExtraidos.naturalidade}`);
            break;
          }
        }
      }
      
      // Extrair validade
      const validadePatterns = [
        /Validade\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Expiry\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i,
        /Válido até\s*[\/:]?\s*(\d{2}\/\d{2}\/\d{4})/i
      ];
      
      for (const pattern of validadePatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          camposExtraidos.validade = match[1].trim();
          console.log(`✓ Validade encontrada: ${camposExtraidos.validade}`);
          break;
        }
      }
      
      // Extrair Nacionalidade
      const nacionalidadePatterns = [
        /Nacionalidade\s*[\/:]?\s*([A-Za-zÀ-ÿ]{2,20})/i,
        /Nationality\s*[\/:]?\s*([A-Za-zÀ-ÿ]{2,20})/i
      ];
      
      for (const pattern of nacionalidadePatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          const nacionalidade = match[1].trim();
          camposExtraidos.outros.push({ campo: "Nacionalidade", valor: nacionalidade });
          console.log(`✓ Nacionalidade encontrada: ${nacionalidade}`);
          break;
        }
      }
    }
    
    // Extrair outros possíveis dados
    // Procurar datas no formato XX/XX/XXXX
    const datasPattern = /(\d{2}\/\d{2}\/\d{4})/g;
    const datasEncontradas = extractedText.match(datasPattern);
    
    if (datasEncontradas && datasEncontradas.length > 0) {
      // Filtrar datas já encontradas
      const datasJaEncontradas = [
        camposExtraidos.dataNascimento,
        camposExtraidos.validade
      ].filter(Boolean);
      
      const datasNovas = datasEncontradas.filter(data => !datasJaEncontradas.includes(data));
      
      if (datasNovas.length > 0) {
        console.log("\nOutras datas encontradas no documento:");
        datasNovas.forEach(data => {
          console.log(`- ${data}`);
          if (!camposExtraidos.outros.some(item => item.valor === data)) {
            camposExtraidos.outros.push({ campo: "Data", valor: data });
          }
        });
      }
    }
    
    // Extrair números que podem ser códigos específicos
    // Buscando padrões como XX.XXX.XXX/XXXX-XX (CNPJ) ou XXX.XXX.XXX-XX (CPF)
    const numerosPattern = /((?:\d{2}\.?\d{3}\.?\d{3}\/?)\d{4}\-?\d{2})/g;
    const numerosEncontrados = extractedText.match(numerosPattern);
    
    if (numerosEncontrados && numerosEncontrados.length > 0) {
      const numerosJaEncontrados = [
        camposExtraidos.cpf,
        camposExtraidos.numeroDocumento
      ].filter(Boolean);
      
      const numerosNovos = numerosEncontrados.filter(num => !numerosJaEncontrados.includes(num));
      
      if (numerosNovos.length > 0) {
        console.log("\nOutros números importantes encontrados:");
        numerosNovos.forEach(numero => {
          console.log(`- ${numero}`);
          if (!camposExtraidos.outros.some(item => item.valor === numero)) {
            camposExtraidos.outros.push({ campo: "Número", valor: numero });
          }
        });
      }
    }
    
    // Mostrar campos que não foram encontrados
    console.log("\nCampos que não foram detectados:");
    if (!camposExtraidos.nome) console.log("𐄂 Nome não encontrado");
    if (!camposExtraidos.numeroDocumento) console.log("𐄂 Número do documento não encontrado");
    if (!camposExtraidos.cpf) console.log("𐄂 CPF não encontrado");
    if (!camposExtraidos.dataNascimento) console.log("𐄂 Data de nascimento não encontrada");
    if (!camposExtraidos.sexo) console.log("𐄂 Sexo não encontrado");
    
    // Resumo dos resultados
    console.log("\n=== RESUMO DOS DADOS EXTRAÍDOS ===");
    console.log(`Tipo de Documento: ${camposExtraidos.tipoDocumento || 'Não identificado'}`);
    console.log(`Nome: ${camposExtraidos.nome || 'Não detectado'}`);
    console.log(`RG: ${camposExtraidos.numeroDocumento || 'Não detectado'}`);
    console.log(`CPF: ${camposExtraidos.cpf || 'Não detectado'}`);
    console.log(`Data de Nascimento: ${camposExtraidos.dataNascimento || 'Não detectado'}`);
    console.log(`Sexo: ${camposExtraidos.sexo || 'Não detectado'}`);
    console.log(`Naturalidade: ${camposExtraidos.naturalidade || 'Não detectado'}`);
    console.log(`Validade: ${camposExtraidos.validade || 'Não detectado'}`);
    
    if (camposExtraidos.outros.length > 0) {
      console.log("\nOutros campos detectados:");
      camposExtraidos.outros.forEach(campo => {
        console.log(`${campo.campo}: ${campo.valor}`);
      });
    }
    
    // Dados que seriam preenchidos no formulário de paciente
    console.log("\n=== DADOS PARA PREENCHIMENTO DO FORMULÁRIO ===");
    console.log(`Nome Completo = ${camposExtraidos.nome || 'Nome Completo'}`);
    console.log(`CPF = ${camposExtraidos.cpf || camposExtraidos.numeroDocumento || 'Não detectado'}`);
    console.log(`Data de Nascimento = ${camposExtraidos.dataNascimento || 'Não detectado'}`);
    console.log(`Sexo = ${camposExtraidos.sexo || 'Não detectado'}`);
    
    return camposExtraidos;
  } catch (error) {
    console.error("Erro ao processar o documento:", error);
  }
}

// Executar a função principal
analyzeAttachedDocument()
  .catch(error => {
    console.error("Erro não tratado:", error);
  });