'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      let reloading = false;
      const reloadForUpdate = () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', reloadForUpdate);
      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => registration.update())
        .catch(() => undefined);
      return () => navigator.serviceWorker.removeEventListener('controllerchange', reloadForUpdate);
    }
  }, []);

  return null;
}
