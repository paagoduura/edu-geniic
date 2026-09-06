import { useEffect, useMemo, useState } from "react";

const FORMULAS = [
  "E = mc²",
  "a² + b² = c²",
  "PV = nRT",
  "F = ma",
  "∫ eˣ dx",
  "H₂O",
  "console.log()",
  "print('hi')",
  "<h1>Hi</h1>",
  "SELECT *",
  "sin²θ + cos²θ = 1",
  "v = u + at",
  "def fn(x):",
  "() => 42",
  "NaCl → Na⁺",
  "πr²",
  "ax² + bx + c",
  "<App />",
  "λx.x",
  "∑ n²",
  "Δx/Δt",
  "x = (-b±√Δ)/2a",
  "CH₄ + 2O₂",
  "useState()",
  "git commit",
  "p ∧ q",
  "log₂(n)",
  "ρ = m/V",
  "Q = mcΔT",
];

const COLORS = ["text-primary", "text-secondary", "text-accent"];

interface Item {
  id: number;
  text: string;
  color: string;
  top: number;
  left: number;
  delay: number;
  size: string;
  duration: number;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function generateEvenPositions(count: number, isMobile: boolean): { top: number; left: number }[] {
  // Grid dimensions: fewer columns on mobile for readable spacing
  const cols = isMobile ? 3 : 6;
  const rows = isMobile ? 5 : 5;
  const cellW = 100 / cols;
  const cellH = 100 / rows;

  const cells: { top: number; left: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Base position at center of cell, with random jitter so it feels organic
      const jitterX = random(-cellW * 0.25, cellW * 0.25);
      const jitterY = random(-cellH * 0.25, cellH * 0.25);
      const left = c * cellW + cellW / 2 + jitterX;
      const top = r * cellH + cellH / 2 + jitterY;
      // Clamp to safe bounds
      cells.push({
        top: Math.max(4, Math.min(92, top)),
        left: Math.max(2, Math.min(96, left)),
      });
    }
  }

  // Shuffle and take only what we need
  return shuffle(cells).slice(0, count);
}

const FloatingFormulas = () => {
  const isMobile = useIsMobile();

  // Mobile gets fewer, smaller formulas
  const itemCount = isMobile ? 14 : 24;
  const sizes = useMemo(
    () =>
      isMobile
        ? ["text-xs", "text-sm", "text-base", "text-lg"]
        : ["text-sm sm:text-base", "text-base sm:text-lg", "text-lg sm:text-xl", "text-xl sm:text-2xl"],
    [isMobile]
  );

  const [items, setItems] = useState<Item[]>([]);

  // Generate initial items with even spacing
  useEffect(() => {
    const positions = generateEvenPositions(itemCount, isMobile);
    const initial: Item[] = positions.map((pos, i) => ({
      id: i,
      text: FORMULAS[Math.floor(Math.random() * FORMULAS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      top: pos.top,
      left: pos.left,
      delay: random(0, 4.5),
      size: sizes[Math.floor(Math.random() * sizes.length)],
      duration: random(4.2, 6.5),
    }));
    setItems(initial);
  }, [isMobile, itemCount, sizes]);

  // Refresh one random item every ~800ms, preserving even spacing by reusing a position
  useEffect(() => {
    if (items.length === 0) return;
    let nextId = items.length;
    const id = setInterval(() => {
      setItems((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const idx = Math.floor(Math.random() * copy.length);
        const old = copy[idx];
        copy[idx] = {
          id: nextId++,
          text: FORMULAS[Math.floor(Math.random() * FORMULAS.length)],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          top: old.top + random(-1.5, 1.5), // tiny drift so it feels alive
          left: old.left + random(-1.5, 1.5),
          delay: random(0, 1.5),
          size: sizes[Math.floor(Math.random() * sizes.length)],
          duration: random(4.2, 6.5),
        };
        return copy;
      });
    }, 800);
    return () => clearInterval(id);
  }, [items.length, sizes]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          style={{
            top: `${item.top}%`,
            left: `${item.left}%`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            textShadow: "0 0 14px hsl(var(--primary) / 0.25)",
          }}
          className={`absolute font-mono font-medium tracking-tight opacity-0 ${item.size} ${item.color} animate-formula-float whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.06)]`}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
};

export default FloatingFormulas;
