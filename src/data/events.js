export const events = [
  // Положительные события
  {
    id: 'good_1',
    name: 'Эффективное проектирование',
    description: 'Использование BIM-технологий ускорило проектирование',
    minPhase: 1,
    maxPhase: 1,
    effect: {
      type: 'duration',
      value: -2,
      phases: [1]
    }
  },
  {
    id: 'good_2',
    name: 'Досрочная поставка материалов',
    description: 'Поставщики доставили материалы раньше срока',
    minPhase: 2,
    maxPhase: 3,
    effect: {
      type: 'duration',
      value: -3,
      phases: [2, 3]
    }
  },
  {
    id: 'good_3',
    name: 'Хорошая погода',
    description: 'Благоприятные погодные условия ускорили строительство',
    minPhase: 2,
    maxPhase: 4,
    effect: {
      type: 'duration',
      value: -2,
      phases: [2, 3, 4]
    }
  },
  {
    id: 'good_4',
    name: 'Инновационное оборудование',
    description: 'Новое оборудование повысило эффективность работ',
    minPhase: 4,
    maxPhase: 4,
    effect: {
      type: 'duration',
      value: -2,
      phases: [4]
    }
  },
  {
    id: 'good_5',
    name: 'Успешные испытания',
    description: 'Все тесты пройдены с первого раза',
    minPhase: 5,
    maxPhase: 5,
    effect: {
      type: 'duration',
      value: -1,
      phases: [5]
    }
  },

  // Отрицательные события
  {
    id: 'bad_1',
    name: 'Ошибка в проектной документации',
    description: 'Обнаружены ошибки, требуется переделка',
    minPhase: 1,
    maxPhase: 1,
    effect: {
      type: 'duration',
      value: 3,
      phases: [1]
    }
  },
  {
    id: 'bad_2',
    name: 'Сложные грунты',
    description: 'Геологические условия оказались сложнее ожидаемых',
    minPhase: 2,
    maxPhase: 2,
    effect: {
      type: 'duration',
      value: 4,
      phases: [2]
    }
  },
  {
    id: 'bad_3',
    name: 'Нехватка рабочих',
    description: 'Часть рабочих уехала на другой проект',
    minPhase: 2,
    maxPhase: 3,
    effect: {
      type: 'resource',
      resource: 'labor',
      value: -50,
      phases: [2, 3]
    }
  },
  {
    id: 'bad_4',
    name: 'Авария на стройке',
    description: 'Произошла авария, работы приостановлены',
    minPhase: 2,
    maxPhase: 4,
    effect: {
      type: 'duration',
      value: 3,
      phases: [2, 3, 4]
    }
  },
  {
    id: 'bad_5',
    name: 'Перебои с электричеством',
    description: 'Проблемы с энергоснабжением на объекте',
    minPhase: 4,
    maxPhase: 4,
    effect: {
      type: 'duration',
      value: 2,
      phases: [4]
    }
  },
  {
    id: 'bad_6',
    name: 'Коррупционный скандал',
    description: 'Проверка контролирующих органов задерживает работы',
    minPhase: 5,
    maxPhase: 5,
    effect: {
      type: 'duration',
      value: 2,
      phases: [5]
    }
  },
  {
    id: 'bad_7',
    name: 'Рост цен на материалы',
    description: 'Материалы подорожали, бюджет увеличивается',
    minPhase: 1,
    maxPhase: 4,
    effect: {
      type: 'resource',
      resource: 'money',
      value: -200,
      phases: [1, 2, 3, 4]
    }
  },
  {
    id: 'bad_8',
    name: 'Кража материалов',
    description: 'Часть материалов похищена со склада',
    minPhase: 2,
    maxPhase: 3,
    effect: {
      type: 'resource',
      resource: 'materials',
      value: -100,
      phases: [2, 3]
    }
  }
];