#!/usr/bin/env node

const http = require('http');

const services = [
  { name: 'SyncroSpace Main', url: 'http://localhost:9002', port: 9002 },
  { name: 'CaveVerse Client', url: 'http://localhost:3001', port: 3001 },
  { name: 'CaveVerse Server', url: 'http://localhost:2567', port: 2567 }
];

function checkService(service) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: service.port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve({ ...service, status: '✅ Running', statusCode: res.statusCode });
    });

    req.on('error', () => {
      resolve({ ...service, status: '❌ Not Running', statusCode: 'ERROR' });
    });

    req.on('timeout', () => {
      resolve({ ...service, status: '⏱️ Timeout', statusCode: 'TIMEOUT' });
    });

    req.end();
  });
}

async function checkAllServices() {
  console.log('🔍 Checking SyncroSpace Monorepo Services...\n');
  
  const results = await Promise.all(services.map(checkService));
  
  results.forEach(service => {
    console.log(`${service.status} ${service.name} - ${service.url}`);
  });
  
  const runningCount = results.filter(s => s.status.includes('✅')).length;
  console.log(`\n📊 Status: ${runningCount}/${services.length} services running`);
  
  if (runningCount === 0) {
    console.log('\n💡 To start all services: npm run dev');
  } else if (runningCount < services.length) {
    console.log('\n💡 Some services are down. Run: npm run dev:all');
  } else {
    console.log('\n🎉 All services are running perfectly!');
  }
}

checkAllServices().catch(console.error);