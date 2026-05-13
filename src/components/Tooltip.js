'use client';
import { useState, useRef, useEffect } from 'react';

export default function Tooltip({ children, content, position = 'top' }) {
    const [visible, setVisible] = useState(false);
    const containerRef = useRef(null);

    const showTooltip = () => {
        if (content) setVisible(true);
    };

    const hideTooltip = () => {
        setVisible(false);
    };

    const toggleTooltip = (e) => {
        if (!content) return;
        e.stopPropagation();
        setVisible(!visible);
    };

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setVisible(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        };
    }, []);

    const positionStyles = {
        top: {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-8px)',
        },
        bottom: {
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(8px)',
        },
        left: {
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%) translateX(-8px)',
        },
        right: {
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%) translateX(8px)',
        }
    };

    return (
        <div 
            ref={containerRef}
            style={{ 
                position: 'relative', 
                display: 'inline-flex', 
                alignItems: 'center',
            }}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onClick={toggleTooltip} 
            onTouchStart={(e) => {
                if (!visible) {
                    e.stopPropagation();
                    showTooltip();
                }
            }}
        >
            {children}
            {visible && content && (
                <div 
                    style={{
                        position: 'absolute',
                        zIndex: 9999,
                        background: 'rgba(33, 37, 41, 0.95)', 
                        color: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        lineHeight: '1.4',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        width: 'max-content',
                        maxWidth: '220px',
                        textAlign: 'center',
                        ...positionStyles[position],
                        transition: 'opacity 0.15s ease-in-out'
                    }}
                >
                    {content}
                    <div 
                        style={{
                            position: 'absolute',
                            width: '0',
                            height: '0',
                            borderStyle: 'solid',
                            borderColor: 'transparent',
                            ...(position === 'top' ? {
                                top: '100%',
                                left: '50%',
                                marginLeft: '-6px',
                                borderWidth: '6px 6px 0 6px',
                                borderTopColor: 'rgba(33, 37, 41, 0.95)'
                            } : {}),
                            ...(position === 'bottom' ? {
                                bottom: '100%',
                                left: '50%',
                                marginLeft: '-6px',
                                borderWidth: '0 6px 6px 6px',
                                borderBottomColor: 'rgba(33, 37, 41, 0.95)'
                            } : {}),
                            ...(position === 'left' ? {
                                left: '100%',
                                top: '50%',
                                marginTop: '-6px',
                                borderWidth: '6px 0 6px 6px',
                                borderLeftColor: 'rgba(33, 37, 41, 0.95)'
                            } : {}),
                            ...(position === 'right' ? {
                                right: '100%',
                                top: '50%',
                                marginTop: '-6px',
                                borderWidth: '6px 6px 6px 0',
                                borderRightColor: 'rgba(33, 37, 41, 0.95)'
                            } : {})
                        }}
                    />
                </div>
            )}
        </div>
    );
}
