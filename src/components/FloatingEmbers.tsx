import { useEffect, useRef } from "react";

const FloatingEmbers = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    interface Ember {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      life: number;
      maxLife: number;
      color: string;
    }

    const embers: Ember[] = [];
    const EMBER_COUNT = 25;
    const colors = [
      "255, 147, 22",  // orange
      "255, 180, 60",  // golden
      "255, 100, 20",  // deep orange
      "255, 200, 100", // warm yellow
    ];

    const resize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const createEmber = (): Ember => ({
      x: Math.random() * width,
      y: height + 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(Math.random() * 0.8 + 0.3),
      size: Math.random() * 3 + 1,
      opacity: 0,
      life: 0,
      maxLife: Math.random() * 300 + 200,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    // Init
    for (let i = 0; i < EMBER_COUNT; i++) {
      const ember = createEmber();
      ember.y = Math.random() * height;
      ember.life = Math.random() * ember.maxLife;
      embers.push(ember);
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.x += e.vx + Math.sin(e.life * 0.02) * 0.3;
        e.y += e.vy;
        e.life++;

        // Fade in then fade out
        const lifeRatio = e.life / e.maxLife;
        if (lifeRatio < 0.1) {
          e.opacity = lifeRatio / 0.1;
        } else if (lifeRatio > 0.7) {
          e.opacity = (1 - lifeRatio) / 0.3;
        } else {
          e.opacity = 1;
        }

        e.opacity = Math.max(0, Math.min(0.6, e.opacity));

        // Draw ember with glow
        ctx.save();
        ctx.globalAlpha = e.opacity * 0.3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${e.color}, 0.3)`;
        ctx.fill();

        ctx.globalAlpha = e.opacity;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${e.color}, 1)`;
        ctx.fill();
        ctx.restore();

        // Reset
        if (e.life >= e.maxLife || e.y < -20) {
          embers[i] = createEmber();
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};

export default FloatingEmbers;
