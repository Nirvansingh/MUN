'use client';

import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Ctrl + K', label: 'Focus search' },
  { keys: 'Ctrl + B', label: 'Toggle sidebar' },
  { keys: 'Ctrl + R', label: 'Quick revision mode' },
  { keys: 'Ctrl + .', label: 'Toggle right panel' },
  { keys: 'Alt + ←', label: 'Back' },
  { keys: 'Alt + →', label: 'Forward' },
  { keys: 'Esc', label: 'Close dialogs' },
  { keys: '?', label: 'Show this help' },
];

/** Renders the keyboard-shortcuts help overlay (hidden until "?" is pressed). */
export default function KeyboardShortcuts() {
  const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

  if (!showShortcuts) return null;

  return (
    <div className="shortcut-hints" onClick={() => setShowShortcuts(false)}>
      <div className="shortcut-hints-card" onClick={e => e.stopPropagation()}>
        <div className="shortcut-hints-title">⌨️ Keyboard Shortcuts</div>
        <div className="shortcut-hints-grid">
          {SHORTCUTS.map(s => (
            <div key={s.keys}>
              <kbd>{s.keys}</kbd>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
