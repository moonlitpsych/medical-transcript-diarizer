// Converts a File object to a base64 encoded string
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // result is a data URL (e.g., "data:video/mp4;base64,THE_BASE64_STRING")
            // We need to strip the prefix "data:*/*;base64,"
            const base64 = result.split(',')[1];
            if (!base64) {
                reject(new Error("Failed to extract base64 string from file."));
            } else {
                resolve(base64);
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

// Creates and triggers a download for a JSON file
export const downloadJson = (data: object, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};