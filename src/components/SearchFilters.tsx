import { Search, Filter, X, ArrowDownUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListingFilters, LoginMethod, ListingSort } from '@/types/listing';
import { useState } from 'react';

interface SearchFiltersProps {
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
}

const SearchFilters = ({ filters, onFiltersChange }: SearchFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const update = (patch: Partial<ListingFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      minPrice: null,
      maxPrice: null,
      loginMethod: null,
      minLevel: null,
      emailBinded: 'any',
      sort: 'newest',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.loginMethod !== null ||
    (filters.minLevel ?? null) !== null ||
    (filters.emailBinded && filters.emailBinded !== 'any') ||
    (filters.sort && filters.sort !== 'newest');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Cobra, Hip Hop, Evo Guns..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-10 input-gaming"
          />
        </div>

        <Select
          value={filters.sort ?? 'newest'}
          onValueChange={(v) => update({ sort: v as ListingSort })}
        >
          <SelectTrigger className="w-[150px] input-gaming">
            <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="level_desc">Level: Highest</SelectItem>
          </SelectContent>
        </Select>

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

      {showFilters && (
        <div className="card-gaming p-4 animate-slide-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Min Price (₹)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minPrice ?? ''}
                onChange={(e) =>
                  update({ minPrice: e.target.value ? parseInt(e.target.value) : null })
                }
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
                onChange={(e) =>
                  update({ maxPrice: e.target.value ? parseInt(e.target.value) : null })
                }
                className="input-gaming"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Min Level
              </label>
              <Input
                type="number"
                placeholder="any"
                value={filters.minLevel ?? ''}
                onChange={(e) =>
                  update({ minLevel: e.target.value ? parseInt(e.target.value) : null })
                }
                className="input-gaming"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Login Method
              </label>
              <Select
                value={filters.loginMethod ?? 'all'}
                onValueChange={(v) =>
                  update({ loginMethod: v === 'all' ? null : (v as LoginMethod) })
                }
              >
                <SelectTrigger className="input-gaming">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="FB">Facebook</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="VK">VK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email Binded
              </label>
              <Select
                value={filters.emailBinded ?? 'any'}
                onValueChange={(v) =>
                  update({ emailBinded: v as 'any' | 'yes' | 'no' })
                }
              >
                <SelectTrigger className="input-gaming">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
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
