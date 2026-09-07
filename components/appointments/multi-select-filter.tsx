'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
  category?: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  showColors?: boolean;
  groupBy?: keyof MultiSelectOption;
  maxDisplayItems?: number;
  className?: string;
}

export function MultiSelectFilter({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  showColors = false,
  groupBy,
  maxDisplayItems = 3,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(
      option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Group options if groupBy is specified
  const groupedOptions = useMemo(() => {
    if (!groupBy) return { '': filteredOptions };

    return filteredOptions.reduce(
      (groups, option) => {
        const groupKey = option[groupBy] || 'Other';
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(option);
        return groups;
      },
      {} as Record<string, MultiSelectOption[]>
    );
  }, [filteredOptions, groupBy]);

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    return options.filter(option => value.includes(option.value));
  }, [options, value]);

  // Handle option toggle
  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  // Handle select all in group
  const selectAllInGroup = (groupOptions: MultiSelectOption[]) => {
    const groupValues = groupOptions.map(option => option.value);
    const allSelected = groupValues.every(val => value.includes(val));

    if (allSelected) {
      // Deselect all in group
      onChange(value.filter(val => !groupValues.includes(val)));
    } else {
      // Select all in group
      const newValue = [...new Set([...value, ...groupValues])];
      onChange(newValue);
    }
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                {selectedOptions.slice(0, maxDisplayItems).map(option => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="gap-1 text-xs"
                  >
                    {showColors && option.color && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </Badge>
                ))}
                {selectedOptions.length > maxDisplayItems && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedOptions.length - maxDisplayItems} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>

            {/* Clear all button */}
            {value.length > 0 && (
              <>
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear all ({value.length})
                  </Button>
                </div>
                <Separator />
              </>
            )}

            {/* Render grouped or ungrouped options */}
            {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
              <CommandGroup key={groupName} heading={groupName || undefined}>
                {/* Group select all button */}
                {groupBy && groupOptions.length > 1 && (
                  <CommandItem
                    onSelect={() => selectAllInGroup(groupOptions)}
                    className="font-medium"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        groupOptions.every(opt => value.includes(opt.value))
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    Select all {groupName}
                  </CommandItem>
                )}

                {/* Individual options */}
                {groupOptions.map(option => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value.includes(option.value)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 items-center gap-2">
                      {showColors && option.color && (
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
