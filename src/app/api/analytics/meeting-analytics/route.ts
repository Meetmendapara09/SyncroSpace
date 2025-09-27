import { NextRequest, NextResponse } from 'next/server';
import { BigQueryAI } from '@/lib/bigquery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, meetingData } = body;

    // Validate request
    if (!userId || !meetingData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Analyze meeting effectiveness and categorization (server-side only)
    const [effectivenessResult, categorizationResult] = await Promise.all([
      BigQueryAI.analyzeMeetingEffectiveness(meetingData),
      BigQueryAI.categorizeMeeting(meetingData)
    ]);

    if (effectivenessResult.success && categorizationResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          effectiveness: effectivenessResult.effectiveness,
          categorization: categorizationResult.data
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to analyze meeting data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Meeting analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}