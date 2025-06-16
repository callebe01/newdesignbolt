import React from 'react';

// components/ui/Button.tsx

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantStyles: Record<string, string> = {
    primary:    'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary:  'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    accent:     'bg-accent text-accent-foreground hover:bg-accent/90',
    destructive:'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success:    'bg-success text-success-foreground hover:bg-success/90',

    // Updated outline & ghost to include text color
    outline: 'border border-input bg-background text-foreground hover:bg-muted hover:text-accent-foreground',
    ghost:   'bg-transparent text-foreground hover:bg-muted hover:text-accent-foreground',
  };
  
  const sizeStyles: Record<string, string> = {
    sm:   'h-9 px-3 text-xs',
    md:   'h-10 px-4 py-2',
    lg:   'h-11 px-8 text-base',
    icon: 'h-10 w-10',
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`;
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
