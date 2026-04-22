import React, { useState, useEffect } from 'react';

export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-[var(--color-accent-gold)]">
      {time.toLocaleTimeString('vi-VN', { hour12: false })}
    </div>
  );
}
