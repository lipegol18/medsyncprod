import fs from 'fs';
import Tesseract from 'tesseract.js';

const carteirinhaPath = '../attached_assets/carterinha Bradesco.jpeg';

// RegEx patterns para detectar informações
const patterns = {
  // Padrões específicos Bradesco
  bradescoPatterns: [
    /(\d{9}-\d{2})/,  // formato 000000000-00
    /(\d{9}\d{2})/,   // formato sem traço
    /(\d{15})/        // formato contínuo mais longo
  ],

  // Padrões gerais
  namePatterns: [
    /Nome:?\s*([A-Za-zÀ-ÿ\s]+)/i,
    /Paciente:?\s*([A-Za-zÀ-ÿ\s]+)/i,
    /Titular:?\s*([A-Za-zÀ-ÿ\s]+)/i,
    /Beneficiário:?\s*([A-Za-zÀ-ÿ\s]+)/i
  ],
  
  carteirinhaPatterns: [
    /Carteira(?:nha)?:?\s*([0-9\-\.\/]+)/i,
    /Cartão:?\s*([0-9\-\.\/]+)/i,
    /Número:?\s*([0-9\-\.\/]+)/i,
    /Matrícula:?\s*([0-9\-\.\/]+)/i,
    /Código:?\s*([0-9\-\.\/]+)/i,
    /Identificação:?\s*([0-9\-\.\/]+)/i
  ]
};

async function processCarteirinha() {
  console.log('Iniciando processamento da carteirinha...');
  
  try {
    // Processar o documento com Tesseract 
    const result = await Tesseract.recognize(
      carteirinhaPath,
      'por', // Idioma português
      { 
        logger: m => console.log('Tesseract OCR (carteirinha):', m.status)
      }
    );
    
    console.log('\nTexto extraído da carteirinha:');
    console.log(result.data.text);
    console.log('\n--------------------------\n');
    
    // Resultados da extração
    const extractedData = {};
    
    // Detectar operadora
    if (result.data.text.toUpperCase().includes('BRADESCO')) {
      extractedData.insuranceName = 'Bradesco Saúde';
      console.log('✓ Operadora detectada: Bradesco Saúde');
    } else {
      console.log('✗ Operadora não detectada');
    }
    
    // Buscar número da carteirinha com padrões Bradesco
    let numeroEncontrado = false;
    for (const pattern of patterns.bradescoPatterns) {
      const match = result.data.text.match(pattern);
      if (match && match[1]) {
        extractedData.insuranceNumber = match[1].trim();
        console.log(`✓ Número da carteirinha encontrado (padrão Bradesco): ${extractedData.insuranceNumber}`);
        numeroEncontrado = true;
        break;
      }
    }
    
    // Se não encontrou com padrões Bradesco, tentar padrões gerais
    if (!numeroEncontrado) {
      for (const pattern of patterns.carteirinhaPatterns) {
        const match = result.data.text.match(pattern);
        if (match && match[1]) {
          extractedData.insuranceNumber = match[1].trim();
          console.log(`✓ Número da carteirinha encontrado (padrão geral): ${extractedData.insuranceNumber}`);
          numeroEncontrado = true;
          break;
        }
      }
      
      // Se ainda não encontrou, procurar por sequências numéricas longas
      if (!numeroEncontrado) {
        // Ignorando possíveis datas
        const textoSemDatas = result.data.text.replace(/\d{2}\/\d{2}\/\d{4}/g, '');
        
        // Procurar por sequências de pelo menos 9 dígitos
        const numerosLongos = textoSemDatas.match(/[0-9]{9,}/g);
        if (numerosLongos && numerosLongos.length > 0) {
          // Pegar a sequência mais longa
          extractedData.insuranceNumber = numerosLongos.reduce((a, b) => a.length > b.length ? a : b);
          console.log(`✓ Número da carteirinha encontrado (sequência numérica): ${extractedData.insuranceNumber}`);
          numeroEncontrado = true;
        } else {
          console.log('✗ Número da carteirinha não encontrado');
        }
      }
    }
    
    // Buscar nome
    let nomeEncontrado = false;
    for (const pattern of patterns.namePatterns) {
      const match = result.data.text.match(pattern);
      if (match && match[1]) {
        extractedData.fullName = match[1].trim();
        console.log(`✓ Nome encontrado: ${extractedData.fullName}`);
        nomeEncontrado = true;
        break;
      }
    }
    
    if (!nomeEncontrado) {
      console.log('✗ Nome não encontrado');
    }
    
    console.log('\nResultado final:');
    console.log(extractedData);
    
  } catch (error) {
    console.error('Erro no processamento:', error);
  }
}

processCarteirinha();