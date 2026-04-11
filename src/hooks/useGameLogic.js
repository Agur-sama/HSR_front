import { useState, useEffect, useCallback } from 'react';
import { phases, totalResources } from '../data/phases';
import { events } from '../data/events';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState({
    status: 'idle',
    currentPhase: 0,
    currentMonth: 0,
    totalMonths: phases.reduce((sum, p) => sum + p.duration, 0),
    resources: { ...totalResources },
    phases: phases.map(p => ({
      ...p,
      progress: 0,
      allocatedResources: null,
      completed: false,
      startMonth: null,
      endMonth: null,
      events: []
    })),
    logs: []
  });

  const [showEvent, setShowEvent] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [showVictory, setShowVictory] = useState(false);

  const getRandomEventsForPhase = useCallback((phaseIndex) => {
    const phase = phases[phaseIndex];
    if (!phase) return [];
    
    const numEvents = Math.floor(Math.random() * 3);
    const availableEvents = events.filter(e => 
      e.minPhase <= phase.id && e.maxPhase >= phase.id
    );
    
    if (availableEvents.length === 0 || numEvents === 0) return [];
    
    const shuffled = [...availableEvents].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numEvents);
  }, []);

  const allocateResources = useCallback((phaseId, resources) => {
    setGameState(prev => {
      const phaseIndex = prev.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex === -1 || phaseIndex !== prev.currentPhase) {
        alert('Сначала завершите текущий этап!');
        return prev;
      }

      // Просто вычитаем то, что ввел юзер
      const updatedResources = { ...prev.resources };
      Object.entries(resources).forEach(([key, value]) => {
        updatedResources[key] = (updatedResources[key] || 0) - value;
      });

      const phaseEvents = getRandomEventsForPhase(phaseIndex);

      const updatedPhases = [...prev.phases];
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        allocatedResources: resources,
        startMonth: prev.currentMonth,
        events: phaseEvents
      };

      const logs = [...prev.logs, `✅ Ресурсы распределены на этап "${updatedPhases[phaseIndex].name}"`];
      
      if (phaseEvents.length > 0) {
        logs.push(`⚠️ На этапе ожидается ${phaseEvents.length} случайных событий`);
      }

      return {
        ...prev,
        phases: updatedPhases,
        resources: updatedResources,
        logs
      };
    });
  }, [getRandomEventsForPhase]);

  const applyEvent = useCallback((event) => {
    setGameState(prev => {
      const effect = event.effect;
      let newState = { ...prev };

      switch (effect.type) {
        case 'duration':
          newState.phases = prev.phases.map(p => {
            if (effect.phases.includes(p.id)) {
              const newDuration = Math.max(1, p.duration + effect.value);
              return { ...p, duration: newDuration };
            }
            return p;
          });
          newState.totalMonths = newState.phases.reduce((sum, p) => sum + p.duration, 0);
          break;

        case 'resource':
          newState.resources[effect.resource] = 
            Math.max(0, (newState.resources[effect.resource] || 0) + effect.value);
          break;
      }

      newState.logs = [...prev.logs, `⚡ Событие: ${event.name} — ${event.description}`];
      return newState;
    });

    setShowEvent(false);
    setCurrentEvent(null);
  }, []);

  useEffect(() => {
    if (gameState.status !== 'running') return;
    
    const currentPhaseData = gameState.phases[gameState.currentPhase];
    if (!currentPhaseData || !currentPhaseData.events || currentPhaseData.events.length === 0) return;

    const monthsSinceStart = gameState.currentMonth - currentPhaseData.startMonth;
    const eventIndex = Math.floor(monthsSinceStart / (currentPhaseData.duration / (currentPhaseData.events.length + 1)));
    
    if (eventIndex >= 0 && eventIndex < currentPhaseData.events.length && !currentPhaseData.events[eventIndex].triggered) {
      const event = currentPhaseData.events[eventIndex];
      setCurrentEvent(event);
      setShowEvent(true);
      
      setGameState(prev => {
        const updatedPhases = [...prev.phases];
        const phase = updatedPhases[prev.currentPhase];
        phase.events = phase.events.map((e, i) => 
          i === eventIndex ? { ...e, triggered: true } : e
        );
        return { ...prev, phases: updatedPhases };
      });
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState.status !== 'running') return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.currentPhase >= prev.phases.length) {
          setShowVictory(true);
          return { ...prev, status: 'finished' };
        }

        const currentPhaseData = prev.phases[prev.currentPhase];
        
        if (!currentPhaseData.allocatedResources) {
          return prev;
        }

        const monthsWorked = prev.currentMonth - currentPhaseData.startMonth;
        const progress = Math.min(100, (monthsWorked / currentPhaseData.duration) * 100);
        
        const updatedPhases = [...prev.phases];
        updatedPhases[prev.currentPhase] = {
          ...currentPhaseData,
          progress
        };

        if (progress >= 100 && !currentPhaseData.completed) {
          updatedPhases[prev.currentPhase] = {
            ...currentPhaseData,
            progress: 100,
            completed: true,
            endMonth: prev.currentMonth
          };

          return {
            ...prev,
            currentPhase: prev.currentPhase + 1,
            currentMonth: prev.currentMonth + 1,
            phases: updatedPhases,
            logs: [...prev.logs, `🎉 Этап "${currentPhaseData.name}" завершен!`]
          };
        }

        return {
          ...prev,
          currentMonth: prev.currentMonth + 1,
          phases: updatedPhases
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.status]);

  const startGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'running' }));
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'paused' }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      status: 'idle',
      currentPhase: 0,
      currentMonth: 0,
      totalMonths: phases.reduce((sum, p) => sum + p.duration, 0),
      resources: { ...totalResources },
      phases: phases.map(p => ({
        ...p,
        progress: 0,
        allocatedResources: null,
        completed: false,
        startMonth: null,
        endMonth: null,
        events: []
      })),
      logs: []
    });
    setShowVictory(false);
  }, []);

  return {
    gameState,
    showEvent,
    currentEvent,
    showVictory,
    setShowVictory,
    allocateResources,
    startGame,
    pauseGame,
    resetGame,
    applyEvent,
    closeEvent: () => setShowEvent(false)
  };
};