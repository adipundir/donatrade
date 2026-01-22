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
        <div className="badge badge-privacy">
            <ShieldCheck className="w-3 h-3" />
            <span>Private</span>
        </div>
    );
};
