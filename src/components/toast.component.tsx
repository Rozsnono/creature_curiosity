import { useEffect, useState } from "react"

export default function Toast({ index, toast, type, onClose }: { index: number, toast: string, type: "success" | "error", onClose: (index: number) => void }) {

    const [_toast, setToast] = useState<string>("");

    useEffect(() => {
        setToast(toast);
    }, [toast])

    useEffect(() => {
        const interval = setInterval(() => {
            setToast("");
            onClose(index);
        }, 3000);

        return () => clearInterval(interval);
    }, [])

    const handleRemoveToast = () => {
        setToast("");
        onClose(index);
    }

    const getTopPosition = (index: number) => {
        return `${index * 4 + 1}rem`;
    }
    
    return (
        <main className={`fixed right-4 z-50 gap-2 flex flex-col`} style={{ top: getTopPosition(index) }}>
            <div onClick={handleRemoveToast} key={toast} id="toast-default" className={`flex items-center w-full max-w-sm p-4 text-body bg-neutral-primary-soft rounded-base shadow-xs rounded-lg cursor-pointer ${type === "success" ? "bg-emerald-600/75" : "bg-red-500/65"}`} role="alert">
                
                {
                    type === "success" ? (
                        <svg className="w-6 h-6 text-fg-brand" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm3.75-13.75-4.5 4.5-2.25-2.25" /></svg>
                    ) : (
                        <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6"/></svg>
                    )
                }
                <div className="ms-2.5 text-sm border-s border-default ps-3.5">{toast}</div>
            </div>
        </main>


    )
}