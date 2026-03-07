
import React from 'react';
import { COLORS } from '../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 text-lg active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: `bg-[#4B5EAA] text-white shadow-sm hover:bg-[#3D4D8C]`,
    secondary: `bg-[#8E9491] text-white hover:bg-[#787D7A]`,
    danger: `bg-[#BC4749] text-white hover:bg-[#A33B3D]`,
    outline: `border-2 border-[#EAEAEA] bg-white text-[#2D3436] hover:bg-[#F9F8F6]`,
    ghost: `bg-transparent text-[#4B5EAA] hover:bg-[#F1F3FA]`
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
