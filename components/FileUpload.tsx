import { useState, useCallback } from 'react';
import { UploadCloudIcon, FileVideoIcon } from './icons';

interface FileUploadProps {
    onFileChange: (file: File | null) => void;
}

export const FileUpload = ({ onFileChange }: FileUploadProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = useCallback((file: File) => {
        if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
            setSelectedFile(file);
            onFileChange(file);
        } else {
            alert('Please select a valid audio or video file.');
            setSelectedFile(null);
            onFileChange(null);
        }
    }, [onFileChange]);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        onFileChange(null);
    };

    return (
        <div>
            {!selectedFile ? (
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input
                        type="file"
                        id="file-input"
                        className="hidden"
                        accept="video/*,audio/*"
                        onChange={handleFileSelect}
                    />
                    <div className="flex flex-col items-center justify-center text-slate-500">
                        <UploadCloudIcon className="w-12 h-12 mb-3" />
                        <p className="font-semibold">
                            <span className="text-blue-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-sm">Audio: M4A, WAV, MP3 • Video: MP4, MOV, WEBM</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between p-4 bg-slate-100 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <FileVideoIcon className="w-6 h-6 text-blue-500" />
                        <span className="font-medium text-slate-700 truncate">{selectedFile.name}</span>
                    </div>
                    <button
                        onClick={clearFile}
                        className="text-slate-500 hover:text-red-600 font-bold text-lg"
                        title="Remove file"
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>
    );
};