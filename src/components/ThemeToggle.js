'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className, style, showLabel = false }) {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        if (showLabel) {
            return (
                <button className={className || "sidebar-link"} style={{ ...style, visibility: 'hidden' }}>
                    <Moon size={20} />
                    Chế độ sáng/tối
                </button>
            );
        }
        return (
            <button className={className || "btn-icon"} style={{ ...style, visibility: 'hidden' }}>
                <Moon size={18} />
            </button>
        );
    }

    const isDark = theme === 'dark';

    if (showLabel) {
        return (
            <button
                className={className || "sidebar-link"}
                style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', ...style }}
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
            </button>
        );
    }

    return (
        <button
            className={className || "btn-icon"}
            style={style}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={`Chuyển sang chế độ ${isDark ? 'sáng' : 'tối'}`}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}
