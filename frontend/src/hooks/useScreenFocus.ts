import { useEffect, useRef } from "react";

export function useScreenFocus<T extends HTMLElement>() {
  const headingRef = useRef<T>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return headingRef;
}
