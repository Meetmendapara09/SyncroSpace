#!/usr/bin/env tsx

/**
 * BigQuery Setup Script
 * 
 * This script sets up the BigQuery dataset, tables, and AI models
 * for the SyncroSpace analytics system.
 */

import { BigQuery } from '@google-cloud/bigquery';

const PROJECT_ID = '470012';
const DATASET_ID = 'syncrospace_analytics';
const LOCATION = 'US';

const bigquery = new BigQuery({
  projectId: PROJECT_ID,
});

async function createDataset() {
  console.log('📊 Creating BigQuery dataset...');
  
  try {
    const dataset = bigquery.dataset(DATASET_ID);
    const [exists] = await dataset.exists();
    
    if (exists) {
      console.log(`✅ Dataset ${DATASET_ID} already exists`);
      return;
    }
    
    await dataset.create({
      location: LOCATION,
      description: 'SyncroSpace analytics data for AI-powered insights',
    });
    
    console.log(`✅ Dataset ${DATASET_ID} created successfully`);
  } catch (error) {
    console.error('❌ Failed to create dataset:', error);
    throw error;
  }
}

async function createTables() {
  console.log('📋 Creating BigQuery tables...');
  
  const tables = [
    {
      name: 'user_analytics',
      schema: [
        { name: 'user_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING' },
        { name: 'email', type: 'STRING' },
        { name: 'role', type: 'STRING' },
        { name: 'last_active', type: 'TIMESTAMP' },
        { name: 'spaces_count', type: 'INTEGER' },
        { name: 'meetings_attended', type: 'INTEGER' },
        { name: 'engagement_score', type: 'FLOAT' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' },
      ],
    },
    {
      name: 'meeting_analytics',
      schema: [
        { name: 'meeting_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'space_id', type: 'STRING' },
        { name: 'title', type: 'STRING' },
        { name: 'duration_minutes', type: 'INTEGER' },
        { name: 'participant_count', type: 'INTEGER' },
        { name: 'action_items_count', type: 'INTEGER' },
        { name: 'effectiveness_score', type: 'FLOAT' },
        { name: 'meeting_type', type: 'STRING' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' },
      ],
    },
    {
      name: 'space_analytics',
      schema: [
        { name: 'space_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING' },
        { name: 'category', type: 'STRING' },
        { name: 'member_count', type: 'INTEGER' },
        { name: 'active_meetings', type: 'INTEGER' },
        { name: 'total_meetings', type: 'INTEGER' },
        { name: 'avg_rating', type: 'FLOAT' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' },
      ],
    },
    {
      name: 'user_engagement',
      schema: [
        { name: 'user_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'engagement_score', type: 'FLOAT' },
        { name: 'last_active_date', type: 'TIMESTAMP' },
        { name: 'space_interactions', type: 'INTEGER' },
        { name: 'meeting_count', type: 'INTEGER' },
        { name: 'avg_meeting_duration', type: 'FLOAT' },
        { name: 'activity_pattern', type: 'STRING' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' },
      ],
    },
    {
      name: 'executive_insights',
      schema: [
        { name: 'insight_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'period', type: 'STRING' },
        { name: 'insights_text', type: 'STRING' },
        { name: 'metrics', type: 'JSON' },
        { name: 'trends', type: 'JSON' },
        { name: 'generated_at', type: 'TIMESTAMP' },
        { name: 'created_at', type: 'TIMESTAMP' },
      ],
    },
  ];

  for (const table of tables) {
    try {
      const tableRef = bigquery.dataset(DATASET_ID).table(table.name);
      const [exists] = await tableRef.exists();
      
      if (exists) {
        console.log(`✅ Table ${table.name} already exists`);
        continue;
      }
      
      await tableRef.create({
        schema: table.schema,
        timePartitioning: {
          type: 'DAY',
          field: 'created_at',
        },
      });
      
      console.log(`✅ Table ${table.name} created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create table ${table.name}:`, error);
    }
  }
}

async function createAIModels() {
  console.log('🤖 Creating AI models...');
  
  const models = [
    {
      name: 'personalized_content_model',
      type: 'TEXT_GENERATION',
      query: `
        CREATE MODEL \`${PROJECT_ID}.${DATASET_ID}.personalized_content_model\`
        OPTIONS (
          model_type = 'TEXT_GENERATION',
          input_token_budget = 1000,
          output_token_budget = 500
        ) AS
        SELECT 
          CONCAT('Generate personalized content for user: ', user_id, ' with role: ', role) as prompt,
          'Personalized content based on user profile and activity' as expected_output
        FROM \`${PROJECT_ID}.${DATASET_ID}.user_analytics\`
        LIMIT 100
      `,
    },
    {
      name: 'user_engagement_model',
      type: 'FORECASTING',
      query: `
        CREATE MODEL \`${PROJECT_ID}.${DATASET_ID}.user_engagement_model\`
        OPTIONS (
          model_type = 'FORECASTING',
          time_series_timestamp_col = 'created_at',
          time_series_data_col = 'engagement_score',
          horizon = 30
        ) AS
        SELECT 
          created_at,
          engagement_score,
          user_id
        FROM \`${PROJECT_ID}.${DATASET_ID}.user_engagement\`
        WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      `,
    },
  ];

  for (const model of models) {
    try {
      console.log(`Creating ${model.name}...`);
      
      const [job] = await bigquery.createQueryJob({
        query: model.query,
        location: LOCATION,
      });
      
      await job.getQueryResults();
      console.log(`✅ Model ${model.name} created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create model ${model.name}:`, error);
      // Continue with other models even if one fails
    }
  }
}

async function insertSampleData() {
  console.log('📝 Inserting sample data...');
  
  const sampleData = {
    user_analytics: [
      {
        user_id: 'sample_user_1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        last_active: new Date().toISOString(),
        spaces_count: 5,
        meetings_attended: 12,
        engagement_score: 85.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: 'sample_user_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        last_active: new Date().toISOString(),
        spaces_count: 3,
        meetings_attended: 8,
        engagement_score: 72.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    meeting_analytics: [
      {
        meeting_id: 'sample_meeting_1',
        space_id: 'sample_space_1',
        title: 'Weekly Team Standup',
        duration_minutes: 30,
        participant_count: 5,
        action_items_count: 3,
        effectiveness_score: 8.5,
        meeting_type: 'status_update',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    space_analytics: [
      {
        space_id: 'sample_space_1',
        name: 'Development Team Space',
        category: 'Development',
        member_count: 8,
        active_meetings: 1,
        total_meetings: 15,
        avg_rating: 4.7,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  for (const [tableName, data] of Object.entries(sampleData)) {
    try {
      const table = bigquery.dataset(DATASET_ID).table(tableName);
      await table.insert(data);
      console.log(`✅ Sample data inserted into ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to insert sample data into ${tableName}:`, error);
    }
  }
}

async function main() {
  console.log('🚀 Starting BigQuery setup for SyncroSpace...');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Dataset ID: ${DATASET_ID}`);
  console.log(`Location: ${LOCATION}`);
  console.log('');

  try {
    await createDataset();
    await createTables();
    await createAIModels();
    await insertSampleData();
    
    console.log('');
    console.log('🎉 BigQuery setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update your .env.local file with BigQuery credentials');
    console.log('2. Run "npm run bigquery:test" to test the integration');
    console.log('3. Run "npm run bigquery:sync" to sync your Firebase data');
    console.log('4. Start your development server and visit /analytics');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);
