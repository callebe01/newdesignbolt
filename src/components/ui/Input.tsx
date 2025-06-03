import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, fullWidth = false, ...props }, ref) => {
    const inputClasses = `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      error ? 'border-destructive focus-visible:ring-destructive' : ''
    } ${className}`;
    
    const containerClasses = `${fullWidth ? 'w-full' : ''} ${className}`;
    
    return (
      <div className={containerClasses}>
        {label && (
          <label className="text-sm font-medium leading-none mb-2 block">
            {label}
          </label>
        )}
        <input ref={ref} className={inputClasses} {...props} />
        {error && (
          <p className="text-destructive text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';