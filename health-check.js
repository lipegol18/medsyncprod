#!/usr/bin/env node

// Health check script para MedSync
// Este script verifica se a aplicação está funcionando corretamente

import http from 'http';
import process from 'process';

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passou - Aplicação está saudável');
    process.exit(0);
  } else {
    console.log(`❌ Health check falhou - Status: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log(`❌ Health check falhou - Erro: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('❌ Health check falhou - Timeout');
  request.destroy();
  process.exit(1);
});

request.end();