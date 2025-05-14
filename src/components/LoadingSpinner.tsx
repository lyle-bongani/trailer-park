import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    fullScreen = false
}) => {
    const sizeClasses = {
        small: 'w-6 h-6 border-2',
        medium: 'w-10 h-10 border-3',
        large: 'w-16 h-16 border-4',
    };

    const spinner = (
        <div className={`${sizeClasses[size]} rounded-full border-tp-green border-t-transparent animate-spin`}></div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-tp-black/80 z-50 flex items-center justify-center">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-4">
            {spinner}
        </div>
    );
};

export default LoadingSpinner; 