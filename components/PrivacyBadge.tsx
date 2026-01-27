import { FC } from 'react';
import { ShieldCheck } from 'lucide-react';

interface PrivacyBadgeProps {
    variant?: 'default' | 'large';
}

/**
 * Comic-style privacy badge.
 */
export const PrivacyBadge: FC<PrivacyBadgeProps> = ({ variant = 'default' }) => {
    if (variant === 'large') {
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 border-3 border-accent bg-accent-light" style={{ borderColor: 'var(--accent)' }}>
                <ShieldCheck className="w-5 h-5 text-accent" />
                <span className="text-sm text-accent uppercase tracking-wide" style={{ fontFamily: "'Bangers', cursive" }}>
                    Private Ownership Enabled!
                </span>
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-[#0066FF] bg-[#EBF3FF] rounded-none shadow-[2px_2px_0px_0px_#0066FF] mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0066FF] fill-[#0066FF]/10" />
            <span className="text-[11px] font-bold text-[#0066FF] uppercase tracking-wider" style={{ fontFamily: "'Bangers', cursive" }}>
                Private
            </span>
        </div>
    );
};
