// Hook kecil bersama untuk UI studio.
"use client";

import { useEffect, useState } from "react";

/** Nilai yang baru diterbitkan setelah debounce (untuk input pencarian). */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
