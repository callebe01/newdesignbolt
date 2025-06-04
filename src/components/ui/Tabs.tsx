import React, { useState } from 'react';

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  defaultValue, 
  value: controlledValue, 
  onValueChange,
  children,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(defaultValue);
  const value = controlledValue ?? localValue;

  const handleValueChange = (newValue: string) => {
    setLocalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement, {
            selectedValue: value,
            onValueChange: handleValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  selectedValue?: string;
  onValueChange?: (value: string) => void;
}

export const TabsList: React.FC<TabsListProps> = ({ 
  children, 
  className = '',
  selectedValue,
  onValueChange
}) => {
  return (
    <div className={`inline-flex p-1 bg-muted rounded-lg mb-4 ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement, {
            active: child.props.value === selectedValue,
            onClick: () => onValueChange?.(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  children,
  className = '',
  active,
  onClick
}) => {
  return (
    <button
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
        ${active 
          ? 'bg-background text-foreground shadow-sm' 
          : 'text-muted-foreground hover:bg-background/50'
        } ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  selectedValue?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
  value,
  children,
  className = '',
  selectedValue
}) => {
  if (value !== selectedValue) {
    return null;
  }

  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};