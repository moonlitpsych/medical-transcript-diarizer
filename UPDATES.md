# BOT.md — Integrate iOS Voice Memos → Shortcut → Serverless Ingest → Gemini (or Vertex) Diarized Transcript → Scribe Webhook

> Purpose: Adapt the current repo so an iPhone Share‑Sheet Shortcut can send a Voice Memo (.m4a/.wav/.mp3) directly to a minimal backend, which invokes your existing diarization/transcript pipeline and forwards the structured result to your AI scribe app. Keep costs low, taps minimal, and PHI secure.

---

## Repo Assumptions (adjust if paths differ)

* Frontend: React/Vite app.
* Current client code calls **Gemini 1.5** via `@google/generative-ai` in the browser using `VITE_GEMINI_API_KEY`.
* Files (likely):

  * `src/components/FileUpload.tsx` (or similarly named)
  * `src/services/geminiService.ts` (or `geminiService*.ts`)
* You already defined a JSON schema/prompt that yields diarized doctor/patient turns.

---

## High-Level Flow (target state)

1. **iOS Voice Memos** → Share → **Shortcut: “Send to Medical Diarizer”**.
2. Shortcut **POSTs raw audio** to `POST /api/ingest` (Bearer token auth).
3. Serverless **/api/ingest** quickly stores/queues and returns `{job_id}`.
4. Worker (or the same handler, synchronous for MVP) calls **Gemini** *server-side* (or **Vertex AI** for BAA/HIPAA), with your diarization prompt & schema.
5. Store transcript JSON; **POST** to **scribe webhook**.

---

## Deliverables (what you will change/add)

* [ ] Accept **audio** files in the UI (optional—still useful for manual uploads).
* [ ] Move **model calls to server**; remove client-side API key usage for PHI.
* [ ] Add **`/api/ingest`** endpoint.
* [ ] Add **environment variables** & secure config.
* [ ] Provide **Shortcut** steps.
* [ ] Provide **testing & acceptance** checklist.

---

## Step 1 — Frontend: Allow audio inputs (optional but helpful)

**File:** `src/components/FileUpload.tsx`

### Change

* Permit `audio/*` in addition to `video/*`.

### Patch (example)

```diff
- if (file && file.type.startsWith('video/')) {
+ if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
     // continue existing logic
 }
```

### UI copy (optional)

* Replace any “Upload video” strings with “Upload audio/video”.

**Acceptance:** Drag/drop of `.m4a`, `.wav`, `.mp3`, `.mp4` succeeds; validation error shows on other types.

---

## Step 2 — Refactor service to accept a generic media file

**File:** `src/services/geminiService.ts`

### Change

* Rename params from `videoFile` → `mediaFile` and keep `mimeType` dynamic.

### Patch (example)

```diff
-export async function generateTranscript(videoFile: File, patientId: string, opts?: Partial<Opts>) {
+export async function generateTranscript(mediaFile: File, patientId: string, opts?: Partial<Opts>) {
-  const base64Video = await fileToBase64(videoFile)
+  const base64Media = await fileToBase64(mediaFile)
-  const videoPart = { inlineData: { mimeType: videoFile.type, data: base64Video } }
+  const mediaPart = { inlineData: { mimeType: mediaFile.type, data: base64Media } }
-  const parts = [systemPrompt, videoPart]
+  const parts = [systemPrompt, mediaPart]
  // rest unchanged
}
```

> **Note:** This function will be used server‑side post‑ingest; keep client usage for non‑PHI demos only.

**Acceptance:** Unit test shows mime type flows through unchanged.

---

## Step 3 — Add server-side ingest & model call (Vercel example)

**Files to add:**

* `api/ingest.ts` (Vercel Functions) **or** `functions/ingest.ts` (Cloudflare/AWS adapt accordingly)
* `src/lib/transcriber.ts` (server helper that calls Gemini/Vertex using your schema)

### `api/ingest.ts` (minimal synchronous MVP)

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const INGEST_TOKEN = process.env.INGEST_TOKEN!
const SCRIBE_WEBHOOK = process.env.SCRIBE_WEBHOOK // optional

// TODO: replace with your existing schema
const transcriptSchema = {
  type: SchemaType.OBJECT,
  properties: {
    patientId: { type: SchemaType.STRING },
    consultationDate: { type: SchemaType.STRING },
    transcript: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          speaker: { type: SchemaType.STRING },
          line: { type: SchemaType.STRING },
          timestamp: { type: SchemaType.STRING },
        },
        required: ["speaker", "line", "timestamp"],
      },
    },
  },
  required: ["patientId", "consultationDate", "transcript"],
} as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).end()
    if ((req.headers.authorization || '') !== `Bearer ${INGEST_TOKEN}`) return res.status(401).end()

    // collect raw body
    const chunks: Uint8Array[] = []
    for await (const c of req) chunks.push(c as Uint8Array)
    const buf = Buffer.concat(chunks)

    const mime = String(req.headers['content-type'] || 'audio/m4a')
    const base64 = buf.toString('base64')

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      responseSchema: transcriptSchema as any,
    })

    const systemPrompt = {
      text: [
        'You are a medical conversation diarizer.',
        'Return JSON only that adheres strictly to the schema.',
        'Attribute each turn to Doctor or Patient; infer timestamps if none are present.',
      ].join(' '),
    }

    const result = await model.generateContent([
      systemPrompt,
      { inlineData: { mimeType: mime, data: base64 } },
    ])

    const text = result.response.text() // guaranteed JSON per responseSchema
    const json = JSON.parse(text)

    if (SCRIBE_WEBHOOK) {
      await fetch(SCRIBE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', transcript: json }),
      })
    }

    return res.status(200).json({ status: 'ok', transcript: json })
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e?.message || 'ingest_failed' })
  }
}
```

> **Queue/async option:** For longer files, switch to: `/api/ingest` → upload to storage (S3/GCS) → enqueue job → worker calls model → posts to webhook. Keep `/api/ingest` < 3s.

---

## Step 4 — Vertex AI (HIPAA/BAA) option

If recordings contain PHI and you require a BAA, replace the Gemini AI Studio SDK with **Vertex AI** in a Google Cloud project covered by a BAA. Keep audio and transcripts in covered storage (GCS) and ensure IAM + CMEK as needed.

**Action items:**

* [ ] Replace `@google/generative-ai` usage with Vertex AI SDK (e.g., `@google-cloud/vertexai`).
* [ ] Configure regional endpoints supported for Gemini models.
* [ ] Store inbound audio in GCS; use signed URLs or direct bytes.
* [ ] Update `.env`/secrets and deployment to GCP (Cloud Run/Functions).

**Acceptance:** Production path never uses client-exposed keys; all PHI stays within covered services.

---

## Step 5 — Environment variables

Create `.env` (do not commit):

```
# server-side only
GEMINI_API_KEY=xxxxx                 # or Vertex service auth if switching
INGEST_TOKEN=long_random_token_here  # checked by /api/ingest
SCRIBE_WEBHOOK=https://your-scribe-app.example.com/webhook  # optional
```

CI/CD secrets must mirror these keys in your host (Vercel/Cloudflare/GCP).

---

## Step 6 — iOS Shortcut (Share‑Sheet) configuration

**Name:** `Send to Medical Diarizer`

**Steps:**

1. **Get File** → **Shortcut Input** (Types: Audio)
2. **Get Contents of URL**

   * Method: **POST**
   * URL: `https://<your-deploy-domain>/api/ingest`
   * Headers:

     * `Authorization: Bearer <INGEST_TOKEN>`
     * `Content-Type: audio/m4a` (or omit to let iOS set it)
   * Request Body: **File** (use the file variable)
3. **Show Result** (or **Show Notification**)

**Acceptance:** From Voice Memos, Share → Shortcut → returns `{ status: "ok" }` and (optionally) displays transcript.

---

## Step 7 — Webhook to your scribe app

* The ingest handler already posts `{ status: 'completed', transcript: <JSON> }` to `SCRIBE_WEBHOOK` if set.
* Adjust payload shape to match your scribe app. Recommended payload:

```json
{
  "job_id": "j_01HF...",
  "source": { "origin": "ios_share_sheet", "mime": "audio/m4a" },
  "transcript": { /* your schema here */ }
}
```

**Acceptance:** Scribe endpoint receives and persists transcript; downstream note builders run normally.

---

## Security, Privacy, Compliance

* **No client-side API keys** for PHI paths.
* **Bearer** auth on `/api/ingest` (rotateable secret). Consider mTLS or presigned-URL upload for extra hardening.
* **Transport:** TLS only; HSTS enabled at host.
* **Storage:** If you persist audio, encrypt at rest (SSE-S3/GCS). Prefer short retention (7–14 days) and auto-delete jobs on completion.
* **Access controls & audit logs** in scribe app.
* **BAA:** Use Vertex AI + GCP if HIPAA is in scope.

---

## Testing Plan

**Unit:**

* [ ] `fileToBase64` handles `.m4a` and carries correct mime type.
* [ ] `generateTranscript(mediaFile, ...)` builds parts with dynamic `mimeType`.

**Integration:**

* [ ] `POST /api/ingest` with a sample `.m4a` returns 200 and JSON transcript.
* [ ] Shortcut share → 200 OK in under 3s for <5min audio.
* [ ] Webhook receives and stores transcript.

**Manual QA:**

* [ ] Diarization assigns Doctor vs Patient correctly ≥90% of turns.
* [ ] Long pauses/fillers handled; punctuation acceptable.
* [ ] Failure modes: invalid token (401), bad mime (415), large file (413) return appropriate errors.

---

## Rollback

* Feature flags: env var `INGEST_ENABLED=false` causes `/api/ingest` to 503 and hides Shortcut references in UI.
* Client path remains for non‑PHI demos (explicitly labeled as such).

---

## Future Enhancements (optional)

* **Async pipeline:** `/sign` → presigned S3/GCS upload → queue → worker → webhook (for >15 min audio).
* **Speaker memory:** map `spk_0/spk_1` to names in your scribe app; cache by meeting context.
* **Redaction toggle in Shortcut:** add a prompt in Shortcut to set `x-phI: true/false` header; route to HIPAA vs non‑HIPAA provider.
* **Timestamps:** request word-level timestamps and attach to each turn if your model supports it.

---

## Definition of Done

* iPhone Share Sheet → Shortcut → `/api/ingest` → server-side Gemini/Vertex → webhook to scribe app works end-to-end.
* No secrets in client bundle.
* Tests/QA pass; sample real-world recording produces a clean diarized transcript usable by your note builders.
