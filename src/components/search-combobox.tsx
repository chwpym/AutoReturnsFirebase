
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { collection, getDocs, query, where, limit, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface SearchComboboxProps {
  collectionName: 'clientes' | 'fornecedores' | 'pecas';
  labelField: string | string[];
  searchField: string;
  placeholder: string;
  emptyMessage: string;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  queryConstraints?: QueryConstraint[];
  disabled?: boolean;
}

const formatLabel = (docData: any, labelField: string | string[]): string => {
  if (Array.isArray(labelField)) {
    const parts = labelField.map(field => docData[field]).filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0]} - (${parts.slice(1).join(' ')})`;
    }
    return parts[0] || '';
  }
  return docData[labelField] || '';
}

export function SearchCombobox({
  collectionName,
  labelField,
  searchField,
  placeholder,
  emptyMessage,
  value,
  onChange,
  className,
  queryConstraints = [],
  disabled = false,
}: SearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  
  // Create a stable reference to queryConstraints to avoid re-running useEffect unnecessarily
  const constraintsRef = React.useRef(queryConstraints);
  React.useEffect(() => {
    constraintsRef.current = queryConstraints;
  }, [queryConstraints]);


  const fetchOptions = React.useCallback(async () => {
    setLoading(true);
    try {
      const baseQuery = [
        where('status', '==', 'Ativo'),
        ...constraintsRef.current
      ];

      const q = query(
        collection(db, collectionName),
        ...baseQuery,
        orderBy(searchField),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedOptions = querySnapshot.docs.map((doc) => ({
        value: doc.id,
        label: formatLabel(doc.data(), labelField),
      }));
      setOptions(fetchedOptions);
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, labelField, searchField]);

  React.useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {loading ? (
                <CommandItem disabled>Carregando...</CommandItem>
              ) : (
                options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label} 
                    onSelect={() => {
                      onChange(option.value === value ? null : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
