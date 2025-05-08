// src/components/ui/SimpleDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';

const SimpleDropdown = ({ trigger, children, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger button */}
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <div className={`absolute z-50 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 
                         ${align === 'right' ? 'right-0' : 'left-0'}`}>
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

// Dropdown item component
export const SimpleDropdownItem = ({ children, onClick, className = "" }) => {
    return (
        <button
            onClick={onClick}
            className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${className}`}
            role="menuitem"
        >
            {children}
        </button>
    );
};

// Dropdown divider component
export const SimpleDropdownDivider = () => {
    return <div className="border-t border-gray-100 my-1"></div>;
};

// Dropdown label/header component
export const SimpleDropdownLabel = ({ children }) => {
    return (
        <div className="px-4 py-2 text-sm font-medium text-gray-900">
            {children}
        </div>
    );
};

export default SimpleDropdown;