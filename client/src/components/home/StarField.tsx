import { useEffect, useRef } from "react";
import { Box } from "@mui/material";

interface StarFieldProps {
  count?: number;
}

export default function StarField({ count = 20 }: StarFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.style.cssText = `
        position:absolute;
        width:2px;height:2px;
        border-radius:50%;
        background:rgba(255,255,255,0.8);
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation:twinkle ${2 + Math.random() * 2}s infinite ${Math.random() * 3}s;
        opacity:${0.3 + Math.random() * 0.7};
      `;
      c.appendChild(s);
    }
  }, [count]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    />
  );
}
