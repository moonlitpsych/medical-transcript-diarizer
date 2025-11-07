import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  title: 'Medical Transcript Diarizer',
  description: 'AI-powered medical consultation transcription and speaker diarization using Google Gemini',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
