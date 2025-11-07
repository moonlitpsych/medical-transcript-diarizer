import { type TranscriptData } from '../types';

/**
 * Converts transcript data to epic-scribe format
 * Format: "Speaker Name: Spoken content"
 */
export function toEpicScribeFormat(transcriptData: TranscriptData): string {
    const lines: string[] = [];

    // Add header
    lines.push(`Date: ${transcriptData.consultationDate}`);
    lines.push(`Patient ID: ${transcriptData.patientId}`);
    lines.push('');

    // Add transcript lines
    for (const entry of transcriptData.transcript) {
        lines.push(`${entry.speaker}: ${entry.line}`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Downloads text content as a file
 */
export function downloadTextFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
