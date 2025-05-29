import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
    message: string;
    icon?: React.ReactNode;
    open: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({
    message,
    icon,
    open,
    onClose,
    duration = 3000
}: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Allow for fade out animation before calling onClose
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [open, duration, onClose]);

    if (!open && !isVisible) return null;

    return (
        <div
            className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="bg-[#1A1A1A] rounded-lg shadow-xl flex items-center p-4 max-w-md border border-gray-800/50">
                {icon && <div className="mr-3">{icon}</div>}
                <div className="text-white font-light">{message}</div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="ml-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
} 