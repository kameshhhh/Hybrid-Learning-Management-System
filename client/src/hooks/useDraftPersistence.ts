import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface Props<T> {
  key: string;
  initialData: T;
  onSave: (data: T) => Promise<void>;
  autosaveInterval?: number; // ms
}

export function useDraftPersistence<T>({ 
  key, 
  initialData, 
  onSave, 
  autosaveInterval = 30000 
}: Props<T>) {
  const [data, setData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  
  const dataRef = useRef<T>(data);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`draft_${key}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only use draft if it's newer than some logic or if we want to force restore
        setData(parsed.data);
        setIsDirty(true);
        toast.success("Restored unsaved draft", { id: 'draft-restore' });
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, [key]);

  // Update ref for background access
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Sync to localStorage
  useEffect(() => {
    if (isDirty) {
      localStorage.setItem(`draft_${key}`, JSON.stringify({
        data,
        updatedAt: new Date().toISOString()
      }));
    }
  }, [data, isDirty, key]);

  // Manual save
  const save = useCallback(async (explicitData?: T) => {
    const dataToSave = explicitData || dataRef.current;
    setIsSaving(true);
    try {
      await onSave(dataToSave);
      setLastSaved(new Date());
      setIsDirty(false);
      localStorage.removeItem(`draft_${key}`);
      return true;
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setHasConflict(true);
      } else {
        toast.error("Failed to save changes");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [key, onSave]);

  // Autosave timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty && !isSaving && !hasConflict) {
        save();
      }
    }, autosaveInterval);
    return () => clearInterval(timer);
  }, [isDirty, isSaving, hasConflict, autosaveInterval, save]);

  return {
    data,
    setData: (newData: T | ((prev: T) => T)) => {
      setData(newData);
      setIsDirty(true);
    },
    isDirty,
    isSaving,
    lastSaved,
    hasConflict,
    setHasConflict,
    save,
    clearDraft: () => {
      localStorage.removeItem(`draft_${key}`);
      setIsDirty(false);
    }
  };
}
