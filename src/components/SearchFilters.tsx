import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListingFilters, LoginMethod } from '@/types/listing';
import { useState } from 'react';

interface SearchFiltersProps {
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
}

const SearchFilters = ({ filters, onFiltersChange }: SearchFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleMinPriceChange = (value: string) => {
    onFiltersChange({
      ...filters,
      minPrice: value ? parseInt(value) : null,
    });
  };

  const handleMaxPriceChange = (value: string) => {
    onFiltersChange({
      ...filters,
      maxPrice: value ? parseInt(value) : null,
    });
  };

  const handleLoginMethodChange = (value: string) => {
    onFiltersChange({
      ...filters,
      loginMethod: value === 'all' ? null : (value as LoginMethod),
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      minPrice: null,
      maxPrice: null,
      loginMethod: null,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.loginMethod !== null;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Cobra, Hip Hop, Evo Guns..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 input-gaming"
          />
        </div>
        <Button
          variant={showFilters ? 'gaming' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card-gaming p-4 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Min Price (₹)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minPrice ?? ''}
                onChange={(e) => handleMinPriceChange(e.target.value)}
                className="input-gaming"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Max Price (₹)
              </label>
              <Input
                type="number"
                placeholder="99999"
                value={filters.maxPrice ?? ''}
                onChange={(e) => handleMaxPriceChange(e.target.value)}
                className="input-gaming"
              />
            </div>

            {/* Login Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Login Method
              </label>
              <Select
                value={filters.loginMethod ?? 'all'}
                onValueChange={handleLoginMethodChange}
              >
                <SelectTrigger className="input-gaming">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="FB">Facebook</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="VK">VK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
