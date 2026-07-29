'use client';

import { useEffect } from 'react';

/** Gives all request buttons immediate, consistent feedback without duplicating state in every screen. */
export function InteractionFeedback() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let activeButton: HTMLButtonElement | null = null;
    let requestCount = 0;
    const clear = () => {
      if (!activeButton || requestCount > 0) return;
      activeButton.classList.remove('interaction-pending');
      activeButton.removeAttribute('aria-busy');
      activeButton = null;
    };
    window.fetch = (...args) => {
      requestCount += 1;
      return originalFetch(...args).finally(() => {
        requestCount -= 1;
        clear();
      });
    };
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest('button');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;
      activeButton?.classList.remove('interaction-pending');
      activeButton?.removeAttribute('aria-busy');
      activeButton = button;
      button.classList.add('interaction-pending');
      button.setAttribute('aria-busy', 'true');
      // Client-only controls (tabs, expanders) have no request and should remain quick.
      window.setTimeout(clear, 450);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener('click', onClick, true);
    };
  }, []);
  return null;
}
