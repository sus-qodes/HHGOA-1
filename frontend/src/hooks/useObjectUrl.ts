import { useEffect, useState } from "react";

export function useObjectUrl(source: Blob | MediaSource | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (source === null) return;

    const nextUrl = URL.createObjectURL(source);
    queueMicrotask(() => {
      setUrl(nextUrl);
    });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [source]);

  return source === null ? null : url;
}
