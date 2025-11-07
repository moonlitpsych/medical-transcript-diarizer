import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { fileToBase64 } from '../utils/fileUtils';

// Client-side API key (for demo mode only - not for PHI)
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set. Please create a .env file with your Gemini API key.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Enhanced schema for MSE observations
const enhancedTranscriptSchema = {
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
        mentalStatusExam: {
            type: SchemaType.OBJECT,
            description: 'Mental Status Exam observations from video analysis',
            properties: {
                appearance: {
                    type: SchemaType.STRING,
                    description: 'Observations about grooming, hygiene, dress appropriateness',
                },
                behavior: {
                    type: SchemaType.STRING,
                    description: 'Psychomotor activity, eye contact, cooperation, gestures',
                },
                affect: {
                    type: SchemaType.STRING,
                    description: 'Range, appropriateness, intensity, and quality of emotional expression',
                },
                speech: {
                    type: SchemaType.STRING,
                    description: 'Rate, volume, articulation, fluency of speech',
                },
            },
        },
        clinicalObservations: {
            type: SchemaType.ARRAY,
            description: 'Notable clinical observations with timestamps',
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    timestamp: {
                        type: SchemaType.STRING,
                        description: 'When the observation occurred',
                    },
                    observation: {
                        type: SchemaType.STRING,
                        description: 'The clinical observation',
                    },
                },
            },
        },
    },
    required: ['patientId', 'consultationDate', 'transcript', 'mentalStatusExam'],
};

export async function generateTranscriptWithMSE(
    mediaFile: File,
    patientId: string,
    consultationDate: string,
    onProgress: (message: string) => void
): Promise<any> {
    // Validate file size
    // Note: MSE analysis requires video, not just audio
    if (mediaFile.size > MAX_FILE_SIZE) {
        throw new Error(`Media file is too large (${(mediaFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 50MB.`);
    }

    onProgress('Preparing video file...');
    const base64Media = await fileToBase64(mediaFile);

    const mediaPart = {
        inlineData: {
            mimeType: mediaFile.type,
            data: base64Media,
        },
    };

    const textPart = {
        text: `You are an expert medical transcriptionist and clinical observer AI. Your task is to analyze this video of a doctor-patient psychiatric consultation and provide comprehensive documentation.

ANALYSIS REQUIREMENTS:

1. TRANSCRIPT - Create a complete speaker-diarized transcript:
   - Identify the two primary speakers and label them as "Doctor" and "Patient"
   - Include timestamps for each line of dialogue in HH:MM:SS format
   - Capture all spoken content accurately

2. MENTAL STATUS EXAM - Document objective observations:

   APPEARANCE:
   - Grooming and hygiene
   - Dress and attire appropriateness
   - Physical presentation
   - Notable features

   BEHAVIOR:
   - Eye contact (good, poor, avoidant, intense)
   - Psychomotor activity (normal, agitated, restless, slowed)
   - Cooperation and engagement level
   - Posture and body positioning
   - Gestures and mannerisms

   AFFECT:
   - Range (full, restricted, blunted, flat)
   - Appropriateness to content
   - Intensity (normal, heightened, diminished)
   - Quality (euthymic, anxious, sad, irritable, euphoric)
   - Congruence with mood

   SPEECH:
   - Rate (normal, pressured, slow)
   - Volume (normal, loud, soft)
   - Articulation and clarity
   - Fluency and coherence

3. CLINICAL OBSERVATIONS - Note significant moments:
   - Visible distress or emotional reactions
   - Changes in demeanor during session
   - Non-verbal cues that inform clinical understanding
   - Therapeutic alliance indicators

PATIENT INFORMATION:
- Patient ID: ${patientId}
- Consultation Date: ${consultationDate}

FORMAT: Return a single JSON object matching the provided schema. Be objective, clinical, and thorough in observations.`,
    };

    onProgress('Sending to AI for comprehensive analysis (including MSE)... This may take several minutes.');

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: enhancedTranscriptSchema as any,
        }
    });

    try {
        const result = await model.generateContent([textPart.text, mediaPart]);

        onProgress('Processing AI response...');

        const response = await result.response;
        const jsonText = response.text().trim();
        const enhancedData = JSON.parse(jsonText);

        // Basic validation
        if (!enhancedData.transcript || !Array.isArray(enhancedData.transcript)) {
            throw new Error('Invalid transcript format received from AI.');
        }

        return enhancedData;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error('An unexpected error occurred while contacting the Gemini API.');
    }
}
