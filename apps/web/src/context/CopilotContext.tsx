import React, { createContext, useContext, useState, useCallback } from 'react';

interface CopilotContextType {
  isOpen: boolean;
  openCopilot: (applicationId?: string, initialPrompt?: string) => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  selectedApplicationId: string | undefined;
  setSelectedApplicationId: (id: string | undefined) => void;
  initialPrompt: string | undefined;
  clearInitialPrompt: () => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(undefined);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);

  const openCopilot = useCallback((applicationId?: string, prompt?: string) => {
    if (applicationId) {
      setSelectedApplicationId(applicationId);
    }
    if (prompt) {
      setInitialPrompt(prompt);
    }
    setIsOpen(true);
  }, []);

  const closeCopilot = useCallback(() => {
    setIsOpen(false);
    setInitialPrompt(undefined);
  }, []);

  const toggleCopilot = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearInitialPrompt = useCallback(() => {
    setInitialPrompt(undefined);
  }, []);

  return (
    <CopilotContext.Provider
      value={{
        isOpen,
        openCopilot,
        closeCopilot,
        toggleCopilot,
        selectedApplicationId,
        setSelectedApplicationId,
        initialPrompt,
        clearInitialPrompt,
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
}
