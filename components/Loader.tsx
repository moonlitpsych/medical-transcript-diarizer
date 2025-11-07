interface LoaderProps {
    message: string;
}

export const Loader = ({ message }: LoaderProps) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-slate-600">{message || 'Processing...'}</p>
            <p className="text-sm text-slate-500 text-center">Please keep this window open. This may take a few minutes for longer videos.</p>
        </div>
    );
};