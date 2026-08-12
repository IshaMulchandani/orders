import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface SearchableDropdownProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  fetchOptions: (query: string) => Promise<T[]>;
  getLabel: (item: T) => string;
  getKey: (item: T) => string | number;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Generic keyboard-narrowed searchable dropdown: type to filter (each
 * keystroke re-queries via fetchOptions), arrow keys to navigate,
 * Enter to select, Escape/click-outside to close. Used for both the
 * Client and Product pickers on the order form — any future "pick one
 * of many, searchable by name" field reuses this instead of a new
 * bespoke combobox.
 */
export default function SearchableDropdown<T>({
  value,
  onChange,
  fetchOptions,
  getLabel,
  getKey,
  placeholder = "Search…",
  disabled,
}: SearchableDropdownProps<T>) {
  const [inputValue, setInputValue] = useState(value ? getLabel(value) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<T[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  // Keep displayed text in sync when the selected value changes from
  // outside (e.g. the form resets after submit).
  useEffect(() => {
    setInputValue(value ? getLabel(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const id = ++requestId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const results = await fetchOptions(inputValue);
      if (id === requestId.current) {
        setOptions(results);
        setHighlightedIndex(0);
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue(value ? getLabel(value) : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, getLabel]);

  function selectOption(option: T) {
    onChange(option);
    setInputValue(getLabel(option));
    setIsOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") setIsOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[highlightedIndex];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setInputValue(value ? getLabel(value) : "");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={inputValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (value) onChange(null); // typing invalidates the previous selection
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg">
          {loading && <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No matches.</li>
          )}
          {!loading &&
            options.map((option, i) => (
              <li
                key={getKey(option)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focus, avoid blur closing the list first
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === highlightedIndex ? "bg-navy text-white" : "text-gray-700"
                }`}
              >
                {getLabel(option)}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
