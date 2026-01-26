'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Comic-style theme toggle component.
 */
export const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-10 h-10 border-3 border-foreground" />;
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn btn-secondary h-10 px-3 flex items-center gap-2"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <>
                    <Sun className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase" style={{ fontFamily: "'Bangers', cursive" }}>Light Mode</span>
                </>
            ) : (
                <>
                    <Moon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase" style={{ fontFamily: "'Bangers', cursive" }}>Dark Mode</span>
                </>
            )}
        </button>
    );
};
