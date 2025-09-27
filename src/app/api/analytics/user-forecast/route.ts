import { NextRequest, NextResponse } from 'next/server';
import { BigQueryAI } from '@/lib/bigquery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, historicalData } = body;

    // Validate request
    if (!userId || !historicalData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate user engagement forecast (server-side only)
    const result = await BigQueryAI.forecastUserEngagement(userId, historicalData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.forecast
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to generate user forecast' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('User forecast API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}