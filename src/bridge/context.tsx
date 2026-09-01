import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { BridgeSchema } from './schema';

export type ModulePhase = 'intro' | 'task' | 'result';

export interface ModuleStateContextValue<TDraft> {
  phase: ModulePhase;
  currentStepIndex: number;
  /**
   * Показывали ли уже теорию. Живёт здесь, а не внутри ModuleShell, потому что
   * это часть позиции студента: при восстановлении из файла нужно вернуть шаг
   * вместе с признаком, что теорию он уже прошёл, — иначе «Далее» окажется
   * заблокированной, а оверлей теории закрыт, и выйти будет некуда.
   */
  theorySeen: boolean;
  draft: TDraft;
  importedBridge: BridgeSchema | null;
  setPhase: (phase: ModulePhase) => void;
  setCurrentStepIndex: (index: number) => void;
  setTheorySeen: (seen: boolean) => void;
  updateDraft: (updater: (draft: TDraft) => TDraft) => void;
  replaceDraft: (draft: TDraft) => void;
  setImportedBridge: (bridge: BridgeSchema | null) => void;
}

interface ModuleStateProviderProps<TDraft> extends PropsWithChildren {
  initialDraft: TDraft;
  importedBridge?: BridgeSchema | null;
}

const ModuleStateContext = createContext<ModuleStateContextValue<unknown> | null>(null);

export function ModuleStateProvider<TDraft>({
  children,
  initialDraft,
  importedBridge: initialImportedBridge = null,
}: ModuleStateProviderProps<TDraft>) {
  const [phase, setPhase] = useState<ModulePhase>('intro');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [theorySeen, setTheorySeen] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [importedBridge, setImportedBridge] = useState<BridgeSchema | null>(initialImportedBridge);

  const value = useMemo<ModuleStateContextValue<TDraft>>(
    () => ({
      phase,
      currentStepIndex,
      theorySeen,
      draft,
      importedBridge,
      setPhase,
      setCurrentStepIndex,
      setTheorySeen,
      updateDraft: (updater) => setDraft((currentDraft) => updater(currentDraft)),
      replaceDraft: setDraft,
      setImportedBridge,
    }),
    [currentStepIndex, draft, importedBridge, phase, theorySeen],
  );

  return <ModuleStateContext.Provider value={value as ModuleStateContextValue<unknown>}>{children}</ModuleStateContext.Provider>;
}

export function useModuleState<TDraft>() {
  const context = useContext(ModuleStateContext);

  if (!context) {
    throw new Error('ModuleStateProvider is missing.');
  }

  return context as ModuleStateContextValue<TDraft>;
}
