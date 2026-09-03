import { useEffect, useState } from "react";

export type Breakpoint = "mobile" | "tablet" | "laptop" | "desktop";

const bp = (w: number): Breakpoint =>
  w < 640 ? "mobile" : w < 1024 ? "tablet" : w < 1280 ? "laptop" : "desktop";

export function useWindowSize() {
  const [size, setSize] = useState({ w: 1440, h: 900 });

  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  return { ...size, bp: bp(size.w) };
}
