import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateProjectProfile } from '../utils/projectCalculator';

const EVENTS = [
  { id: 'bad_weather', name: '🌧️ Сильные дожди', description: 'Затяжные дожди', type: 'negative', effect: { type: 'duration', value: 2, reason: 'погода' } },
  { id: 'supply_issue', name: '📦 Задержка поставок', description: 'Поставщик задерживает материалы', type: 'negative', effect: { type: 'resource', resource: 'materials', value: -100, reason: 'срыв поставок' } },
  { id: 'good_weather', name: '☀️ Отличная погода', description: 'Ускоряет работы', type: 'positive', effect: { type: 'duration', value: -1, reason: 'погода' } },
  { id: 'extra_funding', name: '💵 Доп. финансирование', description: 'Новые инвестиции', type: 'positive', effect: { type: 'resource', resource: 'money', value: 500, reason: 'инвестиции' } },
  { id: 'worker_strike', name: '👷 Забастовка', description: 'Требуют повышения ЗП', type: 'negative', effect: { type: 'duration', value: 1, reason: 'забастовка' } },
  { id: 'tech_breakthrough', name: '🚀 Прорыв', description: 'Новая технология', type: 'positive', effect: { type: 'duration', value: -2, reason: 'технологии' } }
];

const BANKRUPTCY_MESSAGES = {
  money: '💸 БАНКРОТСТВО! Закончилось финансирование. Проект остановлен.',
  labor: '👷 КРИЗИС! Некому работать. Проект остановлен.',
  materials: '🏗️ КОЛЛАПС! Закончились материалы. Проект остановлен.',
  electricity: '⚡ КАТАСТРОФА! Отключение электроэнергии. Проект остановлен.'
};

// Функция для генерации этапов на основе данных из формы
const generatePhasesFromProjectData = (projectData, totalResources) => {
  const totalDuration = projectData?.durationMonths || 48;
  
  const basePhases = [
    { id: 0, name: 'Изыскания и проектирование', description: 'Разработка технического паспорта, геодезические и геологические работы', weight: 0.15 },
    { id: 1, name: 'Подготовка и земляные работы', description: 'Расчистка территории и выемка грунта', weight: 0.15 },
    { id: 2, name: 'Строительство опор и укладка путей', description: 'Возведение конструкций и монтаж рельсов', weight: 0.30 },
    { id: 3, name: 'Электрификация и станции', description: 'Контактная сеть и строительство станций', weight: 0.20 },
    { id: 4, name: 'Пусконаладка', description: 'Тестирование систем', weight: 0.10 },
    { id: 5, name: 'Испытания и запуск', description: 'Финальные испытания и ввод в эксплуатацию', weight: 0.10 }
  ];
  
  let remainingDuration = totalDuration;
  
  // Сначала создаём этапы с длительностью
  const phasesWithDuration = basePhases.map((phase, index) => {
    let duration;
    if (index === basePhases.length - 1) {
      duration = remainingDuration;
    } else {
      duration = Math.max(1, Math.round(totalDuration * phase.weight));
      remainingDuration -= duration;
    }
    duration = Math.max(1, duration);
    
    return {
      id: index,
      name: phase.name,
      description: phase.description,
      duration: duration,
      weight: phase.weight
    };
  });
  
  // Распределяем общие ресурсы пропорционально весу этапов
  const phases = phasesWithDuration.map((phase) => {
    // Ресурсы пропорциональны весу этапа
    const resourceRatio = phase.weight;
    
    const requiredResources = {
      money: Math.round((totalResources?.money || 6000) * resourceRatio),
      labor: Math.round((totalResources?.labor || 1200) * resourceRatio),
      materials: Math.round((totalResources?.materials || 5000) * resourceRatio),
      electricity: Math.round((totalResources?.electricity || 1000) * resourceRatio)
    };
    
    return {
      id: phase.id,
      name: phase.name,
      description: phase.description,
      duration: phase.duration,
      requiredResources: requiredResources,
      allocatedResources: null,
      completed: false,
      startMonth: null,
      progress: 0,
      originalDuration: phase.duration,
      originalResources: { ...requiredResources },
      eventTriggered: false
    };
  });
  
  return phases;
};

export function useGameLogic(projectData) {
  // Получаем рассчитанные ресурсы из projectCalculator
  const profile = calculateProjectProfile(projectData);
  const totalResources = profile.resources;
  const totalDuration = profile.durationMonths;
  
  // Генерируем этапы на основе общих ресурсов
  const phases = generatePhasesFromProjectData(projectData, totalResources);
  
  // Начальные ресурсы - те же, что и в форме (с запасом 30%)
  const initialResources = {
    money: Math.round(totalResources.money * 1.3),
    labor: Math.round(totalResources.labor * 1.3),
    materials: Math.round(totalResources.materials * 1.3),
    electricity: Math.round(totalResources.electricity * 1.3)
  };
  
  const [gameState, setGameState] = useState({
    status: 'idle',
    currentMonth: 0,
    currentPhase: 0,
    resources: initialResources,
    phases: phases,
    logs: [],
    eventQueue: []
  });
  
  const [showEvent, setShowEvent] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [showVictory, setShowVictory] = useState(false);
  const [showBankruptcy, setShowBankruptcy] = useState(false);
  const [bankruptcyReason, setBankruptcyReason] = useState(null);
  const intervalRef = useRef(null);

  const addLog = (prev, message) => [`[Месяц ${prev.currentMonth}] ${message}`, ...prev.logs].slice(0, 50);

  const checkBankruptcy = useCallback((resources) => {
    if (resources.money <= 0) return 'money';
    if (resources.labor <= 0) return 'labor';
    if (resources.materials <= 0) return 'materials';
    if (resources.electricity <= 0) return 'electricity';
    return null;
  }, []);

  const getRandomEvent = useCallback(() => {
    return EVENTS[Math.floor(Math.random() * EVENTS.length)];
  }, []);

  const closeEvent = useCallback(() => {
    setGameState(prev => ({ ...prev, eventQueue: [], status: 'running' }));
    setShowEvent(false);
    setCurrentEvent(null);
  }, []);

  useEffect(() => {
    if (gameState.eventQueue.length > 0 && !showEvent && gameState.status === 'running') {
      setCurrentEvent(gameState.eventQueue[0]);
      setShowEvent(true);
      setGameState(prev => ({ ...prev, status: 'paused' }));
    }
  }, [gameState.eventQueue, showEvent, gameState.status]);

  const applyEvent = useCallback((event) => {
    const effect = event.effect;
    setGameState(prev => {
      const newPhases = [...prev.phases];
      const currentPhaseData = { ...newPhases[prev.currentPhase] };
      
      let logMsg = '';
      let newState;
      
      if (effect.type === 'duration') {
        const oldDuration = currentPhaseData.duration;
        const newDuration = Math.max(1, oldDuration + effect.value);
        const durationChange = newDuration - oldDuration;
        
        currentPhaseData.duration = newDuration;
        
        if (durationChange > 0) {
          const additionalResources = {
            money: Math.round((currentPhaseData.requiredResources.money / oldDuration) * durationChange),
            labor: Math.round((currentPhaseData.requiredResources.labor / oldDuration) * durationChange),
            materials: Math.round((currentPhaseData.requiredResources.materials / oldDuration) * durationChange),
            electricity: Math.round((currentPhaseData.requiredResources.electricity / oldDuration) * durationChange)
          };
          
          currentPhaseData.requiredResources = {
            money: currentPhaseData.requiredResources.money + additionalResources.money,
            labor: currentPhaseData.requiredResources.labor + additionalResources.labor,
            materials: currentPhaseData.requiredResources.materials + additionalResources.materials,
            electricity: currentPhaseData.requiredResources.electricity + additionalResources.electricity
          };
          
          if (currentPhaseData.allocatedResources) {
            currentPhaseData.allocatedResources = {
              money: currentPhaseData.allocatedResources.money + additionalResources.money,
              labor: currentPhaseData.allocatedResources.labor + additionalResources.labor,
              materials: currentPhaseData.allocatedResources.materials + additionalResources.materials,
              electricity: currentPhaseData.allocatedResources.electricity + additionalResources.electricity
            };
          }
          
          logMsg = `${event.name}: Длительность +${durationChange} мес. Ресурсы увеличены`;
        } else if (durationChange < 0) {
          const reducedResources = {
            money: Math.round((currentPhaseData.requiredResources.money / oldDuration) * Math.abs(durationChange)),
            labor: Math.round((currentPhaseData.requiredResources.labor / oldDuration) * Math.abs(durationChange)),
            materials: Math.round((currentPhaseData.requiredResources.materials / oldDuration) * Math.abs(durationChange)),
            electricity: Math.round((currentPhaseData.requiredResources.electricity / oldDuration) * Math.abs(durationChange))
          };
          
          currentPhaseData.requiredResources = {
            money: Math.max(0, currentPhaseData.requiredResources.money - reducedResources.money),
            labor: Math.max(0, currentPhaseData.requiredResources.labor - reducedResources.labor),
            materials: Math.max(0, currentPhaseData.requiredResources.materials - reducedResources.materials),
            electricity: Math.max(0, currentPhaseData.requiredResources.electricity - reducedResources.electricity)
          };
          
          logMsg = `${event.name}: Длительность ${durationChange} мес. Ресурсы уменьшены`;
        } else {
          logMsg = `${event.name}: Длительность ${effect.value > 0 ? '+' : ''}${effect.value} мес.`;
        }
        
        newPhases[prev.currentPhase] = currentPhaseData;
        newState = { ...prev, phases: newPhases, eventQueue: [], status: 'running', logs: addLog(prev, logMsg) };
        
      } else if (effect.type === 'resource') {
        const newVal = Math.max(0, prev.resources[effect.resource] + effect.value);
        const newResources = { ...prev.resources, [effect.resource]: newVal };
        logMsg = `${event.name}: ${effect.resource} ${effect.value > 0 ? '+' : ''}${effect.value}`;
        newState = { ...prev, resources: newResources, eventQueue: [], status: 'running', logs: addLog(prev, logMsg) };
        
      } else {
        newState = { ...prev, eventQueue: [], status: 'running', logs: addLog(prev, `${event.name}: ${event.description}`) };
      }
      
      const bankruptResource = checkBankruptcy(newState.resources);
      if (bankruptResource) {
        setBankruptcyReason(bankruptResource);
        setShowBankruptcy(true);
        return { ...newState, status: 'bankrupt', logs: addLog(newState, BANKRUPTCY_MESSAGES[bankruptResource]) };
      }
      
      return newState;
    });
    setShowEvent(false);
    setCurrentEvent(null);
  }, [checkBankruptcy]);

  const allocateResources = useCallback((phaseId, resources) => {
    setGameState(prev => {
      const updatedPhases = [...prev.phases];
      const phase = updatedPhases[phaseId];
      if (!phase || phase.allocatedResources) return prev;

      const hasEnough = Object.entries(resources).every(([key, value]) => value <= prev.resources[key]);
      if (!hasEnough) {
        const missingResources = Object.entries(resources)
          .filter(([key, value]) => value > prev.resources[key])
          .map(([key]) => key);
        
        const logMessage = `❌ Недостаточно ресурсов для "${phase.name}". Не хватает: ${missingResources.join(', ')}`;
        const isBankrupt = missingResources.some(key => prev.resources[key] <= 0);
        
        if (isBankrupt) {
          const bankruptResource = missingResources.find(key => prev.resources[key] <= 0);
          setBankruptcyReason(bankruptResource);
          setShowBankruptcy(true);
          return { ...prev, status: 'bankrupt', logs: addLog(prev, `${logMessage}\n${BANKRUPTCY_MESSAGES[bankruptResource]}`) };
        }
        
        return { ...prev, logs: addLog(prev, logMessage) };
      }

      const meetsReq = Object.entries(phase.requiredResources).every(([key, value]) => resources[key] >= value);
      if (!meetsReq) {
        const insufficientResources = Object.entries(phase.requiredResources)
          .filter(([key, value]) => resources[key] < value)
          .map(([key]) => key);
        
        return { ...prev, logs: addLog(prev, `⚠️ Мало ресурсов для старта "${phase.name}". Не хватает: ${insufficientResources.join(', ')}`) };
      }

      const newResources = { ...prev.resources };
      Object.entries(resources).forEach(([key, value]) => { 
        newResources[key] -= value; 
      });

      phase.allocatedResources = resources;
      phase.startMonth = prev.currentMonth;

      const newState = { ...prev, phases: updatedPhases, resources: newResources, logs: addLog(prev, `✅ Начат "${phase.name}". Списано: ${JSON.stringify(resources)}`) };
      
      const bankruptResource = checkBankruptcy(newState.resources);
      if (bankruptResource) {
        setBankruptcyReason(bankruptResource);
        setShowBankruptcy(true);
        return { ...newState, status: 'bankrupt', logs: addLog(newState, BANKRUPTCY_MESSAGES[bankruptResource]) };
      }
      
      return newState;
    });
  }, [checkBankruptcy]);

  const updateProgress = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== 'running') return prev;
      
      const bankruptResource = checkBankruptcy(prev.resources);
      if (bankruptResource) {
        setBankruptcyReason(bankruptResource);
        setShowBankruptcy(true);
        return { ...prev, status: 'bankrupt', logs: addLog(prev, BANKRUPTCY_MESSAGES[bankruptResource]) };
      }
      
      const updatedPhases = [...prev.phases];
      const currentPhaseData = updatedPhases[prev.currentPhase];
      
      if (!currentPhaseData || !currentPhaseData.allocatedResources) return prev;

      const monthsPerTick = 1;
      const progressIncrement = (100 / currentPhaseData.duration) * monthsPerTick;
      let newProgress = currentPhaseData.progress + progressIncrement;
      let newMonth = prev.currentMonth + monthsPerTick;
      
      if (newProgress >= 100) {
        newProgress = 100;
        currentPhaseData.completed = true;
        currentPhaseData.progress = 100;
        const nextPhaseIndex = prev.currentPhase + 1;

        if (nextPhaseIndex >= prev.phases.length) {
          setShowVictory(true);
          return { 
            ...prev, 
            phases: updatedPhases, 
            currentMonth: newMonth, 
            status: 'finished', 
            logs: addLog(prev, '🏆 ПРОЕКТ ЗАВЕРШЕН!') 
          };
        }

        if (prev.eventQueue.length === 0 && !showEvent) {
          const evt = getRandomEvent();
          return { 
            ...prev, 
            phases: updatedPhases, 
            currentMonth: newMonth, 
            currentPhase: nextPhaseIndex, 
            eventQueue: [evt], 
            status: 'paused', 
            logs: addLog(prev, `✨ Событие после этапа "${currentPhaseData.name}": ${evt.name}`) 
          };
        }

        return { 
          ...prev, 
          phases: updatedPhases, 
          currentMonth: newMonth, 
          currentPhase: nextPhaseIndex, 
          logs: addLog(prev, `🎉 Завершён "${currentPhaseData.name}"`) 
        };
      }

      currentPhaseData.progress = newProgress;
      
      let newLogs = prev.logs;
      const prevPercentStep = Math.floor((currentPhaseData.progress - progressIncrement) / 25);
      const newPercentStep = Math.floor(newProgress / 25);
      if (newPercentStep > prevPercentStep && newProgress < 100) {
        newLogs = addLog(prev, `📊 "${currentPhaseData.name}": ${Math.round(newProgress)}%`);
      }
      
      return { 
        ...prev, 
        phases: updatedPhases, 
        currentMonth: newMonth, 
        logs: newLogs 
      };
    });
  }, [showEvent, getRandomEvent, checkBankruptcy]);

  useEffect(() => {
    if (gameState.status === 'running' && !showEvent && gameState.eventQueue.length === 0) {
      intervalRef.current = setInterval(() => updateProgress(), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [gameState.status, showEvent, gameState.eventQueue.length, updateProgress]);

  const startGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'running', logs: addLog(prev, prev.status === 'idle' ? '🚀 Проект запущен!' : '▶️ Продолжаем') }));
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'paused', logs: addLog(prev, '⏸️ Пауза') }));
  }, []);

  const resetGame = useCallback(() => {
    clearInterval(intervalRef.current);
    
    // Обновляем профиль и ресурсы
    const newProfile = calculateProjectProfile(projectData);
    const newTotalResources = newProfile.resources;
    const newPhases = generatePhasesFromProjectData(projectData, newTotalResources);
    const newInitialResources = {
      money: Math.round(newTotalResources.money * 1.3),
      labor: Math.round(newTotalResources.labor * 1.3),
      materials: Math.round(newTotalResources.materials * 1.3),
      electricity: Math.round(newTotalResources.electricity * 1.3)
    };
    
    setGameState({
      status: 'idle',
      currentMonth: 0,
      currentPhase: 0,
      resources: newInitialResources,
      phases: newPhases,
      logs: [],
      eventQueue: []
    });
    
    setShowEvent(false);
    setCurrentEvent(null);
    setShowVictory(false);
    setShowBankruptcy(false);
    setBankruptcyReason(null);
  }, [projectData]);

  return { 
    gameState, 
    showEvent, 
    currentEvent, 
    showVictory, 
    setShowVictory, 
    showBankruptcy,
    bankruptcyReason,
    setShowBankruptcy,
    allocateResources, 
    startGame, 
    pauseGame, 
    resetGame, 
    applyEvent, 
    closeEvent 
  };
}