export interface TranscriptEntry {
    speaker: string;
    line: string;
    timestamp: string; // e.g., "00:01:23"
}

export interface TranscriptData {
    patientId: string;
    consultationDate: string;
    transcript: TranscriptEntry[];
}