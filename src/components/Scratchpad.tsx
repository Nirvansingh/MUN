'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/AppContext';

export default function Scratchpad() {
  const { scratchpadContent, setScratchpadContent } = useApp();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [localContent, setLocalContent] = useState(scratchpadContent);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = () => setVisible(v => !v);
    window.addEventListener('toggle-scratchpad', handler);
    return () => window.removeEventListener('toggle-scratchpad', handler);
  }, []);

  // Close with Esc (broadcast by the keyboard-shortcuts handler).
  useEffect(() => {
    const onEscape = () => setVisible(false);
    window.addEventListener('mun-escape', onEscape);
    return () => window.removeEventListener('mun-escape', onEscape);
  }, []);

  // Keep the textarea in sync when persisted scratchpadContent loads/changes
  // (e.g. after hydration or from another tab) without setState-in-effect.
  const [prevScratchpad, setPrevScratchpad] = useState(scratchpadContent);
  if (scratchpadContent !== prevScratchpad) {
    setPrevScratchpad(scratchpadContent);
    setLocalContent(scratchpadContent);
  }

  // Clean up save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleSave = () => {
    setScratchpadContent(localContent);
    setStatus({ type: 'saved', text: 'Saved' });
    setTimeout(() => setStatus({ type: '', text: '' }), 1500);
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setLocalContent('');
    setScratchpadContent('');
    setStatus({ type: '', text: '' });
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    setStatus({ type: 'unsaved', text: 'Unsaved changes' });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setScratchpadContent(e.target.value);
      setStatus({ type: 'saved', text: 'Saved' });
    }, 2000);
  };

  if (!visible) return null;

  return (
    <div className="scratchpad-section" id="scratchpadSection">
      <div className="scratchpad-header">
        <div className="scratchpad-header-left">
          <span className="scratchpad-icon">📋</span>
          <span className="scratchpad-label">Scratchpad</span>
          {status.text && (
            <span className={`scratchpad-status ${status.type}`}>{status.text}</span>
          )}
        </div>
        <div className="scratchpad-header-right">
          <button className="inline-btn save-btn" onClick={handleSave}>💾 Save</button>
          <button className="inline-btn delete-btn" onClick={handleClear}>🗑️ Clear</button>
          <button className="inline-btn close-btn" onClick={() => setVisible(false)}>✖</button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="scratchpad-confirm">
          <div className="scratchpad-confirm-text">Clear all scratchpad content?</div>
          <div className="scratchpad-confirm-actions">
            <button className="inline-btn delete-btn" onClick={confirmClear}>🗑️ Yes, Clear</button>
            <button className="inline-btn save-btn" onClick={cancelClear}>Cancel</button>
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="scratchpad-textarea"
        value={localContent}
        onChange={handleChange}
        placeholder="Write anything here — this is your personal scratchpad, not tied to any file."
        spellCheck
      />
    </div>
  );
}
