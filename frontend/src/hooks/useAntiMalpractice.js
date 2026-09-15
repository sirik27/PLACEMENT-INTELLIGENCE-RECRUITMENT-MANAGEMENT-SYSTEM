import { useEffect, useRef, useState, useCallback } from 'react';

export function useAntiMalpractice({ enabled = true, maxStrikes = 3, zeroTolerance = false, onDisqualify }) {
  const [strikes, setStrikes] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const strikesRef = useRef(0);

  const effectiveMaxStrikes = zeroTolerance ? 1 : maxStrikes;

  const addStrike = useCallback((reason) => {
    strikesRef.current += 1;
    const n = strikesRef.current;
    setStrikes(n);
    setWarnings(prev => [...prev, { reason, time: new Date().toISOString(), strike: n }]);
    setWarningMessage(`Malpractice ${zeroTolerance ? 'Zero-Tolerance Disqualification' : `Warning ${n}/${effectiveMaxStrikes}`}: ${reason}`);
    setShowWarning(true);

    if (n >= effectiveMaxStrikes || zeroTolerance) {
      onDisqualify?.(
        zeroTolerance
          ? `Exam Cancelled Immediately: Copy-Pasting / Malpractice Violation Detected (${reason})`
          : `Exam Cancelled: ${effectiveMaxStrikes} Malpractice Strikes Recorded (${reason})`
      );
    }
  }, [effectiveMaxStrikes, zeroTolerance, onDisqualify]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setWarningMessage('');
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch { /* user denied */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.hidden) addStrike('Tab switch or background navigation detected');
    };

    const onBlur = () => {
      addStrike('Window lost focus — possible Alt-Tab, split-screen, or AI extension popup active');
    };

    const onCopyPaste = (e) => {
      e.preventDefault();
      addStrike(`Copy-Paste / Clipboard attempt blocked (${e.type.toUpperCase()})`);
    };

    const onCtx = (e) => {
      e.preventDefault();
      addStrike('Right-Click / Context Menu attempt blocked');
    };

    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && enabled) addStrike('Exited Fullscreen mode');
    };

    const onKey = (e) => {
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 's', 'u'].includes(key)) {
        e.preventDefault();
        addStrike(`Copy-Paste Keyboard Shortcut (${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${key.toUpperCase()}) blocked`);
      }

      if (
        key === 'f12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        addStrike('Developer Tools / Inspect Element shortcut blocked');
      }

      if (
        (e.ctrlKey && e.shiftKey && ['l', 'k', 'e', 'a', 'm'].includes(key)) ||
        (e.altKey && ['a', 'c', 'x', 'z'].includes(key))
      ) {
        e.preventDefault();
        addStrike('Malpractice Detected: Unauthorized AI extension layer shortcut triggered');
      }
    };

    const detectAIExtensions = () => {
      const knownAIOverlaySelectors = [
        '[id*="chatgpt"]', '[id*="copilot"]', '[id*="grammarly"]',
        '[class*="ai-assistant"]', '[id*="side-panel"]', '[id*="gemini"]',
        '[data-extension]', 'iframe[src*="chrome-extension"]'
      ];
      for (const sel of knownAIOverlaySelectors) {
        if (document.querySelector(sel)) {
          addStrike('Malpractice Detected: Active Browser AI Extension / Overlay Layer detected');
          break;
        }
      }
    };

    const aiCheckInterval = setInterval(detectAIExtensions, 3000);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopyPaste);
    document.addEventListener('paste', onCopyPaste);
    document.addEventListener('cut', onCopyPaste);
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('keydown', onKey);

    return () => {
      clearInterval(aiCheckInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopyPaste);
      document.removeEventListener('paste', onCopyPaste);
      document.removeEventListener('cut', onCopyPaste);
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('keydown', onKey);
    };
  }, [enabled, addStrike]);

  return { strikes, maxStrikes: effectiveMaxStrikes, warnings, isFullscreen, showWarning, warningMessage, dismissWarning, enterFullscreen };
}
