// Validate the BigQueryAI and DataSync interface definitions by importing them

console.log('Testing BigQueryAI and DataSync interface imports...');

try {
  // Import directly from the file
  const bigqueryPath = '../src/lib/bigquery';
  
  try {
    const { BigQueryAI, DataSync } = require(bigqueryPath);
    console.log('✅ Successfully imported BigQueryAI and DataSync');
    console.log('BigQueryAI methods:', Object.keys(BigQueryAI));
    console.log('DataSync:', typeof DataSync);
  } catch (importErr) {
    console.error('❌ Failed to import BigQueryAI and DataSync:', importErr);
    
    // Try import in a different way
    console.log('Trying alternative import...');
    try {
      const BigQuery = require(bigqueryPath);
      console.log('✅ Successfully imported BigQuery module');
      console.log('Available exports:', Object.keys(BigQuery));
    } catch (altImportErr) {
      console.error('❌ Failed alternative import:', altImportErr);
    }
  }
} catch (error) {
  console.error('❌ Script error:', error);
}