// Mock for Spinner component to fix Jest path alias issues
import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'default',
  className,
}) => (
  <div
    data-testid="spinner"
    className={`spinner ${size} ${className || ''}`}
    role="status"
    aria-label="Loading"
  >
    Loading...
  </div>
);
