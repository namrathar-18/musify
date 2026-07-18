import { Search as SearchIcon } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'What do you want to play?' }) {
  return (
    <div className="relative max-w-md">
      <SearchIcon
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-900 border-none rounded-full pl-10 pr-4 py-2 text-white placeholder-muted focus:outline-none focus:ring-2 focus:ring-white"
      />
    </div>
  );
}
