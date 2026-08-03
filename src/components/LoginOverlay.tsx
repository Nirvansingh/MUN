'use client';

import React, { useState, useEffect, useCallback } from 'react';

const CORRECT_PASSWORD = '$Waheguru1';

export default function LoginOverlay() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleUnlock = useCallback(() => {
    if (password === CORRECT_PASSWORD) {
      setUnlocked(true);
      setError('');
      setPassword('');
      setShowPassword(false);
    } else {
      setError('Incorrect password. Try again.');
      setShaking(true);
      setTimeout(() => setShaking(false), 350);
      setPassword('');
    }
  }, [password]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector('.login-input') as HTMLInputElement;
      input?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key to reset the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPassword('');
        setError('');
        setShowPassword(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (unlocked) return null;

  return (
    <div className={`login-overlay ${unlocked ? 'hidden' : ''}`}>
      <div className={`login-card ${shaking ? 'shake' : ''}`} role="dialog" aria-modal="true" aria-label="Enter password to access MUN Research Hub">
        <div className="login-icon">🌐</div>
        <div className="login-title">MUN Research Hub</div>
        <div className="login-subtitle">Enter password to access</div>

        <div className="login-input-group">
          <input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="login-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button className="login-unlock-btn" onClick={handleUnlock} type="button">
          🔓 Unlock
        </button>

        <div className="login-error">{error}</div>
      </div>
    </div>
  );
}
