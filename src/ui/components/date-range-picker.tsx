import { cn } from '@/lib/utils';
import { Input } from '@/ui/components/input';

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  labels: { from: string; to: string };
  className?: string;
}

export function DateRangePicker({ value, onChange, labels, className }: DateRangePickerProps) {
  return (
    <div
      data-slot="date-range-picker"
      className={cn('flex flex-col gap-2 sm:flex-row sm:items-end', className)}
    >
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
        <span>{labels.from}</span>
        <Input
          type="date"
          value={value.from}
          aria-label={labels.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
        <span>{labels.to}</span>
        <Input
          type="date"
          value={value.to}
          aria-label={labels.to}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
      </label>
    </div>
  );
}
