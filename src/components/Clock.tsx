import React, { useEffect, useState } from 'react';

type Props = { value?: number; onChange?: (n: number) => void };

export default function Clock({ value = 0, onChange }: Props) {
  const [t, setT] = useState<number>(value);
  useEffect(() => setT(value), [value]);
  useEffect(() => {
    const id = setInterval(() => setT((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (onChange) onChange(t);
  }, [t]);
  return <div className="clock">{new Date(t * 1000).toISOString().substr(11, 8)}</div>;
}
