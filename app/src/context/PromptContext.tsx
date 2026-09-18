import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { PromptModal, PromptModalOptions } from '../components/ui/PromptModal';

interface PromptContextType {
  prompt: (options: PromptModalOptions) => Promise<string | null>;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

// Standalone global trigger so background hooks / tasks can invoke the prompt modal without hook re-renders
let globalPromptHandler: ((options: PromptModalOptions) => Promise<string | null>) | null = null;

export function promptPassphrase(options: PromptModalOptions): Promise<string | null> {
  if (globalPromptHandler) {
    return globalPromptHandler(options);
  }
  // Fallback if provider is somehow not mounted
  const fallback = window.prompt(options.message ? `${options.title}\n${options.message}` : options.title, options.defaultValue);
  return Promise.resolve(fallback);
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PromptModalOptions>({ title: '' });
  const resolveRef = useRef<((value: string | null) => void) | null>(null);

  const prompt = useCallback((opts: PromptModalOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  // Register global handler
  globalPromptHandler = prompt;

  const handleSubmit = useCallback((value: string) => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(null);
      resolveRef.current = null;
    }
  }, []);

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      <PromptModal
        isOpen={isOpen}
        options={options}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </PromptContext.Provider>
  );
}

export const usePrompt = () => {
  const context = useContext(PromptContext);
  if (!context) throw new Error('usePrompt must be used within a PromptProvider');
  return context;
};
