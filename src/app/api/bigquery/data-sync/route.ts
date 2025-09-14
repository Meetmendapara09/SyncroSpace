import { NextRequest, NextResponse } from 'next/server';
import { bigQueryDataSync } from '@/lib/bigquery-data-sync';

// API endpoint to manage BigQuery data synchronization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    
    switch (action) {
      case 'status':
        const status = bigQueryDataSync.getStatus();
        return NextResponse.json({
          success: true,
          status,
          message: status.isRunning ? 'Sync is running' : 'Sync is stopped'
        });
        
      case 'start':
        const interval = parseInt(searchParams.get('interval') || '60');
        bigQueryDataSync.startAutoSync(interval);
        return NextResponse.json({
          success: true,
          message: `Auto-sync started with ${interval} minute interval`
        });
        
      case 'stop':
        bigQueryDataSync.stopAutoSync();
        return NextResponse.json({
          success: true,
          message: 'Auto-sync stopped'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to manage data sync'
    }, { status: 500 });
  }
}

// API endpoint to trigger manual data sync
export async function POST(request: NextRequest) {
  try {
    const { syncType, data } = await request.json();
    
    switch (syncType) {
      case 'all':
        await bigQueryDataSync.syncAllData();
        return NextResponse.json({
          success: true,
          message: 'All data synced successfully'
        });
        
      case 'users':
        await bigQueryDataSync.syncUsers();
        return NextResponse.json({
          success: true,
          message: 'User data synced successfully'
        });
        
      case 'meetings':
        await bigQueryDataSync.syncMeetings();
        return NextResponse.json({
          success: true,
          message: 'Meeting data synced successfully'
        });
        
      case 'spaces':
        await bigQueryDataSync.syncSpaces();
        return NextResponse.json({
          success: true,
          message: 'Space data synced successfully'
        });
        
      case 'engagement':
        await bigQueryDataSync.syncEngagement();
        return NextResponse.json({
          success: true,
          message: 'Engagement data synced successfully'
        });
        
      case 'custom':
        if (!data) {
          return NextResponse.json({
            success: false,
            error: 'Custom data is required'
          }, { status: 400 });
        }
        
        // Handle custom data sync
        const { DataSync } = await import('@/lib/bigquery');
        await DataSync.exportUserAnalytics(data);
        
        return NextResponse.json({
          success: true,
          message: 'Custom data synced successfully'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid sync type'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Data sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync data'
    }, { status: 500 });
  }
}
