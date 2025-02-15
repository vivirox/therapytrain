import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
<<<<<<< HEAD
  value: DateRange | undefined;
  onChange: (date: DateRange | undefined) => void;
=======
  startDate?: string;
  endDate?: string;
  onDateChange: (startDate: string | undefined, endDate: string | undefined) => void;
>>>>>>> origin/main
  className?: string;
}

export function DateRangePicker({
<<<<<<< HEAD
  value,
  onChange,
  className,
}: DateRangePickerProps) {
=======
  startDate,
  endDate,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      return {
        from: new Date(startDate),
        to: new Date(endDate),
      };
    }
    return undefined;
  });

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    onDateChange(
      range?.from?.toISOString(),
      range?.to?.toISOString()
    );
  };

>>>>>>> origin/main
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
<<<<<<< HEAD
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} -{' '}
                  {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
=======
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
>>>>>>> origin/main
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
<<<<<<< HEAD
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
=======
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
>>>>>>> origin/main
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 