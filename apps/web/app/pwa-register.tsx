'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => registration.update())
        .catch(() => undefined);
    }
  }, []);

  return null;
}
