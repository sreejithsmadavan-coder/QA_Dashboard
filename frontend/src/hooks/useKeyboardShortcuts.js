import { useState, useEffect, useCallback } from 'react';

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(e) {
  const tag = e.target.tagName;
  if (IGNORED_TAGS.has(tag)) return true;
  if (e.target.isContentEditable) return true;
  return false;
}

export default function useKeyboardShortcuts({ onNavigate, onNewBug, onClearSelection, onCloseModal } = {}) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e) => {
    // Always allow Escape regardless of focus
    if (e.key === 'Escape') {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (onCloseModal) onCloseModal();
      if (onClearSelection) onClearSelection();
      return;
    }

    // Skip all other shortcuts when user is typing
    if (isTyping(e)) return;

    // Skip if modifier keys are held (allow normal browser shortcuts)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      case '?':
        e.preventDefault();
        setShowHelp(prev => !prev);
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        if (onNewBug) onNewBug();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        if (onNavigate) onNavigate('projects');
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        if (onNavigate) onNavigate('dashboard');
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        if (onNavigate) onNavigate('meetings');
        break;
      default:
        break;
    }
  }, [onNavigate, onNewBug, onClearSelection, onCloseModal, showHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
