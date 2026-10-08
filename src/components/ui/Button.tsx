import React, { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'white-bordered' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  children: ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base template styling: zero border-radius, uppercase, transition
  const baseStyle: React.CSSProperties = {
    borderRadius: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.65 : 1,
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
  };

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '6px 14px', fontSize: '0.72rem' },
    md: { padding: '10px 24px', fontSize: '0.78rem' },
    lg: { padding: '14px 32px', fontSize: '0.85rem' },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: '#ee5057',
      color: '#ffffff',
    },
    'white-bordered': {
      backgroundColor: 'transparent',
      color: '#ffffff',
      border: '2px solid #ffffff',
    },
    secondary: {
      backgroundColor: '#1f3646',
      color: '#ffffff',
    },
    danger: {
      backgroundColor: '#dc3545',
      color: '#ffffff',
    },
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  return (
    <button
      className={`btn ${variant === 'primary' ? 'btn-primary' : ''} ${className}`.trim()}
      style={combinedStyles}
      disabled={disabled}
      {...props}
    >
      {icon && <i className={`fa ${icon} mr-2`} aria-hidden="true"></i>}
      {children}
    </button>
  );
};

export default Button;
