// =============================================================================
// DEWPORTAL FRONTEND - FORM FIELD COMPONENT
// =============================================================================
// Reusable form field wrapper with label, error, and hint support.
// Works with React Hook Form.
// =============================================================================

'use client';

import {
  FieldValues,
  Path,
  useFormContext,
  Controller,
  ControllerProps,
  ControllerRenderProps,
} from 'react-hook-form';
import { Input, InputProps } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { ReactElement, ElementType } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FormFieldProps<T extends FieldValues>
  extends Omit<InputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'defaultValue'> {
  name: Path<T>;
  label?: string;
  rules?: ControllerProps<T>['rules'];
  defaultValue?: T[Path<T>];
  render?: (field: ControllerRenderProps<T, Path<T>>) => ReactElement;
  as?: ElementType;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function FormField<T extends FieldValues>({
  name,
  label,
  rules,
  defaultValue,
  render,
  as: Component = Input,
  className,
  ...props
}: FormFieldProps<T>) {
  const {
    control,
    formState: { errors },
  } = useFormContext<T>();

  const error = errors[name]?.message as string | undefined;

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue}
      rules={rules}
      render={({ field: { value, onChange, onBlur, ref, ...fieldProps } }) => {
        // If custom render function is provided, use it
        if (render) {
          return render({
            value,
            onChange,
            onBlur,
            ref,
            ...fieldProps,
          } as ControllerRenderProps<T, Path<T>>) as ReactElement;
        }

        // Otherwise render the default component (Input)
        return (
          <Component
            {...props}
            {...fieldProps}
            ref={ref}
            value={value as string | number | readonly string[] | undefined}
            onChange={onChange}
            onBlur={onBlur}
            label={label}
            error={error}
            className={cn(className, {
              'border-error focus:ring-error': error,
            })}
          />
        );
      }}
    />
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default FormField;