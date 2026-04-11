import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const defaultProjectData = {
  routeType: 'ВСМ-1: Москва – Санкт-Петербург',
  customer: 'ПИШ (работа на паре)',
  durationMonths: 36,
  distanceKm: 600,
  workers: 100,
  bridges: 5,
  terrain: 'Равнина',
  budget: 1000,
  workerSalary: 150
};

const STORAGE_KEY = 'vsm-project-data';
const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projectData, setProjectData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultProjectData, ...JSON.parse(saved) } : defaultProjectData;
    } catch {
      return defaultProjectData;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
  }, [projectData]);

  const saveProjectData = (data) => {
    setProjectData({
      ...defaultProjectData,
      ...data
    });
  };

  const resetProjectData = () => {
    setProjectData(defaultProjectData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProjectData));
  };

  const value = useMemo(
    () => ({
      projectData,
      saveProjectData,
      resetProjectData
    }),
    [projectData]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used inside ProjectProvider');
  }

  return context;
}