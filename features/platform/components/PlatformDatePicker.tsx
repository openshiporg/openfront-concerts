'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface PlatformDatePickerProps {
  /** Controlled selected date */
  value?: Date
  /** Called when the user picks a date */
  onChange?: (date: Date | undefined) => void
  /** Placeholder text when no date is selected */
  placeholder?: string
  /** Additional class names for the trigger button */
  className?: string
  /** Disable dates before this date */
  fromDate?: Date
  /** Disable dates after this date */
  toDate?: Date
  /** Disable the picker entirely */
  disabled?: boolean
  /** Show a short display format: "Mar 10" instead of "Mar 10, 2026" */
  shortFormat?: boolean
}

/**
 * PlatformDatePicker
 *
 * A Radix-powered date picker built on top of the existing
 * shadcn/ui Calendar and Popover components. Do NOT modify
 * components/ui/calendar.tsx or components/ui/popover.tsx —
 * this wrapper lives in features/platform/components/ and is
 * the canonical date picker for all platform pages.
 *
 * Usage:
 *   <PlatformDatePicker
 *     value={date}
 *     onChange={setDate}
 *     placeholder="Select date"
 *   />
 */
export function PlatformDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  fromDate,
  toDate,
  disabled = false,
  shortFormat = false,
}: PlatformDatePickerProps) {
  const displayFormat = shortFormat ? 'MMM d' : 'MMM d, yyyy'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 h-8 px-3 rounded border border-border bg-background',
            'text-xs font-medium transition-colors',
            'hover:bg-muted disabled:opacity-50 disabled:pointer-events-none',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon size={12} className="shrink-0 text-muted-foreground" />
          {value ? (
            <span className="tabular-nums">{format(value, displayFormat)}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
