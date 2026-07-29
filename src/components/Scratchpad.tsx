'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/AppContext';

export default function Scratchpad() {
  const { scratchpadContent, setScratchpadContent } = useApp();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [localContent, setLocalContent] = useState(scratchpadContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handler = () => setVisible(v => !v);
    window.addEventListener('toggle-scratchpad', handler);
    return () => window.removeEventListener('toggle-scratchpad', handler);
  }, []);

  // Sync local content when persisted scratchpadContent loads/changes from context
  useEffect(() => {
    setLocalContent(scratchpadContent);
  }, [scratchpadContent]);

  const handleSave = () => {
    setScratchpadContent(localContent);
    setStatus({ type: 'saved', text: 'Saved' });
    setTimeout(() => setStatus({ type: '', text: '' }), 1500);
  };

  const handleClear = () => {
    if (!confirm('Clear all scratchpad content?')) return;
    setLocalContent('');
    setScratchpadContent('');
    setStatus({ type: '', text: '' });
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
