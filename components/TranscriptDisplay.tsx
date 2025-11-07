import { type TranscriptData, type TranscriptEntry } from '../types';
import { downloadJson } from '../utils/fileUtils';
import { toEpicScribeFormat, downloadTextFile } from '../utils/formatUtils';
import { DownloadIcon, InfoIcon, RefreshCwIcon, UserIcon, UserMdIcon } from './icons';

interface TranscriptDisplayProps {
    transcriptData: TranscriptData;
    onReset: () => void;
}

const SpeakerIcon = ({ speaker }: { speaker: string }) => {
    if (speaker.toLowerCase() === 'doctor') {
        return <UserMdIcon className="w-5 h-5 text-blue-600" />;
    }
    return <UserIcon className="w-5 h-5 text-teal-600" />;
};

const TranscriptLine = ({ entry }: { entry: TranscriptEntry }) => {
    const isDoctor = entry.speaker.toLowerCase() === 'doctor';
    return (
        <div className={`flex gap-4 p-4 rounded-lg ${isDoctor ? 'bg-blue-50/70' : 'bg-teal-50/70'}`}>
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border flex items-center justify-center shadow-sm">
                <SpeakerIcon speaker={entry.speaker} />
            </div>
            <div className="flex-1">
                <div className="flex items-baseline justify-between">
                    <p className={`font-bold ${isDoctor ? 'text-blue-800' : 'text-teal-800'}`}>
                        {entry.speaker}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">{entry.timestamp}</p>
                </div>
                <p className="mt-1 text-slate-700">{entry.line}</p>
            </div>
        </div>
    );
};

export const TranscriptDisplay = ({ transcriptData, onReset }: TranscriptDisplayProps) => {
    const handleDownloadJson = () => {
        const filename = `${transcriptData.consultationDate}_${transcriptData.patientId}_transcript.json`;
        downloadJson(transcriptData, filename);
    };

    const handleDownloadText = () => {
        const content = toEpicScribeFormat(transcriptData);
        const filename = `${transcriptData.consultationDate}_${transcriptData.patientId}_transcript.txt`;
        downloadTextFile(content, filename);
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800">Transcript Generated</h2>
                <p className="text-slate-500">
                    Patient ID: <span className="font-semibold text-slate-600">{transcriptData.patientId}</span> | Date: <span className="font-semibold text-slate-600">{transcriptData.consultationDate}</span>
                </p>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-slate-700">Storage Instructions</h3>
                    <p className="text-sm text-slate-600">
                        Download the transcript file and upload it to your designated Google Drive folder. This structured JSON format is optimized for future AI processing and analysis.
                    </p>
                </div>
            </div>

            {/* Mental Status Exam Section */}
            {(transcriptData as any).mentalStatusExam && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-5 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                        🔬 Mental Status Exam Observations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-md shadow-sm">
                            <h4 className="font-semibold text-purple-800 text-sm mb-2">Appearance</h4>
                            <p className="text-sm text-slate-700">{(transcriptData as any).mentalStatusExam.appearance}</p>
                        </div>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                            <h4 className="font-semibold text-purple-800 text-sm mb-2">Behavior</h4>
                            <p className="text-sm text-slate-700">{(transcriptData as any).mentalStatusExam.behavior}</p>
                        </div>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                            <h4 className="font-semibold text-purple-800 text-sm mb-2">Affect</h4>
                            <p className="text-sm text-slate-700">{(transcriptData as any).mentalStatusExam.affect}</p>
                        </div>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                            <h4 className="font-semibold text-purple-800 text-sm mb-2">Speech</h4>
                            <p className="text-sm text-slate-700">{(transcriptData as any).mentalStatusExam.speech}</p>
                        </div>
                    </div>

                    {(transcriptData as any).clinicalObservations && (transcriptData as any).clinicalObservations.length > 0 && (
                        <div className="mt-4 bg-white p-3 rounded-md shadow-sm">
                            <h4 className="font-semibold text-purple-800 text-sm mb-2">Clinical Observations</h4>
                            <ul className="space-y-2">
                                {(transcriptData as any).clinicalObservations.map((obs: any, idx: number) => (
                                    <li key={idx} className="text-sm text-slate-700">
                                        <span className="font-mono text-xs text-slate-500">[{obs.timestamp}]</span> {obs.observation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto p-4 bg-white rounded-lg border border-slate-200 shadow-inner space-y-4">
                {transcriptData.transcript.map((entry, index) => (
                    <TranscriptLine key={index} entry={entry} />
                ))}
            </div>

            <div className="flex flex-col gap-3 mt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleDownloadText}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all duration-300"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download for Epic-Scribe (TXT)
                    </button>
                    <button
                        onClick={handleDownloadJson}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download JSON
                    </button>
                </div>
                <button
                    onClick={onReset}
                    className="w-full flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-lg hover:bg-slate-300 transition-all duration-300"
                >
                    <RefreshCwIcon className="w-5 h-5" />
                    Start New Transcript
                </button>
            </div>
        </div>
    );
};