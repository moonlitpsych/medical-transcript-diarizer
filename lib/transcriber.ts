/**
 * Server-side transcriber for Gemini API
 * Used by /api/ingest endpoint to process audio/video
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const transcriptSchema = {
  type: SchemaType.OBJECT,
  properties: {
    patientId: {
      type: SchemaType.STRING,
      description: 'The unique identifier for the patient.',
    },
    consultationDate: {
      type: SchemaType.STRING,
      description: 'The date of the consultation in YYYY-MM-DD format.',
    },
    transcript: {
      type: SchemaType.ARRAY,
      description: 'An array of transcript entries, each containing a speaker, their dialogue, and a timestamp.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          speaker: {
            type: SchemaType.STRING,
            description: 'The speaker of the line, either "Doctor" or "Patient".',
          },
          line: {
            type: SchemaType.STRING,
            description: 'The transcribed dialogue text.',
          },
          timestamp: {
            type: SchemaType.STRING,
            description: 'Timestamp of when the line was spoken, in HH:MM:SS format.'
          },
        },
        required: ['speaker', 'line', 'timestamp'],
      },
    },
  },
  required: ['patientId', 'consultationDate', 'transcript'],
};

interface TranscribeOptions {
  patientId?: string;
  consultationDate?: string;
}

/**
 * Transcribe audio/video using Gemini API
 * @param base64Media - Base64-encoded audio or video file
 * @param mimeType - MIME type (e.g., 'audio/m4a', 'video/mp4')
 * @param options - Optional patient metadata
 * @returns Structured transcript data
 */
export async function transcribeMedia(
  base64Media: string,
  mimeType: string,
  options: TranscribeOptions = {}
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const patientId = options.patientId || 'UNKNOWN';
  const consultationDate = options.consultationDate || new Date().toISOString().split('T')[0];

  const mediaPart = {
    inlineData: {
      mimeType,
      data: base64Media,
    },
  };

  const prompt = `You are an expert medical transcriptionist AI. Your task is to analyze this audio/video of a doctor-patient consultation. Create a complete and accurate transcript.

- Identify the two primary speakers and label them as "Doctor" and "Patient".
- Include timestamps for each line of dialogue in HH:MM:SS format.
- The patient's ID is ${patientId} and the consultation date is ${consultationDate}.
- Format the entire output as a single JSON object that adheres to the provided schema. Do not include any other text or markdown formatting outside of the JSON object.`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro', // Using 1.5 Pro (more stable than 2.5 for production)
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: transcriptSchema as any,
      temperature: 0.2,
    },
  });

  try {
    const result = await model.generateContent([prompt, mediaPart]);
    const response = await result.response;
    const jsonText = response.text().trim();
    const transcriptData = JSON.parse(jsonText);

    // Basic validation
    if (!transcriptData.transcript || !Array.isArray(transcriptData.transcript)) {
      throw new Error('Invalid transcript format received from AI');
    }

    return transcriptData;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error('An unexpected error occurred while contacting the Gemini API');
  }
}

/**
 * Send transcript to webhook endpoint
 * @param webhookUrl - Scribe webhook URL
 * @param transcript - Transcript data
 */
export async function sendToWebhook(webhookUrl: string, transcript: any) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        transcript,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending to webhook:', error);
    throw error;
  }
}
