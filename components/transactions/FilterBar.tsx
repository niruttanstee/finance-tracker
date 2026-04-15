'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  category: string | null | undefined;
}

interface FilterBarProps {
  categories: Category[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({ categories, filters, onFilterChange }: FilterBarProps) {
  const handleCategoryChange = (value: string | null) => {
    onFilterChange({
      category: !value || value === 'all' ? undefined : value === 'uncategorized' ? null : value,
    });
  };

  const clearFilters = () => {
    onFilterChange({ category: undefined });
  };

  const hasActiveFilters = filters.category !== undefined;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={filters.category === null ? 'uncategorized' : filters.category || 'all'} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="uncategorized">Uncategorized</SelectItem>
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
