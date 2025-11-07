/**
 * /api/ingest - Server-side audio/video ingestion endpoint
 *
 * Accepts audio/video files from iOS Shortcut, processes via Gemini,
 * and forwards transcript to scribe webhook.
 *
 * POST /api/ingest
 * Headers:
 *   - Authorization: Bearer <INGEST_TOKEN>
 *   - Content-Type: audio/m4a (or other audio/video mime type)
 * Body: Raw audio/video binary data
 *
 * Response: { status: 'ok', transcript: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateBearerToken, createAuthError } from '@/lib/auth';
import { transcribeMedia, sendToWebhook } from '@/lib/transcriber';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    // Check if ingest is enabled
    const ingestEnabled = process.env.NEXT_PUBLIC_INGEST_ENABLED === 'true';
    if (!ingestEnabled) {
      return NextResponse.json(
        { error: 'Ingest endpoint is disabled' },
        { status: 503 }
      );
    }

    // Validate Bearer token
    const authHeader = request.headers.get('authorization');
    if (!validateBearerToken(authHeader)) {
      return createAuthError();
    }

    // Get content type
    const contentType = request.headers.get('content-type') || 'audio/m4a';

    // Validate mime type
    if (!contentType.startsWith('audio/') && !contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid content type. Must be audio/* or video/*' },
        { status: 415 }
      );
    }

    // Get raw body as buffer
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 50MB. Received: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB`
        },
        { status: 413 }
      );
    }

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Empty file received' },
        { status: 400 }
      );
    }

    // Convert to base64
    const base64Media = buffer.toString('base64');

    // Extract optional metadata from headers
    const patientId = request.headers.get('x-patient-id') || undefined;
    const consultationDate = request.headers.get('x-consultation-date') || undefined;

    // Transcribe using Gemini API
    console.log(`Processing ${contentType} file (${(buffer.length / 1024).toFixed(1)}KB)...`);
    const transcript = await transcribeMedia(base64Media, contentType, {
      patientId,
      consultationDate,
    });

    // Send to webhook if configured
    const webhookUrl = process.env.SCRIBE_WEBHOOK;
    if (webhookUrl) {
      console.log('Forwarding transcript to webhook:', webhookUrl);
      try {
        await sendToWebhook(webhookUrl, transcript);
        console.log('Successfully sent to webhook');
      } catch (webhookError) {
        console.error('Webhook delivery failed:', webhookError);
        // Don't fail the request if webhook fails - still return transcript
      }
    }

    return NextResponse.json({
      status: 'ok',
      transcript,
    });

  } catch (error) {
    console.error('Ingest error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        error: 'ingest_failed',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight (if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-patient-id, x-consultation-date',
    },
  });
}
