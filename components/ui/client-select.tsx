'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectTrigger, SelectValue } from './select';

interface ClientSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children: React.ReactNode;
}

export function ClientSelect({
  value,
  onValueChange,
  disabled,
  placeholder,
  children,
}: ClientSelectProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className="text-muted-foreground">{placeholder}</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
