import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className={`theme-switch ${className}`} htmlFor="theme-checkbox">
      <input 
        type="checkbox" 
        id="theme-checkbox" 
        checked={theme === 'dark'} 
        onChange={toggleTheme} 
      />
      <div className="slider round"></div>
    </label>
  );
};

export default ThemeToggle;
