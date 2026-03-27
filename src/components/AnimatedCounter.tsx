import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  end: number | string;
  suffix?: string;
  duration?: number;
}

const AnimatedCounter = ({ end, suffix = "", duration = 2000 }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const numericEnd = typeof end === "string" ? parseFloat(end.replace(/[^0-9.]/g, "")) : end;
  const isPercentage = typeof end === "string" && end.includes("%");
  const hasPlus = typeof end === "string" && end.includes("+");
  const hasK = typeof end === "string" && end.includes("K");

  useEffect(() => {
    if (!ref.current || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * numericEnd));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(numericEnd);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [numericEnd, duration, hasAnimated]);

  const display = hasK
    ? `${(count / 1000).toFixed(count >= 1000 ? 0 : 1)}K`
    : count.toLocaleString();

  return (
    <span ref={ref}>
      {display}
      {isPercentage ? "%" : ""}
      {hasPlus ? "+" : ""}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
