import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'hva_active_class_id';

interface ClassInfo {
  id: string;
  name: string;
  level?: { name: string } | null;
}

interface ClassContextType {
  activeClassId: string | null;
  setActiveClassId: (id: string | null) => void;
  classes: ClassInfo[];
  isLoading: boolean;
  hasClasses: boolean;
  selectedClass: ClassInfo | null;
  clearActiveClass: () => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isTeacher } = useAuth();
  const [activeClassId, setActiveClassIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  // Fetch accessible classes based on role
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['accessible-classes', user?.id, isAdmin, isTeacher],
    queryFn: async () => {
      if (!user) return [];
      
      if (isAdmin) {
        // Admin can access ALL active classes
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, level:levels(name)')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data || [];
      } else if (isTeacher) {
        // Teacher can only access assigned classes
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, level:levels(name)')
          .eq('teacher_id', user.id)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        return data || [];
      }
      
      return [];
    },
    enabled: !!user && (isAdmin || isTeacher),
  });

  // Auto-select if only one class and none selected
  useEffect(() => {
    if (classes.length === 1 && !activeClassId) {
      setActiveClassId(classes[0].id);
    }
  }, [classes, activeClassId]);

  // Validate stored class ID still exists
  useEffect(() => {
    if (activeClassId && classes.length > 0) {
      const exists = classes.some(c => c.id === activeClassId);
      if (!exists) {
        setActiveClassIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [activeClassId, classes]);

  const setActiveClassId = useCallback((id: string | null) => {
    setActiveClassIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearActiveClass = useCallback(() => {
    setActiveClassIdState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const selectedClass = classes.find(c => c.id === activeClassId) || null;
  const hasClasses = classes.length > 0;

  return (
    <ClassContext.Provider
      value={{
        activeClassId,
        setActiveClassId,
        classes,
        isLoading,
        hasClasses,
        selectedClass,
        clearActiveClass,
      }}
    >
      {children}
    </ClassContext.Provider>
  );
}

export function useClassContext() {
  const context = useContext(ClassContext);
  if (context === undefined) {
    throw new Error('useClassContext must be used within a ClassProvider');
  }
  return context;
}

// Hook for pages that need class access
export function useAccessibleClasses() {
  const { classes, isLoading, hasClasses, activeClassId, setActiveClassId, selectedClass } = useClassContext();
  
  return {
    classes,
    isLoading,
    hasClasses,
    activeClassId,
    setActiveClassId,
    selectedClass,
    classIds: classes.map(c => c.id),
  };
}
