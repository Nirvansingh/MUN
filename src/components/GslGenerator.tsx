'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MunFile } from '@/lib/types';
import { generateGslSpeech, getCommitteeAgenda, SpeechLength, GslOutput } from '@/lib/gsl-generator';

export default function GslGenerator({ file, committee }: { file: MunFile; committee: string }) {
  const [expanded, setExpanded] = useState(false);
  const [output, setOutput] = useState<GslOutput | null>(null);
  const [selectedLength, setSelectedLength] = useState<SpeechLength>('90');
  const [generating, setGenerating] = useState(false);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const agenda = getCommitteeAgenda(committee);

  const handleGenerate = useCallback((seedOverride?: number) => {
    setGenerating(true);
    const effectiveSeed = seedOverride ?? seed;
    // Use setTimeout to let the UI update before the potentially blocking generation
    setTimeout(() => {
      try {
        const result = generateGslSpeech(file, committee, agenda, selectedLength, effectiveSeed);
        setOutput(result);
        setExpanded(true);
      } catch (err) {
        console.error('GSL generation failed:', err);
      } finally {
        setGenerating(false);
      }
    }, 50);
  }, [file, committee, agenda, selectedLength, seed]);

  const handleRegenerate = useCallback(() => {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    handleGenerate(nextSeed);
  }, [seed, handleGenerate]);

  const handleLengthChange = useCallback((len: SpeechLength) => {
    setSelectedLength(len);
  }, []);

  // Scroll to output when generated
  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [output]);

  if (!file.isCountry) return null;

  return (
    <div className="gsl-generator">
      {/* ── Header / Toggle ── */}
      <div className="gsl-header" onClick={() => setExpanded(!expanded)}>
        <div className="gsl-header-left">
          <span className="gsl-icon">🎤</span>
          <span className="gsl-title">Generate Committee-Ready GSL</span>
          <span className="gsl-badge">AI-Powered</span>
        </div>
        <div className="gsl-header-right">
          {output && !expanded && (
            <span className="gsl-meta-preview">
              {selectedLength}s · {output.meta.estimatedTime}
            </span>
          )}
          <span className={`gsl-chevron ${expanded ? 'open' : ''}`}>▾</span>
        </div>
      </div>

      {expanded && (
        <div className="gsl-body">
          {/* ── Context Info ── */}
          <div className="gsl-context">
            <div className="gsl-context-row">
              <span className="gsl-context-label">Committee</span>
              <span className="gsl-context-value">{committee}</span>
            </div>
            <div className="gsl-context-row">
              <span className="gsl-context-label">Agenda</span>
              <span className="gsl-context-value">{agenda}</span>
            </div>
            <div className="gsl-context-row">
              <span className="gsl-context-label">Country</span>
              <span className="gsl-context-value">{file.displayName.replace(/\.txt$/i, '').replace(/^[^|]*\|/, '').trim() || file.displayName}</span>
            </div>
          </div>

          {/* ── Length Selector ── */}
          <div className="gsl-length-selector">
            <span className="gsl-length-label">Speech length:</span>
            <div className="gsl-length-options">
              {(['60', '90', '120'] as SpeechLength[]).map(len => (
                <button
                  key={len}
                  className={`gsl-length-btn ${selectedLength === len ? 'active' : ''}`}
                  onClick={() => handleLengthChange(len)}
                >
                  {len}s
                </button>
              ))}
            </div>
          </div>

          {/* ── Generate Button ── */}
          <div className="gsl-actions">
            <button
              className="gsl-generate-btn"
              onClick={() => handleGenerate()}
              disabled={generating}
            >
              {generating ? '⏳ Generating...' : output ? '🔄 Regenerate' : '🎤 Generate Speech'}
            </button>
            {output && (
              <button className="gsl-regenerate-btn" onClick={handleRegenerate}>
                🔁 New Variation
              </button>
            )}
          </div>

          {/* ── Output ── */}
          {output && (
            <div className="gsl-output" ref={outputRef}>
              {/* Speech */}
              <div className="gsl-speech-card">
                <div className="gsl-speech-card-header">
                  <span className="gsl-speech-card-title">🎤 GSL Speech — {selectedLength} Seconds</span>
                  <button
                    className="gsl-copy-btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(output.speech);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {
                        // Clipboard unavailable
                      }
                    }}
                    title="Copy to clipboard"
                  >
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <div className="gsl-speech-content">
                  {output.speech.split('\n\n').map((para, i) => (
                    <p key={i} className="gsl-speech-paragraph">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="gsl-meta-section">
                <div className="gsl-meta-title">Speech Analysis</div>

                <div className="gsl-meta-grid">
                  <div className="gsl-meta-item">
                    <span className="gsl-meta-item-label">Hook Used</span>
                    <span className="gsl-meta-item-value">{output.meta.hook}</span>
                  </div>

                  <div className="gsl-meta-item">
                    <span className="gsl-meta-item-label">Country Position Summary</span>
                    <span className="gsl-meta-item-value">{output.meta.countryPosition}</span>
                  </div>

                  <div className="gsl-meta-item">
                    <span className="gsl-meta-item-label">Key Facts Used</span>
                    <span className="gsl-meta-item-value">
                      {output.meta.keyFactsUsed.length > 0
                        ? output.meta.keyFactsUsed.map((f, i) => (
                            <span key={i} className="gsl-meta-chip">{f}</span>
                          ))
                        : 'Country position and general context'}
                    </span>
                  </div>

                  <div className="gsl-meta-item">
                    <span className="gsl-meta-item-label">Solutions Mentioned</span>
                    <span className="gsl-meta-item-value">
                      {output.meta.solutionsMentioned.length > 0
                        ? output.meta.solutionsMentioned.map((s, i) => (
                            <span key={i} className="gsl-meta-chip">{s}</span>
                          ))
                        : 'General call for international cooperation'}
                    </span>
                  </div>

                  <div className="gsl-meta-item">
                    <span className="gsl-meta-item-label">Estimated Speaking Time</span>
                    <span className="gsl-meta-item-value gsl-meta-time">{output.meta.estimatedTime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
