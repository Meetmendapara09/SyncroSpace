#!/usr/bin/env node

// Validate BigQueryAI and DataSync functionality

const { BigQueryAI, DataSync } = require('../src/lib/bigquery');

// Simple validation test that doesn't involve building the whole app
async function validateBigQueryAI() {
  console.log('Validating BigQueryAI functionality...');
  
  try {
    // Test methods
    console.log('Testing generatePersonalizedContent...');
    const contentResult = await BigQueryAI.generatePersonalizedContent('test prompt', {
      name: 'Test User'
    });
    console.log('Result:', contentResult.success ? '✅ Success' : '❌ Failed');

    console.log('Testing analyzeMeetingEffectiveness...');
    const analyticsResult = await BigQueryAI.analyzeMeetingEffectiveness({
      duration_minutes: 30,
      participant_count: 5
    });
    console.log('Result:', analyticsResult.success ? '✅ Success' : '❌ Failed');
    
    console.log('Testing categorizeMeeting...');
    const categorizationResult = await BigQueryAI.categorizeMeeting({
      meeting_type: 'general',
      duration_minutes: 30
    });
    console.log('Result:', categorizationResult.success ? '✅ Success' : '❌ Failed');
    
    console.log('Testing forecastUserEngagement...');
    const forecastResult = await BigQueryAI.forecastUserEngagement('user123', []);
    console.log('Result:', forecastResult.success ? '✅ Success' : '❌ Failed');
    
    console.log('BigQueryAI validation complete ✅');
  } catch (error) {
    console.error('BigQueryAI validation failed ❌', error);
  }
}

// Run validation
validateBigQueryAI();