import { useState } from 'react';
import { FileTextIcon } from './icons';

interface TextTranscriptInputProps {
    onTranscriptChange: (transcript: string) => void;
}

export const TextTranscriptInput = ({ onTranscriptChange }: TextTranscriptInputProps) => {
    const [transcript, setTranscript] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setTranscript(value);
        onTranscriptChange(value);
    };

    const handleClear = () => {
        setTranscript('');
        onTranscriptChange('');
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                    <FileTextIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Paste your Google Meet transcript below</span>
                </div>
                {transcript && (
                    <button
                        onClick={handleClear}
                        className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
            <textarea
                value={transcript}
                onChange={handleChange}
                placeholder="Paste transcript here... (e.g., from Google Meet, Zoom, or any plain text transcript)"
                className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y font-mono text-sm"
                spellCheck={false}
            />
            <p className="text-xs text-slate-500">
                The AI will identify speakers and add proper attribution (Doctor/Patient). Timestamps will be estimated if not present.
            </p>
        </div>
    );
};
