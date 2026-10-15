'use client';

import { useEffect, useState } from 'react';

// Each panel owns its request. A failed or slow panel cannot hide the others.
export function useLearnerResource<T>(load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    load: () => Promise<T>;
    revision: number;
    data: T | null;
    failed: boolean;
    error: unknown;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void load().then(
      (data) => { if (active) setResult({ load, revision, data, failed: false, error: null }); },
      (error: unknown) => {
        if (active) setResult((previous) => ({
          load, revision, data: previous?.load === load ? previous.data : null, failed: true, error,
        }));
      },
    );
    return () => { active = false; };
  }, [load, revision]);

  const current = result?.load === load && result.revision === revision ? result : null;
  return {
    data: current?.failed ? null : current?.data ?? null,
    previousData: result?.load === load ? result.data : null,
    isLoading: current === null,
    failed: current?.failed ?? false,
    error: current?.error ?? null,
    retry: () => setRevision((value) => value + 1),
    replaceData: (data: T) => setResult({ load, revision, data, failed: false, error: null }),
  };
}
