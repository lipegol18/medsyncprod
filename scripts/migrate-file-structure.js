#!/usr/bin/env node

/**
 * Script de migração da estrutura de arquivos
 * Migra arquivos da estrutura antiga (/uploads/images, /uploads/reports, /uploads/pdfs) 
 * para a nova estrutura organizacional (/uploads/pedido_[ID]/exames, /uploads/pedido_[ID]/laudos, /uploads/pedido_[ID]/documentos)
 */

import fs from 'fs';
import path from 'path';

// Função para extrair IDs dos nomes de arquivos antigos
function extractIdsFromFileName(fileName) {
  // Padrão antigo: p[patientId]_o[orderId]_[tipo]_[contador]_[data].[ext]
  const match = fileName.match(/^p(\d+)_o(\d+)_(\w+)_(\d+)_(\d+)\.(.*)/);
  
  if (match) {
    return {
      patientId: parseInt(match[1], 10),
      orderId: parseInt(match[2], 10),
      type: match[3], // 'image' ou 'report'
      counter: parseInt(match[4], 10),
      date: match[5],
      extension: match[6]
    };
  }
  
  return null;
}

// Função para extrair IDs dos nomes de arquivos PDF
function extractIdsFromPDFFileName(fileName) {
  // Padrão PDFs: pedido_[orderId]_[nomePatient]_[data].pdf
  const match = fileName.match(/^pedido_(\d+)_(.+?)_(\d{4}-\d{2}-\d{2})\.pdf$/);
  
  if (match) {
    return {
      orderId: parseInt(match[1], 10),
      patientName: match[2],
      date: match[3],
      extension: 'pdf'
    };
  }
  
  // Padrão alternativo mais simples: pedido_[numero]_[data].pdf
  const simpleMatch = fileName.match(/^pedido_(\d+)_(\d{4}-\d{2}-\d{2})\.pdf$/);
  if (simpleMatch) {
    return {
      orderId: parseInt(simpleMatch[1], 10),
      date: simpleMatch[2],
      extension: 'pdf'
    };
  }
  
  return null;
}

// Função para gerar novo nome de arquivo
function generateNewFileName(oldData) {
  const typeMap = {
    'image': 'exame',
    'report': 'laudo'
  };
  
  const newType = typeMap[oldData.type] || oldData.type;
  const paddedCounter = (oldData.counter + 1).toString().padStart(2, '0');
  
  return `${newType}_${paddedCounter}_${oldData.date}.${oldData.extension}`;
}

// Função para migrar arquivos de um diretório
function migrateDirectory(sourceDir, targetBaseDir) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`📁 Diretório ${sourceDir} não existe, pulando...`);
    return;
  }
  
  const files = fs.readdirSync(sourceDir);
  console.log(`📁 Encontrados ${files.length} arquivos em ${sourceDir}`);
  
  let migrated = 0;
  let skipped = 0;
  
  files.forEach(fileName => {
    const filePath = path.join(sourceDir, fileName);
    
    // Verificar se é um arquivo (não diretório)
    if (!fs.statSync(filePath).isFile()) {
      console.log(`⏭️  Pulando ${fileName} (não é arquivo)`);
      skipped++;
      return;
    }
    
    // Extrair informações do nome do arquivo
    const fileInfo = extractIdsFromFileName(fileName);
    
    if (!fileInfo) {
      console.log(`⏭️  Pulando ${fileName} (formato não reconhecido)`);
      skipped++;
      return;
    }
    
    // Criar estrutura de diretórios da nova organização
    const folderType = fileInfo.type === 'report' ? 'laudos' : 'exames';
    const targetDir = path.join(targetBaseDir, 'procedures', `pedido_${fileInfo.orderId}`, folderType);
    
    // Criar diretório se não existir
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`📁 Criado: ${targetDir}`);
    }
    
    // Gerar novo nome de arquivo
    const newFileName = generateNewFileName(fileInfo);
    const targetPath = path.join(targetDir, newFileName);
    
    // Verificar se arquivo já existe no destino
    if (fs.existsSync(targetPath)) {
      console.log(`⚠️  Arquivo já existe: ${targetPath}, pulando...`);
      skipped++;
      return;
    }
    
    // Copiar arquivo para nova localização
    try {
      fs.copyFileSync(filePath, targetPath);
      console.log(`✅ Migrado: ${fileName} → pedido_${fileInfo.orderId}/${folderType}/${newFileName}`);
      migrated++;
    } catch (error) {
      console.error(`❌ Erro ao migrar ${fileName}:`, error.message);
      skipped++;
    }
  });
  
  console.log(`📊 Resumo ${sourceDir}: ${migrated} migrados, ${skipped} pulados`);
  return { migrated, skipped };
}

// Função para migrar PDFs de pedidos médicos
function migratePDFDirectory(sourceDir, targetBaseDir) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`📁 Diretório ${sourceDir} não existe, pulando...`);
    return;
  }
  
  const files = fs.readdirSync(sourceDir);
  console.log(`📁 Encontrados ${files.length} arquivos PDF em ${sourceDir}`);
  
  let migrated = 0;
  let skipped = 0;
  
  files.forEach(fileName => {
    const filePath = path.join(sourceDir, fileName);
    
    // Verificar se é um arquivo PDF
    if (!fs.statSync(filePath).isFile() || !fileName.endsWith('.pdf')) {
      console.log(`⏭️  Pulando ${fileName} (não é arquivo PDF)`);
      skipped++;
      return;
    }
    
    // Extrair informações do nome do arquivo PDF
    const pdfInfo = extractIdsFromPDFFileName(fileName);
    
    if (!pdfInfo) {
      console.log(`⏭️  Pulando ${fileName} (formato PDF não reconhecido)`);
      skipped++;
      return;
    }
    
    // Criar estrutura de diretórios da nova organização
    const targetDir = path.join(targetBaseDir, `pedido_${pdfInfo.orderId}`, 'documentos');
    
    // Criar diretório se não existir
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`📁 Criado: ${targetDir}`);
    }
    
    // Usar novo nome simplificado
    const newFileName = `pedido_medico_${pdfInfo.date}.pdf`;
    const targetPath = path.join(targetDir, newFileName);
    
    // Verificar se arquivo já existe no destino
    if (fs.existsSync(targetPath)) {
      console.log(`⚠️  PDF já existe: ${targetPath}, pulando...`);
      skipped++;
      return;
    }
    
    // Copiar arquivo para nova localização
    try {
      fs.copyFileSync(filePath, targetPath);
      console.log(`✅ PDF migrado: ${fileName} → pedido_${pdfInfo.orderId}/documentos/${newFileName}`);
      migrated++;
    } catch (error) {
      console.error(`❌ Erro ao migrar PDF ${fileName}:`, error.message);
      skipped++;
    }
  });
  
  console.log(`📊 Resumo PDFs ${sourceDir}: ${migrated} migrados, ${skipped} pulados`);
  return { migrated, skipped };
}

// Função principal
function main() {
  console.log('🚀 Iniciando migração da estrutura de arquivos...\n');
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const imagesDir = path.join(uploadsDir, 'images');
  const reportsDir = path.join(uploadsDir, 'reports');
  const pdfsDir = path.join(uploadsDir, 'pdfs');
  
  // Verificar se diretório uploads existe
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Diretório uploads não encontrado');
    return;
  }
  
  console.log('📁 Estrutura atual:');
  console.log(`   📂 ${uploadsDir}`);
  console.log(`   ├── 📂 images/`);
  console.log(`   ├── 📂 reports/`);
  console.log(`   └── 📂 pdfs/`);
  console.log('\n📁 Nova estrutura será:');
  console.log(`   📂 ${uploadsDir}`);
  console.log(`   ├── 📂 pedido_[ID]/`);
  console.log(`   │   ├── 📂 exames/`);
  console.log(`   │   ├── 📂 laudos/`);
  console.log(`   │   └── 📂 documentos/`);
  console.log(`   ├── 📂 images/ (legado)`);
  console.log(`   ├── 📂 reports/ (legado)`);
  console.log(`   └── 📂 pdfs/ (legado)`);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Migrar imagens
  console.log('📸 Migrando imagens de exames...');
  const imagesResult = migrateDirectory(imagesDir, uploadsDir);
  
  console.log('\n📄 Migrando laudos médicos...');
  const reportsResult = migrateDirectory(reportsDir, uploadsDir);
  
  console.log('\n📋 Migrando PDFs de pedidos...');
  const pdfsResult = migratePDFDirectory(pdfsDir, uploadsDir);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL:');
  console.log(`   📸 Imagens: ${imagesResult?.migrated || 0} migradas, ${imagesResult?.skipped || 0} puladas`);
  console.log(`   📄 Laudos: ${reportsResult?.migrated || 0} migrados, ${reportsResult?.skipped || 0} pulados`);
  console.log(`   📋 PDFs: ${pdfsResult?.migrated || 0} migrados, ${pdfsResult?.skipped || 0} pulados`);
  
  const totalMigrated = (imagesResult?.migrated || 0) + (reportsResult?.migrated || 0) + (pdfsResult?.migrated || 0);
  const totalSkipped = (imagesResult?.skipped || 0) + (reportsResult?.skipped || 0) + (pdfsResult?.skipped || 0);
  
  console.log(`   📈 TOTAL: ${totalMigrated} arquivos migrados, ${totalSkipped} pulados`);
  
  if (totalMigrated > 0) {
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('💡 Os arquivos originais foram mantidos para segurança.');
    console.log('💡 Após verificar que tudo funciona, você pode remover os diretórios antigos manualmente.');
  } else {
    console.log('\n📭 Nenhum arquivo foi migrado. Possíveis motivos:');
    console.log('   • Não há arquivos com nomenclatura padronizada');
    console.log('   • Todos os arquivos já foram migrados anteriormente');
    console.log('   • Arquivos não seguem o padrão p[ID]_o[ID]_[tipo]_[contador]_[data].[ext]');
  }
}

// Executar automaticamente
main();