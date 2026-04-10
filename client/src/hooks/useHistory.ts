import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<T[]>([initialState]);

  const pushState = useCallback((newState: T) => {
    setHistory(prev => {
      // If we are pushing a new state, we cut off any "future" states from previous redos
      const newHistory = prev.slice(0, index + 1);
      
      // Prevent duplicate states (important for re-renders)
      if (JSON.stringify(newHistory[newHistory.length - 1]) === JSON.stringify(newState)) {
        return prev;
      }

      const updated = [...newHistory, newState];
      // Keep a max of 50 states
      if (updated.length > 50) {
        setIndex(49);
        return updated.slice(1);
      }
      setIndex(updated.length - 1);
      return updated;
    });
  }, [index]);

  const undo = useCallback((): T | null => {
    if (index > 0) {
      const newIdx = index - 1;
      setIndex(newIdx);
      return history[newIdx];
    }
    return null;
  }, [index, history]);

  const redo = useCallback((): T | null => {
    if (index < history.length - 1) {
      const newIdx = index + 1;
      setIndex(newIdx);
      return history[newIdx];
    }
    return null;
  }, [index, history]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state: history[index], pushState, undo, redo, canUndo, canRedo };
}
