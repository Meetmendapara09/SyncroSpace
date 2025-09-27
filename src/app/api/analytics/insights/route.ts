import { NextRequest, NextResponse } from 'next/server';
import { BigQueryAI } from '@/lib/bigquery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, analyticsData } = body;

    // Validate request
    if (!userId || !analyticsData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate insights using BigQuery AI (server-side only)
    const result = await BigQueryAI.generateExecutiveInsights([analyticsData]);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to generate insights' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Analytics insights API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}