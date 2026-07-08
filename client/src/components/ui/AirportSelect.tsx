import { useEffect, useMemo, useState } from 'react';
import type { Airport } from '../../types';
import { ChevronDownIcon } from './icons';

/**
 * Searchable airport combobox for the booking dock: shows the IATA code
 * when idle, and while focused filters airports by code, city, airport
 * name or country. An empty value means "anywhere" (no filter).
 */
export default function AirportSelect({
  label,
  value,
  onChange,
  airports,
  hintClass = 'text-brand-600/80',
  align = 'left',
  placeholder = 'Any',
}: {
  label: string;
  value: string;
  onChange: (iataCode: string) => void;
  airports: Airport[];
  hintClass?: string;
  align?: 'left' | 'right';
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = q
      ? airports.filter(
          (a) =>
            a.iataCode.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q) ||
            a.country.toLowerCase().includes(q)
        )
      : airports;
    return list.slice(0, 8);
  }, [airports, q]);

  useEffect(() => setActive(0), [q]);

  const selected = airports.find((a) => a.iataCode === value);

  const commit = (airport: Airport) => {
    onChange(airport.iataCode);
    setOpen(false);
  };

  const handleBlur = () => {
    if (open) {
      const typed = query.trim();
      if (!typed) {
        onChange('');
      } else {
        // Accept an exact code, or the single remaining match, on blur
        const exact = airports.find((a) => a.iataCode.toLowerCase() === typed.toLowerCase());
        if (exact) onChange(exact.iataCode);
        else if (filtered.length === 1) onChange(filtered[0].iataCode);
      }
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) {
        e.preventDefault();
        commit(filtered[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft mb-0.5">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          value={open ? query : value}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-label={`${label} airport`}
          className="w-full h-8 bg-transparent text-xl font-extrabold tracking-tight text-ink placeholder:text-slate-300 focus:outline-none uppercase"
        />
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-300 shrink-0 pointer-events-none transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>
      <p className={`text-[11px] font-semibold truncate ${hintClass}`}>
        {open
          ? filtered.length
            ? 'Type a city or code'
            : 'No matching airports'
          : selected
            ? selected.city
            : value
              ? 'Airport code'
              : 'Anywhere'}
      </p>

      {open && filtered.length > 0 && (
        <ul
          className={`absolute top-full z-30 mt-1.5 w-72 max-w-[85vw] max-h-80 overflow-auto bg-white rounded-xl border border-slate-200 shadow-lift py-1.5 animate-fade-in ${
            align === 'right' ? 'right-2' : 'left-2'
          }`}
        >
          {filtered.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(a);
                }}
                onMouseEnter={() => setActive(i)}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors ${
                  i === active ? 'bg-brand-50' : ''
                }`}
              >
                <span className="w-11 py-1 rounded-lg bg-slate-100 text-center text-[11px] font-extrabold text-brand-700 shrink-0">
                  {a.iataCode}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink truncate">{a.city}</span>
                  <span className="block text-[11px] font-medium text-ink-soft truncate">
                    {a.name}
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-ink-soft shrink-0">
                  {a.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
