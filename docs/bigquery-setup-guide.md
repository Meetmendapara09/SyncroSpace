# BigQuery AI Integration Setup Guide

## 🚀 Overview
This guide will help you set up BigQuery's generative AI capabilities in your SyncroSpace project using your provided credentials:
- **Project ID**: 470012
- **API Key**: 113735246981706283032

## 📋 Prerequisites
- Google Cloud Project with BigQuery enabled
- BigQuery AI functions enabled
- Service account with appropriate permissions

## 🔧 Setup Steps

### 1. Enable BigQuery AI Functions
```bash
# Enable the BigQuery API
gcloud services enable bigquery.googleapis.com

# Enable AI functions (if not already enabled)
gcloud services enable aiplatform.googleapis.com
```

### 2. Create BigQuery Dataset
```sql
-- Create the main analytics dataset
CREATE SCHEMA IF NOT EXISTS `470012.syncrospace_analytics`
  OPTIONS (
    description = "SyncroSpace analytics data for AI-powered insights",
    location = "US"
  );
```

### 3. Create Required Tables
```sql
-- User Analytics Table
CREATE TABLE IF NOT EXISTS `470012.syncrospace_analytics.user_analytics` (
  user_id STRING NOT NULL,
  name STRING,
  email STRING,
  role STRING,
  last_active TIMESTAMP,
  spaces_count INT64,
  meetings_attended INT64,
  engagement_score FLOAT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY DATE(created_at);

-- Meeting Analytics Table
CREATE TABLE IF NOT EXISTS `470012.syncrospace_analytics.meeting_analytics` (
  meeting_id STRING NOT NULL,
  space_id STRING,
  title STRING,
  duration_minutes INT64,
  participant_count INT64,
  action_items_count INT64,
  effectiveness_score FLOAT64,
  meeting_type STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY DATE(created_at);

-- Space Analytics Table
CREATE TABLE IF NOT EXISTS `470012.syncrospace_analytics.space_analytics` (
  space_id STRING NOT NULL,
  name STRING,
  category STRING,
  member_count INT64,
  active_meetings INT64,
  total_meetings INT64,
  avg_rating FLOAT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY DATE(created_at);

-- User Engagement Table
CREATE TABLE IF NOT EXISTS `470012.syncrospace_analytics.user_engagement` (
  user_id STRING NOT NULL,
  engagement_score FLOAT64,
  last_active_date TIMESTAMP,
  space_interactions INT64,
  meeting_count INT64,
  avg_meeting_duration FLOAT64,
  activity_pattern STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY DATE(created_at);

-- Executive Insights Table
CREATE TABLE IF NOT EXISTS `470012.syncrospace_analytics.executive_insights` (
  insight_id STRING NOT NULL,
  period STRING,
  insights_text STRING,
  metrics JSON,
  trends JSON,
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY DATE(created_at);
```

### 4. Create AI Models
```sql
-- Personalized Content Model
CREATE MODEL `470012.syncrospace_analytics.personalized_content_model`
OPTIONS (
  model_type = 'TEXT_GENERATION',
  input_token_budget = 1000,
  output_token_budget = 500
) AS
SELECT 
  CONCAT('Generate personalized content for user: ', user_id, ' with role: ', role) as prompt,
  'Personalized content based on user profile and activity' as expected_output
FROM `470012.syncrospace_analytics.user_analytics`
LIMIT 100;

-- User Engagement Forecasting Model
CREATE MODEL `470012.syncrospace_analytics.user_engagement_model`
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
FROM `470012.syncrospace_analytics.user_engagement`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY);
```

### 5. Environment Variables
Add these to your `.env.local` file:
```env
# BigQuery Configuration
NEXT_PUBLIC_BIGQUERY_PROJECT_ID=470012
BIGQUERY_API_KEY=113735246981706283032
BIGQUERY_DATASET_ID=syncrospace_analytics
BIGQUERY_LOCATION=US

# Optional: Service Account Key (for production)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

### 6. Test the Integration
```bash
# Install dependencies
npm install @google-cloud/bigquery @google-cloud/bigquery-data-transfer

# Start the development server
npm run dev

# Test BigQuery connection
curl -X GET "http://localhost:9002/api/bigquery/executive-insights?userId=test-user"
```

## 🎯 Features Implemented

### 1. **Hyper-Personalized Marketing Engine**
- **ML.GENERATE_TEXT**: Creates personalized welcome messages, feature recommendations, and engagement content
- **API Endpoint**: `/api/bigquery/personalized-content`
- **Component**: `PersonalizedMarketingEngine`

### 2. **Executive Insights Dashboard**
- **AI.GENERATE_TABLE**: Transforms raw data into executive summaries
- **API Endpoint**: `/api/bigquery/executive-insights`
- **Component**: `ExecutiveInsightsDashboard`

### 3. **User Engagement Forecasting**
- **AI.FORECAST**: Predicts user engagement patterns
- **API Endpoint**: `/api/bigquery/user-forecast`
- **Component**: `UserEngagementForecast`

### 4. **Enhanced Meeting Analytics**
- **AI.GENERATE_INT**: Scores meeting effectiveness
- **AI.GENERATE_BOOL**: Categorizes meetings
- **API Endpoint**: `/api/bigquery/meeting-analytics`
- **Component**: `EnhancedMeetingAnalytics`

## 🔄 Data Sync Process

### Automatic Data Export
The system automatically exports Firebase data to BigQuery:

1. **User Data**: Exported when users are created/updated
2. **Meeting Data**: Exported when meetings are created/completed
3. **Space Data**: Exported when spaces are created/updated
4. **Engagement Data**: Calculated and exported daily

### Manual Data Sync
```typescript
import { DataSync } from '@/lib/bigquery';

// Export user analytics
await DataSync.exportUserAnalytics(userData);

// Export meeting analytics
await DataSync.exportMeetingAnalytics(meetingData);

// Export space analytics
await DataSync.exportSpaceAnalytics(spaceData);
```

## 📊 Usage Examples

### Generate Personalized Content
```typescript
import { BigQueryAI } from '@/lib/bigquery';

const result = await BigQueryAI.generatePersonalizedContent(
  'Create a welcome message for a new user',
  { userId: 'user123', role: 'admin', spacesCount: 5 }
);
```

### Get Executive Insights
```typescript
const insights = await BigQueryAI.generateExecutiveInsights([
  { users: 100, spaces: 20, meetings: 50 }
]);
```

### Forecast User Engagement
```typescript
const forecast = await BigQueryAI.forecastUserEngagement(
  'user123',
  [{ engagementScore: 85, lastActiveDate: '2024-01-01' }],
  30
);
```

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   # Ensure API key is correct
   echo $BIGQUERY_API_KEY
   ```

2. **Dataset Not Found**
   ```sql
   -- Check if dataset exists
   SELECT schema_name FROM `470012.INFORMATION_SCHEMA.SCHEMATA`;
   ```

3. **Model Training Error**
   ```sql
   -- Check model status
   SELECT * FROM `470012.syncrospace_analytics.INFORMATION_SCHEMA.MODELS`;
   ```

### Debug Mode
Enable debug logging by setting:
```env
DEBUG_BIGQUERY=true
```

## 📈 Performance Optimization

1. **Caching**: Results are cached for 5 minutes
2. **Batch Processing**: Multiple requests are batched together
3. **Error Handling**: Graceful fallbacks for AI function failures
4. **Rate Limiting**: Built-in rate limiting to prevent quota exhaustion

## 🔒 Security Considerations

1. **API Key Protection**: Never expose API keys in client-side code
2. **Data Privacy**: User data is anonymized before AI processing
3. **Access Control**: Only admin users can access executive insights
4. **Audit Logging**: All AI function calls are logged

## 📚 Additional Resources

- [BigQuery AI Functions Documentation](https://cloud.google.com/bigquery/docs/generative-ai)
- [ML.GENERATE_TEXT Guide](https://cloud.google.com/bigquery/docs/generative-ai-text)
- [AI.FORECAST Documentation](https://cloud.google.com/bigquery/docs/generative-ai-forecast)
- [BigQuery Python Client](https://cloud.google.com/bigquery/docs/reference/libraries)

## 🎉 Next Steps

1. **Monitor Usage**: Track AI function usage and costs
2. **Optimize Models**: Retrain models with more data
3. **Add Features**: Implement additional AI functions
4. **Scale**: Consider BigQuery ML for custom models

---

**Note**: This setup uses your provided credentials. Make sure to secure these credentials in production and consider using service accounts for better security.
