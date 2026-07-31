'use client';

import { useEffect, useState } from 'react';
import { useApp } from './AppContext';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Global keyboard shortcuts for the app.
 *
 *  - Ctrl/Cmd+B        toggle sidebar
 *  - Ctrl/Cmd+R        quick revision mode (only when a file is open)
 *  - Ctrl/Cmd+.        toggle right panel
 *  - Alt+Left/Right    history back / forward
 *  - Esc               close overlays + shortcut hints
 *  - ?                 toggle shortcut hints overlay
 *
 * Ctrl/Cmd+K (focus search) lives in Header so it can focus its own input.
 * Shortcuts are suppressed while typing in inputs/textareas/contentEditable.
 */
export function useKeyboardShortcuts() {
  const {
    toggleSidebar, toggleRightPanel, setRevisionMode, revisionMode,
    navigateBack, navigateForward, currentFile,
  } = useApp();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const typing = isTypingTarget(e.target);
      const mod = e.ctrlKey || e.metaKey;

      // Esc closes the hints overlay and any open widgets.
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        window.dispatchEvent(new CustomEvent('mun-escape'));
        return;
      }

      // Alt+← / Alt+→ history navigation (allowed even while typing).
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateBack();
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateForward();
        return;
      }

      // Ctrl/Cmd+ shortcuts — skip while typing in a field.
      if (mod && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') {
          e.preventDefault();
          toggleSidebar();
          return;
        }
        if (k === 'r') {
          e.preventDefault();
          if (currentFile) setRevisionMode(!revisionMode);
          return;
        }
        if (k === '.') {
          e.preventDefault();
          toggleRightPanel();
          return;
        }
      }

      // "?" toggles the shortcut-hints overlay (Shift+/ produces "?").
      if (!typing && e.key === '?' && !mod) {
        e.preventDefault();
        setShowShortcuts(v => !v);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleRightPanel, setRevisionMode, revisionMode, navigateBack, navigateForward, currentFile]);

  return { showShortcuts, setShowShortcuts };
}
