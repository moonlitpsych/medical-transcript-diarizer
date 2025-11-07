# Medical Transcript Diarizer

An AI-powered tool to process doctor-patient consultation recordings and generate speaker-diarized transcripts. Built to enhance Google Meet transcripts for the epic-scribe system by properly attributing dialogue to Doctor and Patient speakers.

## Features

- **Video Processing**: Upload consultation video files and generate speaker-diarized transcripts
- **Text Transcript Enhancement**: Paste existing transcripts (e.g., from Google Meet) and add proper speaker attribution
- **AI-Powered**: Uses Google Gemini 1.5 Pro for accurate speaker identification and transcription
- **Multiple Export Formats**:
  - Text format compatible with epic-scribe
  - JSON format with timestamps and structured data
- **Medical Context Aware**: Specifically designed for doctor-patient interactions
- **Built with React + Vite**: Fast, modern development experience

## Getting Started

### Prerequisites

- Node.js 18+ (or use pnpm)
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Clone or navigate to this directory:
```bash
cd medical-transcript-diarizer
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Gemini API key:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here  # For client-side demo mode
GEMINI_API_KEY=your_api_key_here              # For server-side production
INGEST_TOKEN=your_random_token_here           # For iOS Shortcut auth
```

Generate a secure token:
```bash
openssl rand -base64 32
```

### Running the App

**Development mode:**
```bash
pnpm run dev
```
Then open http://localhost:3000

**Production build:**
```bash
pnpm run build
pnpm run preview
```

## Usage

### Processing Audio/Video Files

1. Enter patient details (Patient ID and consultation date)
2. Select **Audio/Video Upload** tab
3. Drag and drop or click to upload a media file
   - **Audio**: M4A, WAV, MP3
   - **Video**: MP4, MOV, WEBM
4. Click **Generate Transcript**
5. Wait for AI processing (may take several minutes for longer files)
6. Download the result in your preferred format

**Note**: Media files are limited to 50MB for optimal processing.

### Processing a Text Transcript

Perfect for Google Meet transcripts or any plain text transcription:

1. Enter patient details (Patient ID and consultation date)
2. Select **Text Transcript** tab
3. Paste your transcript text
4. Click **Diarize Transcript**
5. Wait for AI processing (usually < 1 minute)
6. Download the result

The AI will:
- Identify speakers and label them as "Doctor" or "Patient"
- Break the transcript into speaker turns
- Generate estimated timestamps if not present
- Preserve the actual spoken content

### Export Formats

**For Epic-Scribe (TXT)**:
```
Date: 2025-01-30
Patient ID: P-12345

Dr. Sweeney: Good morning, how are you feeling today?

Patient: I've been having some headaches lately.

Dr. Sweeney: Can you describe the headaches for me?
```

**JSON Format**:
```json
{
  "patientId": "P-12345",
  "consultationDate": "2025-01-30",
  "transcript": [
    {
      "speaker": "Doctor",
      "line": "Good morning, how are you feeling today?",
      "timestamp": "00:00:05"
    },
    {
      "speaker": "Patient",
      "line": "I've been having some headaches lately.",
      "timestamp": "00:00:12"
    }
  ]
}
```

## Integration with Epic-Scribe

This tool is designed to complement the epic-scribe system. Current Google Meet transcripts show all dialogue as a single speaker. Use this diarizer to:

1. Download Google Meet recording or export the auto-generated transcript
2. Process through this tool (either video or text)
3. Download the "Epic-Scribe (TXT)" format
4. Use the diarized transcript in your epic-scribe workflow

## iOS Voice Memo Integration (NEW!)

You can now send Voice Memos directly from your iPhone to the diarizer using an iOS Shortcut. The transcript is automatically processed server-side and optionally forwarded to your scribe webhook.

### Setup Instructions

#### 1. Deploy the Application

First, deploy your app to a hosting platform (e.g., Vercel):

```bash
# Connect to Vercel (first time only)
npm i -g vercel
vercel login

# Deploy
vercel
```

After deployment, you'll get a URL like: `https://medical-diarizer-abc123.vercel.app`

#### 2. Configure Environment Variables

In your deployment platform (e.g., Vercel dashboard):

1. Go to **Settings → Environment Variables**
2. Add these **server-side** variables:

```env
GEMINI_API_KEY=your_gemini_api_key
INGEST_TOKEN=your_generated_token_here
SCRIBE_WEBHOOK=https://your-scribe-app.com/api/webhooks/transcript
NEXT_PUBLIC_INGEST_ENABLED=true
```

3. Redeploy after adding variables

#### 3. Create iOS Shortcut

On your iPhone:

1. Open **Shortcuts** app
2. Tap **+** to create new shortcut
3. Name it: **"Send to Medical Diarizer"**
4. Add these actions:

**Action 1: Receive Shortcut Input**
- Types: **Audio** (enable)
- Source: **Share Sheet**

**Action 2: Get Contents of URL**
- URL: `https://your-domain.vercel.app/api/ingest`
- Method: **POST**
- Headers:
  - `Authorization`: `Bearer your_ingest_token_here`
  - `Content-Type`: `audio/m4a`
- Request Body: **File** (select "Shortcut Input")

**Action 3: Get Dictionary from Input** (optional)
- Input: **Contents of URL**

**Action 4: Show Notification** (optional)
- Text: **"Transcript processed: [Dictionary]"**

5. Save the shortcut

#### 4. Use the Shortcut

From Voice Memos:
1. Select a recording
2. Tap **Share** button
3. Choose **"Send to Medical Diarizer"**
4. Wait for notification (processing takes 30-120 seconds for typical memos)

### How It Works

```
iPhone Voice Memo
    ↓ Share Sheet
iOS Shortcut (sends raw audio)
    ↓ POST /api/ingest
Server-side Processing
    ↓ Gemini API (speaker diarization)
Structured Transcript
    ↓ Optional webhook
Your Scribe App
```

### Webhook Payload

If you configure `SCRIBE_WEBHOOK`, the server will POST this to your endpoint:

```json
{
  "status": "completed",
  "transcript": {
    "patientId": "UNKNOWN",
    "consultationDate": "2025-01-30",
    "transcript": [
      {
        "speaker": "Doctor",
        "line": "How are you feeling today?",
        "timestamp": "00:00:03"
      },
      {
        "speaker": "Patient",
        "line": "I've been having headaches.",
        "timestamp": "00:00:08"
      }
    ]
  }
}
```

### Optional: Add Patient Metadata

You can pass patient metadata via custom headers in your Shortcut:

**Additional Headers:**
- `x-patient-id`: `P-12345`
- `x-consultation-date`: `2025-01-30`

This will populate the transcript with actual patient information instead of defaults.

### Troubleshooting iOS Shortcut

**401 Unauthorized**
- Check that your `Authorization` header matches `INGEST_TOKEN` in server env vars
- Ensure token includes "Bearer " prefix

**413 File Too Large**
- Voice memo exceeds 50MB
- Try shorter recordings or compress the file

**500 Server Error**
- Check server logs in your deployment platform
- Verify `GEMINI_API_KEY` is set correctly
- Ensure API key has sufficient quota

**No response/timeout**
- Long recordings (>10 minutes) may take 2-3 minutes to process
- Ensure stable internet connection
- Check deployment platform for function timeout limits (increase if needed)

### Future Integration Plans

- Automatic Google Drive integration to fetch/store transcripts
- Direct API integration with epic-scribe
- Batch processing for multiple files
- Manual correction interface for reviewing AI decisions

## Technical Details

### Architecture

```
medical-transcript-diarizer/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   └── api/ingest/        # Serverless API endpoint
│       └── route.ts       # iOS Shortcut ingest handler
├── components/             # React UI components
│   ├── FileUpload.tsx     # Audio/video file upload
│   ├── TextTranscriptInput.tsx  # Text input
│   ├── TranscriptDisplay.tsx    # Results display
│   └── icons.tsx          # SVG icon components
├── services/               # Client-side business logic
│   └── geminiService.ts   # Gemini API integration (client)
├── lib/                    # Server-side utilities
│   ├── transcriber.ts     # Server-side Gemini API calls
│   └── auth.ts            # Bearer token authentication
├── utils/                  # Shared utilities
│   ├── fileUtils.ts       # File conversion helpers
│   └── formatUtils.ts     # Format conversion
└── types.ts                # TypeScript interfaces
```

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19 with TypeScript
- **Styling**: TailwindCSS
- **AI**: Google Gemini 1.5 Pro API (server-side for PHI)
- **Deployment**: Vercel (recommended) or any Node.js host
- **Package Manager**: pnpm

### Limitations

- **Video files**: Maximum 50MB
- **Text transcripts**: Maximum 100,000 characters, minimum 50 characters
- **Speakers**: Currently optimized for 2-speaker scenarios (Doctor/Patient)
- **Processing time**:
  - Videos: 2-10 minutes depending on length
  - Text: Usually < 1 minute
- **Accuracy**: Depends on audio quality and clear speaker differentiation

## Troubleshooting

### "NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set"
- Make sure you created a `.env` file in the root directory
- Add your API key: `NEXT_PUBLIC_GEMINI_API_KEY=your_key_here`
- Restart the dev server after adding the key
- For server-side use (iOS Shortcut), set `GEMINI_API_KEY` instead

### "Video file is too large"
- Compress the video file or split into smaller segments
- Maximum supported size is 50MB

### "Gemini API Error: ..."
- Check that your API key is valid and has quota remaining
- Visit [Google AI Studio](https://aistudio.google.com/) to check your API status
- Some regions may have API restrictions

### Diarization accuracy issues
- Ensure audio quality is good (clear voices, minimal background noise)
- For text transcripts, include any existing speaker hints or labels
- Consider manual review and editing of results

## Development

### Building for Production

```bash
pnpm run build
```

Outputs to `dist/` directory.

### Type Checking

```bash
pnpm exec tsc --noEmit
```

### Linting

```bash
pnpm exec eslint .
```

## Privacy & Security

**Important**: This tool processes medical information. Please note:

- ✅ All processing happens via Google Gemini API (encrypted in transit)
- ✅ No data is stored on our servers
- ✅ Transcripts are processed in-memory and discarded after generation
- ⚠️ API calls are logged by Google (per their terms of service)
- ⚠️ Downloaded files are stored locally on your device

**For HIPAA compliance**, consult with your organization's compliance team before processing PHI.

## Roadmap

- [x] Video file processing
- [x] Text transcript processing
- [x] Epic-scribe compatible export format
- [x] Basic error handling and validation
- [ ] Manual transcript editing interface
- [ ] Google Drive integration (auto-fetch/save)
- [ ] Batch processing mode
- [ ] Support for 3+ speakers
- [ ] Custom speaker labels
- [ ] Integration with epic-scribe API

## License

Private use only. Part of the epic-scribe project.

## Support

For issues or questions, please refer to CLAUDE.md for detailed technical documentation and integration notes.
