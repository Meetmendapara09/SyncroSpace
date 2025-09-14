#!/usr/bin/env tsx

/**
 * Data Sync Script
 * 
 * This script syncs Firebase data to BigQuery for AI analysis.
 * It can be run manually or scheduled as a cron job.
 */

import { bigQueryDataSync } from '../src/lib/bigquery-data-sync';

async function syncAllData() {
  console.log('🔄 Starting data sync from Firebase to BigQuery...');
  
  try {
    await bigQueryDataSync.syncAllData();
    console.log('✅ Data sync completed successfully');
  } catch (error) {
    console.error('❌ Data sync failed:', error);
    process.exit(1);
  }
}

async function syncSpecificData(type: string) {
  console.log(`🔄 Starting ${type} data sync...`);
  
  try {
    switch (type) {
      case 'users':
        await bigQueryDataSync.syncUsers();
        break;
      case 'meetings':
        await bigQueryDataSync.syncMeetings();
        break;
      case 'spaces':
        await bigQueryDataSync.syncSpaces();
        break;
      case 'engagement':
        await bigQueryDataSync.syncEngagement();
        break;
      default:
        console.error('❌ Invalid sync type. Use: users, meetings, spaces, engagement, or all');
        process.exit(1);
    }
    
    console.log(`✅ ${type} data sync completed successfully`);
  } catch (error) {
    console.error(`❌ ${type} data sync failed:`, error);
    process.exit(1);
  }
}

async function startAutoSync() {
  console.log('🔄 Starting automatic data sync...');
  
  try {
    const interval = parseInt(process.argv[3]) || 60; // Default 60 minutes
    bigQueryDataSync.startAutoSync(interval);
    
    console.log(`✅ Auto-sync started with ${interval} minute interval`);
    console.log('Press Ctrl+C to stop');
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping auto-sync...');
      bigQueryDataSync.stopAutoSync();
      process.exit(0);
    });
    
    // Keep alive
    setInterval(() => {}, 1000);
  } catch (error) {
    console.error('❌ Failed to start auto-sync:', error);
    process.exit(1);
  }
}

async function showStatus() {
  console.log('📊 BigQuery Data Sync Status');
  
  try {
    const status = bigQueryDataSync.getStatus();
    
    console.log(`Running: ${status.isRunning ? 'Yes' : 'No'}`);
    console.log(`Has Interval: ${status.hasInterval ? 'Yes' : 'No'}`);
    
    if (status.isRunning) {
      console.log('✅ Auto-sync is active');
    } else {
      console.log('⏸️ Auto-sync is not running');
    }
  } catch (error) {
    console.error('❌ Failed to get status:', error);
  }
}

async function main() {
  const command = process.argv[2] || 'all';
  
  console.log('🚀 BigQuery Data Sync Tool');
  console.log('Project ID: 470012');
  console.log('Dataset: syncrospace_analytics');
  console.log('');
  
  switch (command) {
    case 'all':
      await syncAllData();
      break;
      
    case 'users':
    case 'meetings':
    case 'spaces':
    case 'engagement':
      await syncSpecificData(command);
      break;
      
    case 'start':
      await startAutoSync();
      break;
      
    case 'status':
      await showStatus();
      break;
      
    case 'help':
      console.log('Usage: npm run bigquery:sync [command]');
      console.log('');
      console.log('Commands:');
      console.log('  all       - Sync all data types (default)');
      console.log('  users     - Sync user data only');
      console.log('  meetings  - Sync meeting data only');
      console.log('  spaces    - Sync space data only');
      console.log('  engagement - Sync engagement data only');
      console.log('  start     - Start automatic sync');
      console.log('  status    - Show sync status');
      console.log('  help      - Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  npm run bigquery:sync all');
      console.log('  npm run bigquery:sync users');
      console.log('  npm run bigquery:sync start 30  # Start with 30-minute interval');
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "npm run bigquery:sync help" for usage information');
      process.exit(1);
  }
}

// Run the sync
main().catch(console.error);
