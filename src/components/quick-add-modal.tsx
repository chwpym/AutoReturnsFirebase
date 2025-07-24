
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ComboboxOption } from './search-combobox';

interface QuickAddModalProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  formComponent: React.ElementType;
  onSaveSuccess: (newItem: ComboboxOption) => void;
  formProps?: any; // To pass initial values, etc.
}

export function QuickAddModal({
  trigger,
  title,
  description,
  formComponent: FormComponent,
  onSaveSuccess,
  formProps = {},
}: QuickAddModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSaveSuccess = (newItem: ComboboxOption) => {
    onSaveSuccess(newItem);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormComponent 
            {...formProps}
            onSaveSuccess={handleSaveSuccess}
            onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
