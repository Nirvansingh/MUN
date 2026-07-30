'use client';

import React, { useState, useRef, useCallback } from 'react';

export default function SpeechTimer() {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [running, setRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(120);
  const [showCustom, setShowCustom] = useState(false);
  const [customM, setCustomM] = useState('1');
  const [customS, setCustomS] = useState('0');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'triangle';
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not available
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setRunning(true);
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setTimeLeft(remaining);
      elapsedRef.current = elapsed;

      if (remaining <= 0) {
        clearTimer();
        setRunning(false);
        playBeep();
      }
    }, 100);
  }, [totalSeconds, clearTimer, playBeep]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    setRunning(true);
    const currentTimeLeft = timeLeft;
    startTimeRef.current = Date.now();
    elapsedRef.current = totalSeconds - currentTimeLeft;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsedRef.current - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearTimer();
        setRunning(false);
        playBeep();
      }
    }, 100);
  }, [totalSeconds, timeLeft, clearTimer, playBeep]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setRunning(false);
    setTimeLeft(totalSeconds);
  }, [totalSeconds, clearTimer]);

  const setPreset = useCallback((seconds: number) => {
    clearTimer();
    setRunning(false);
    setTotalSeconds(seconds);
    setTimeLeft(seconds);
    setShowCustom(seconds === 0);
  }, [clearTimer]);

  const handleCustomSet = () => {
    const m = parseInt(customM) || 0;
    const s = parseInt(customS) || 0;
    const total = m * 60 + s;
    if (total > 0) {
      setPreset(total);
      setShowCustom(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 439.8 : 0;

  if (!visible) {
    return (
      <div className="widget-fab widget-fab-br" title="Speech Timer"
        onClick={() => setVisible(true)}>
        ⏱
      </div>
    );
  }

  return (
    <>
      <div className="widget-overlay" onClick={() => { clearTimer(); setVisible(false); }}>
        <div className="widget-popup timer-popup" onClick={e => e.stopPropagation()}>
          <div className="widget-popup-header">
            <span className="widget-popup-title">⏱ Speech Timer</span>
            <button className="widget-popup-close" onClick={() => { clearTimer(); setVisible(false); }}>✕</button>
          </div>
          <div className="widget-popup-body">
            <div className="timer-display-wrap">
              <svg className="timer-ring" viewBox="0 0 160 160">
                <circle className="timer-ring-bg" cx="80" cy="80" r="70" />
                <circle className="timer-ring-progress" cx="80" cy="80" r="70"
                  strokeDasharray="439.8" strokeDashoffset={progress} />
              </svg>
              <div className="timer-display">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
            </div>
            <div className="timer-status">
              {running ? '⏳ Running...' : timeLeft === 0 && totalSeconds > 0 ? '⏰ Time!' : '⏸ Paused'}
            </div>
            <div className="timer-presets">
              <button className="timer-preset-btn" onClick={() => setPreset(120)}>2 Minutes</button>
              <button className="timer-preset-btn" onClick={() => setPreset(90)}>90 Seconds</button>
              <button className="timer-preset-btn" onClick={() => setPreset(60)}>60 Seconds</button>
              <button className="timer-preset-btn" onClick={() => setPreset(0)}>Custom</button>
            </div>
            {showCustom && (
              <div className="timer-custom-input">
                <input type="number" className="timer-input" placeholder="MM" min={0} max={99}
                  value={customM} onChange={e => setCustomM(e.target.value)} />
                <span className="timer-input-sep">:</span>
                <input type="number" className="timer-input" placeholder="SS" min={0} max={59}
                  value={customS} onChange={e => setCustomS(e.target.value)} />
                <button className="widget-btn" onClick={handleCustomSet}>Set</button>
              </div>
            )}
            <div className="timer-controls">
              {!running ? (
                <button className="widget-btn timer-start" onClick={startTimer}
                  disabled={totalSeconds === 0}>▶ Start</button>
              ) : (
                <button className="widget-btn timer-pause" onClick={pauseTimer}>⏸ Pause</button>
              )}
              {!running && timeLeft > 0 && timeLeft < totalSeconds && (
                <button className="widget-btn timer-resume" onClick={resumeTimer}>▶ Resume</button>
              )}
              <button className="widget-btn timer-reset" onClick={resetTimer}>↺ Reset</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
