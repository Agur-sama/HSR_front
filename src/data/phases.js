export const phases = [
  {
    id: 1,
    name: 'Изыскания и проектирование',
    description: 'Разработка технического паспорта, геодезические и геологические работы',
    duration: 12,
    resources: {
      money: 500,
      labor: 50,
      materials: 100,
      electricity: 30
    }
  },
  {
    id: 2,
    name: 'Подготовка и строительство инфраструктуры',
    description: 'Устройство земляного полотна, монтаж верхнего строения пути, возведение мостов и тоннелей',
    duration: 24,
    resources: {
      money: 2000,
      labor: 500,
      materials: 2000,
      electricity: 200
    }
  },
  {
    id: 3,
    name: 'Создание станций и депо',
    description: 'Строительство вокзальных комплексов и технических депо',
    duration: 18,
    resources: {
      money: 1500,
      labor: 300,
      materials: 1500,
      electricity: 150
    }
  },
  {
    id: 4,
    name: 'Техническое оснащение',
    description: 'Установка систем сигнализации, централизации и блокировки (СЦБ), электрификация',
    duration: 15,
    resources: {
      money: 1000,
      labor: 200,
      materials: 800,
      electricity: 500
    }
  },
  {
    id: 5,
    name: 'Испытания и запуск',
    description: 'Тестирование подвижного состава и ввод объекта в эксплуатацию',
    duration: 6,
    resources: {
      money: 300,
      labor: 100,
      materials: 50,
      electricity: 100
    }
  }
];

export const totalResources = {
  money: 6000,
  labor: 1200,
  materials: 5000,
  electricity: 1000
};