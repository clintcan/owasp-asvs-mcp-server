#!/usr/bin/env node

/**
 * Benchmark script to measure data loading performance
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ITERATIONS = 5;
const ASVS_URL = "https://raw.githubusercontent.com/OWASP/ASVS/refs/heads/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.json";
const LOCAL_FILE = join(__dirname, '..', 'data', 'asvs-5.0.0.json');

async function benchmarkLocalFile() {
  const times = [];

  console.log('\n📁 Benchmarking LOCAL FILE loading...');
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const content = readFileSync(LOCAL_FILE, 'utf-8');
    const data = JSON.parse(content);
    const end = performance.now();
    times.push(end - start);
    console.log(`  Iteration ${i + 1}: ${(end - start).toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`  ✅ Average: ${avg.toFixed(2)}ms`);
  return avg;
}

async function benchmarkRemoteFetch() {
  const times = [];

  console.log('\n🌐 Benchmarking REMOTE FETCH loading...');
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const response = await fetch(ASVS_URL);
    const data = await response.json();
    const end = performance.now();
    times.push(end - start);
    console.log(`  Iteration ${i + 1}: ${(end - start).toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`  ✅ Average: ${avg.toFixed(2)}ms`);
  return avg;
}

async function main() {
  console.log('🚀 ASVS Data Loading Performance Benchmark');
  console.log('==========================================\n');

  const localAvg = await benchmarkLocalFile();
  const remoteAvg = await benchmarkRemoteFetch();

  console.log('\n📊 RESULTS:');
  console.log('==========================================');
  console.log(`📁 Local File:    ${localAvg.toFixed(2)}ms`);
  console.log(`🌐 Remote Fetch:  ${remoteAvg.toFixed(2)}ms`);
  console.log(`⚡ Speedup:       ${(remoteAvg / localAvg).toFixed(2)}x faster`);
  console.log(`⏱️  Time Saved:    ${(remoteAvg - localAvg).toFixed(2)}ms per load`);
  console.log('==========================================\n');
}

main().catch(console.error);
