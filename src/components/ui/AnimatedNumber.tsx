import { animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  format: (n: number) => string;
  /** Seconds. */
  duration?: number;
}

/** Smoothly tweens between numeric values, formatting each frame. */
export function AnimatedNumber({ value, format, duration = 0.8 }: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <>{format(display)}</>;
}
