'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface FilterState {
  startDate: Date | undefined;
  endDate: Date | undefined;
  category: string | undefined;
}

interface FilterBarProps {
  categories: Category[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({ categories, filters, onFilterChange }: FilterBarProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.startDate,
    to: filters.endDate,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    onFilterChange({
      ...filters,
      startDate: range.from,
      endDate: range.to,
    });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({
      ...filters,
      category: value === 'all' ? undefined : value,
    });
  };

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({ startDate: undefined, endDate: undefined, category: undefined });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.category;

  const dateRangeDisplay = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
      : `${format(dateRange.from, 'MMM d, yyyy')} – Select end date`
    : 'Select date range';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-[240px] justify-start text-left font-normal ${!dateRange.from && 'text-muted-foreground'}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRangeDisplay}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>

      <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
