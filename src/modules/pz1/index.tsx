import { useState } from 'react';
import type { CSSProperties, ChangeEvent, DragEvent, ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Pz1PassengerFlowModeInputs,
  Pz1PassengerFlowRegionalInputs,
  Pz1PassengerFlowResult,
  Pz1RegionalCharacteristicInputs,
  Pz1RegionalParameterInputs,
  TransportModeId,
} from '../../bridge/schema';
import { ModuleStateProvider, useModuleState } from '../../bridge/context';
import { jsonFileDraftStorage } from '../../bridge/storage';
import { ModuleShell } from '../../shared/ui/ModuleShell';
import type { ModuleTaskStep } from '../../shared/ui/ModuleShell';
import { DataEntryTable } from '../../shared/ui/DataEntryTable';
import { FieldWithHint } from '../../shared/ui/FieldWithHint';
import { GroupedNumberInput } from '../../shared/ui/GroupedNumberInput';
import { OsmStationMap } from './OsmStationMap';
import {
  countFilledConsumerCells,
  correspondenceTravelTimeRows,
  consumerRows,
  createInitialPz1Draft,
  createPz1Bridge,
  createPz1Result,
  discomfortRows,
  finalIndicators,
  getCorrespondenceTitle,
  getComputedFinalIndicators,
  getDuplicateStationNames,
  getEnabledStationRegions,
  getEffectivePassengerFlowInputs,
  getHsrTravelTimeResult,
  getPz1PassengerFlowForecast,
  getPz1CorrespondencePassengerFlowForecast,
  getPz1CorrespondenceScenarios,
  getPz1TaskStepCount,
  pz1StepIds,
  getPz1RegionalCharacteristics,
  getRouteMetrics,
  getStationRouteDistances,
  getSyncedCorrespondenceDetails,
  getSyncedCorrespondenceTables,
  INDUCED_DEMAND_TOOLTIP,
  isHsrTravelTimeComplete,
  isFinalIndicatorsComplete,
  isPassportComplete,
  isRegionalCharacteristicsComplete,
  isStationsStepComplete,
  isTransportModeRemovable,
  excludeTransportMode,
  getActiveTransportColumns,
  getExcludedTransportColumns,
  restoreTransportMode,
  passengerFlowModeRows,
  passengerFlowRegionalFields,
  regionalParameterFields,
  russianRegions,
  sanitizeFileName,
  stationOtherParameterRows,
  syncCorrespondenceTables,
  syncCorrespondenceDetails,
  transportColumns,
  updateCellValue,
  validateConsumerCell,
  validateDiscomfortCell,
  validateHsrSpeed,
  validateAnnualFlowField,
  isAnnualFlowFieldLocked,
  validateOtherParameterField,
  validateRegionalCharacteristicField,
  validateRegionParameterField,
  validateStationField,
} from './model';
import type { Pz1StepId } from './model';
import type { Pz1CorrespondenceDetailDraft, Pz1CorrespondenceTableDraft, Pz1Draft, Pz1StationDraft } from './types';
import { getPz1VariantTitle, pz1Variants } from './variants';

export function Pz1Module() {
  return (
    <ModuleStateProvider<Pz1Draft> initialDraft={createInitialPz1Draft()}>
      <Pz1Workspace />
    </ModuleStateProvider>
  );
}

function Pz1Workspace() {
  const { draft } = useModuleState<Pz1Draft>();
  const fileSlug = sanitizeFileName(draft.passport.lineTitle, 'pz1');
  const correspondenceDetails = getSyncedCorrespondenceDetails(draft);
  const hasCorrespondences = correspondenceDetails.length > 0;
  const stepsById: Record<Pz1StepId, ModuleTaskStep> = keyStepsById([
    {
      id: 'stations',
      title: 'Размещение станций и план трассы',
      goal:
        'Назначьте начально-конечные станции (А и Г) и не более двух промежуточных (Б, В), затем проложите линию ВСМ между ними.',
      content: <StationsStep />,
      isComplete: isStationsStepComplete(draft),
      completionHint: 'Проложите линию трассы — нужно минимум две точки',
    },
    {
      id: 'hsr-travel-time',
      title: 'Время хода ВСМ',
      goal:
        'Задайте среднюю скорость на каждом перегоне. Итоговое время ВСМ рассчитывается автоматически в формате ЧЧ:ММ.',
      content: <HsrTravelTimeStep />,
      isComplete: isHsrTravelTimeComplete(draft),
      completionHint: 'Укажите среднюю скорость по каждому перегону между станциями',
    },
    {
      id: 'regional-characteristics',
      title: 'Характеристики регионов',
      goal:
        'Заполните ВРП, население, зарплату и коэффициент влияния ВВП на пассажиропоток для регионов начальной и конечной станции.',
      content: <RegionalCharacteristicsStep />,
      isComplete: isRegionalCharacteristicsComplete(draft),
      completionHint: 'Заполните параметры обоих регионов и индуцированный спрос',
    },
    {
      id: 'correspondence-travel-time',
      title: 'Время в пути',
      goal: 'Заполните четыре составляющих реального времени в дороге для всех корреспонденций на одной странице.',
      content: <AllCorrespondenceTravelTimesStep />,
      isComplete: hasCorrespondences,
      completionHint: 'Назначьте минимум две станции, чтобы появились корреспонденции',
    },
    {
      id: 'correspondence-discomfort',
      title: 'Коэффициент дискомфорта',
      goal: 'Проверьте существующие и прогнозные коэффициенты дискомфорта по всем корреспонденциям.',
      content: <AllCorrespondenceDiscomfortStep />,
      isComplete: hasCorrespondences,
      completionHint: 'Назначьте минимум две станции, чтобы появились корреспонденции',
    },
    {
      id: 'correspondence-frequency-fare',
      title: 'Частота сообщений и стоимость проезда',
      goal: 'Укажите частоту рейсов и стоимость проезда для всех корреспонденций.',
      content: <AllCorrespondenceFrequencyFareStep />,
      isComplete: hasCorrespondences,
      completionHint: 'Назначьте минимум две станции, чтобы появились корреспонденции',
    },
    {
      id: 'station-other-parameters',
      title: 'Прочие параметры',
      goal: 'Проверьте городские, автомобильные и трудовые параметры по каждой станции линии.',
      content: <StationOtherParametersStep />,
      isComplete: hasCorrespondences,
      completionHint: 'Назначьте минимум две станции, чтобы появились станционные таблицы',
    },
    {
      id: 'annual-flow',
      title: 'Годовой пассажиропоток',
      goal: 'Заполните вместимость и коэффициенты заполняемости для всех корреспонденций.',
      content: <AllCorrespondenceAnnualFlowStep />,
      isComplete: hasCorrespondences,
      completionHint: 'Назначьте минимум две станции, чтобы появились корреспонденции',
    },
    {
      id: 'model',
      title: 'Модель прогноза',
      goal: 'Проверьте результат имитационной модели по всем корреспонденциям.',
      content: <AllCorrespondenceModelStep />,
      isComplete: hasCorrespondences,
      completionHint: 'Назначьте минимум две станции, чтобы появились корреспонденции',
    },
    {
      id: 'final-indicators',
      title: 'Технико-экономические показатели',
      goal:
        'Сведите ключевые параметры линии. У капиталоёмких показателей рядом приведены справочные диапазоны — используйте их, чтобы прикинуть порядок величины.',
      content: <FinalIndicatorsStep />,
      isComplete: isFinalIndicatorsComplete(draft),
      completionHint: 'Заполните все обязательные поля, чтобы продолжить',
    },
  ]);
  // Порядок берём из pz1StepIds, а не из порядка литералов выше —
  // менять последовательность шагов нужно в одном месте, в модели.
  const taskSteps: ModuleTaskStep[] = pz1StepIds.map((stepId) => stepsById[stepId]);

  return (
    <ModuleShell
      intro={<IntroStep />}
      introComplete={isIntroComplete(draft)}
      introCompletionHint="Заполните все поля, чтобы начать"
      onSaveDraft={() => jsonFileDraftStorage.save(createPz1Bridge(draft), `${fileSlug}-bridge.json`)}
      result={<ResultStep />}
      subtitle="Практическое задание № 1"
      taskSteps={taskSteps}
      theory={<TheoryStep />}
      title="Технико-экономическое обоснование проекта ВСМ"
    />
  );
}

/** Раскладывает список шагов по их стабильным id, чтобы порядок задавался только pz1StepIds. */
function keyStepsById(steps: Array<ModuleTaskStep & { id: Pz1StepId }>): Record<Pz1StepId, ModuleTaskStep> {
  return steps.reduce(
    (map, step) => {
      map[step.id] = step;
      return map;
    },
    {} as Record<Pz1StepId, ModuleTaskStep>,
  );
}

function IntroStep() {
  const { draft, replaceDraft, setImportedBridge, updateDraft } = useModuleState<Pz1Draft>();
  const [importError, setImportError] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const selectedVariant = pz1Variants.find((variant) => variant.id === draft.selectedVariantId) ?? pz1Variants[0];

  async function importBridgeFile(file: File) {
    try {
      const bridge = await jsonFileDraftStorage.load(file);
      setImportedBridge(bridge);
      replaceDraft({ ...createInitialPz1Draft(bridge), importedFileName: file.name });
      setImportError('');
      setImportStatus(`Загружен файл: ${file.name}`);
    } catch (error) {
      setImportStatus('');
      setImportError(error instanceof Error ? error.message : 'Не удалось загрузить JSON-мост.');
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    if (file) {
      void importBridgeFile(file);
    }
    event.currentTarget.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) {
      void importBridgeFile(file);
    }
  }

  return (
    <div className="intro-layout">
      <section className="form-section">
        <p className="eyebrow">Паспорт работы</p>
        <h2>Входные данные</h2>
        <div className="form-grid">
          <label>
            <span>Название команды</span>
            <input
              maxLength={40}
              minLength={2}
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  passport: { ...currentDraft.passport, team: event.target.value },
                }))
              }
              placeholder="напр. Юнит-3"
              value={draft.passport.team}
            />
          </label>
          <label>
            <span>Учебная группа</span>
            <input
              maxLength={80}
              onChange={(event) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  passport: { ...currentDraft.passport, lineTitle: event.target.value },
                }))
              }
              placeholder="напр. ТЭД-311"
              value={draft.passport.lineTitle}
            />
          </label>
          <label>
            <span>Вариант, который вам назначили</span>
            <select
              onChange={(event) =>
                updateDraft((currentDraft) => {
                  const nextVariant = pz1Variants.find((variant) => variant.id === event.target.value) ?? selectedVariant;
                  const previousVariant = pz1Variants.find((variant) => variant.id === currentDraft.selectedVariantId) ?? selectedVariant;

                  return {
                    ...currentDraft,
                    selectedVariantId: event.target.value,
                    stationDrafts: currentDraft.stationDrafts.map((station) => {
                      if (station.label === 'А') {
                        return {
                          ...station,
                          name: station.name.trim() && station.name !== previousVariant.fromCity ? station.name : nextVariant.fromCity,
                          region:
                            station.region.trim() && station.region !== previousVariant.fromRegion ? station.region : nextVariant.fromRegion,
                        };
                      }

                      if (station.label === 'Г') {
                        return {
                          ...station,
                          name: station.name.trim() && station.name !== previousVariant.toCity ? station.name : nextVariant.toCity,
                          region:
                            station.region.trim() && station.region !== previousVariant.toRegion ? station.region : nextVariant.toRegion,
                        };
                      }

                      return station;
                    }),
                    regionalCharacteristics: {
                      ...currentDraft.regionalCharacteristics,
                      regionA:
                        currentDraft.regionalCharacteristics.regionA &&
                        currentDraft.regionalCharacteristics.regionA !== previousVariant.fromRegion
                          ? currentDraft.regionalCharacteristics.regionA
                          : nextVariant.fromRegion,
                      regionB:
                        currentDraft.regionalCharacteristics.regionB &&
                        currentDraft.regionalCharacteristics.regionB !== previousVariant.toRegion
                          ? currentDraft.regionalCharacteristics.regionB
                          : nextVariant.toRegion,
                    },
                  };
                })
              }
              value={draft.selectedVariantId}
            >
              {pz1Variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="variant-note">{selectedVariant.description}</p>
        <div className="pz1-goal-card">
          <p className="eyebrow">Цель ПЗ1</p>
          <ol>
            <li>Наметить план трассы, определить место размещения начально-конечных и промежуточных станций.</li>
            <li>Определить потребительские свойства перспективной линии ВСМ.</li>
            <li>Рассчитать прогнозируемый пассажиропоток.</li>
            <li>
              Определить технико-экономические показатели: показатели, эффекты, риски, затраты на строительство,
              билетная выручка.
            </li>
          </ol>
        </div>
      </section>

      <section className="import-section">
        <p className="eyebrow">JSON-мост</p>
        <h2>Загрузка сохранённого проекта</h2>
        <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input accept="application/json,.json" className="visually-hidden" onChange={handleFileInput} type="file" />
          <span>Выберите JSON-файл или перенесите его сюда</span>
        </label>
        {draft.importedFileName ? <p className="status-note">Активный файл: {draft.importedFileName}</p> : null}
        {importStatus ? <p className="status-note">{importStatus}</p> : null}
        {importError ? <p className="status-note status-note--error">{importError}</p> : null}
      </section>
    </div>
  );
}

function TheoryStep() {
  return (
    <div className="theory-layout">
      <section>
        <p className="eyebrow">Смысл ПЗ1</p>
        <h2>От паспорта линии к обоснованию</h2>
        <p>
          ПЗ1 собирает трассу, потребительские свойства альтернативных видов транспорта и итоговые показатели, которые
          позже становятся входом для других практических заданий.
        </p>
      </section>
      <div className="theory-grid">
        <article>
          <span>01</span>
          <h3>Трасса</h3>
          <p>
            Станции А, Г и опциональные Б, В ставятся на OpenStreetMap. Линия трассы прокладывается отдельными
            точками, чтобы обойти водоёмы и возвышенности.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Сравнение</h3>
          <p>Таблица потребительских свойств хранит исходные значения без расчётов в JSX.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Итог</h3>
          <p>JSON-мост и PDF фиксируют личный результат студента; черновик между сессиями не сохраняется автоматически.</p>
        </article>
      </div>
    </div>
  );
}

function StationsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const [activeStationLabel, setActiveStationLabel] = useState<Pz1StationDraft['label']>('А');
  const routeMetrics = getRouteMetrics(draft);
  const duplicateStationNames = getDuplicateStationNames(draft);
  const stationRouteDistances = getStationRouteDistances(draft);
  const selectedVariant = pz1Variants.find((variant) => variant.id === draft.selectedVariantId) ?? pz1Variants[0];

  function updateStation(label: Pz1StationDraft['label'], patch: Partial<Pz1StationDraft>) {
    updateDraft((currentDraft) => {
      const stationDrafts = currentDraft.stationDrafts.map((stationDraft) =>
        stationDraft.label === label ? { ...stationDraft, ...patch } : stationDraft,
      );

      return {
        ...currentDraft,
        stationDrafts,
        correspondenceTables: syncCorrespondenceTables({
          stationDrafts,
          correspondenceTables: currentDraft.correspondenceTables,
        }),
        correspondenceDetails: syncCorrespondenceDetails({
          stationDrafts,
          correspondenceDetails: currentDraft.correspondenceDetails,
        }),
      };
    });
  }

  function replaceRoutePointDrafts(routePointDrafts: Pz1Draft['routePointDrafts']) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      routePointDrafts,
    }));
  }

  return (
    <div className="stations-step">
      <div className="station-grid">
        <datalist id="russian-regions">
          {russianRegions.map((region) => (
            <option key={region} value={region} />
          ))}
        </datalist>
        {draft.stationDrafts.map((stationDraft) => {
          const isTerminal = stationDraft.type === 'terminal';
          const nameError = validateStationField(stationDraft, 'name', duplicateStationNames);
          const latError = validateStationField(stationDraft, 'lat');
          const lngError = validateStationField(stationDraft, 'lng');
          const regionError = validateStationField(stationDraft, 'region');

          return (
            <fieldset
              className={`station-editor ${stationDraft.label === activeStationLabel ? 'is-active' : ''}`}
              key={stationDraft.label}
              onFocus={() => setActiveStationLabel(stationDraft.label)}
            >
              <legend>Станция {stationDraft.label}</legend>
              <button className="station-editor__select" onClick={() => setActiveStationLabel(stationDraft.label)} type="button">
                Выбрать для карты
              </button>
              <label className="compact-toggle">
                <input
                  checked={stationDraft.enabled}
                  disabled={isTerminal}
                  onChange={(event) => updateStation(stationDraft.label, { enabled: event.target.checked })}
                  type="checkbox"
                />
                <span>{isTerminal ? 'Конечная и начальная' : 'Промежуточная'}</span>
              </label>
              <label>
                <span>Название</span>
                <input
                  aria-invalid={nameError ? true : undefined}
                  className={nameError ? 'is-invalid' : undefined}
                  onChange={(event) => updateStation(stationDraft.label, { name: event.target.value })}
                  value={stationDraft.name}
                />
                {nameError ? <small className="field-error">{nameError}</small> : null}
              </label>
              <div className="coordinate-grid">
                <label>
                  <span>Широта</span>
                  <input
                    aria-invalid={latError ? true : undefined}
                    className={latError ? 'is-invalid' : undefined}
                    inputMode="decimal"
                    onChange={(event) => updateStation(stationDraft.label, { lat: event.target.value })}
                    value={stationDraft.lat}
                  />
                  {latError ? <small className="field-error">{latError}</small> : null}
                </label>
                <label>
                  <span>Долгота</span>
                  <input
                    aria-invalid={lngError ? true : undefined}
                    className={lngError ? 'is-invalid' : undefined}
                    inputMode="decimal"
                    onChange={(event) => updateStation(stationDraft.label, { lng: event.target.value })}
                    value={stationDraft.lng}
                  />
                  {lngError ? <small className="field-error">{lngError}</small> : null}
                </label>
              </div>
              <label>
                <span>Регион станции</span>
                <input
                  aria-invalid={regionError ? true : undefined}
                  className={regionError ? 'is-invalid' : undefined}
                  list="russian-regions"
                  onChange={(event) => updateStation(stationDraft.label, { region: event.target.value })}
                  value={stationDraft.region}
                />
                {regionError ? <small className="field-error">{regionError}</small> : null}
              </label>
            </fieldset>
          );
        })}
      </div>
      {stationRouteDistances.length > 0 ? (
        <aside className="station-route-distances">
          <p className="eyebrow">Участки трассы</p>
          <h3>Расстояние между станциями</h3>
          <dl>
            {stationRouteDistances.map((distance) => (
              <div key={`${distance.fromLabel}-${distance.toLabel}`}>
                <dt>
                  {distance.fromLabel} — {distance.toLabel}
                </dt>
                <dd>{formatKm(distance.distanceKm)}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
      <OsmStationMap
        activeStationLabel={activeStationLabel}
        mapCenter={selectedVariant.mapCenter}
        mapZoom={selectedVariant.mapZoom}
        onActiveStationChange={setActiveStationLabel}
        onPreviewImageChange={(previewImage) =>
          updateDraft((currentDraft) =>
            currentDraft.previewImage === previewImage ? currentDraft : { ...currentDraft, previewImage },
          )
        }
        onRoutePointDraftsChange={replaceRoutePointDrafts}
        onStationChange={updateStation}
        routeMetrics={routeMetrics}
        routePointDrafts={draft.routePointDrafts}
        stations={draft.stationDrafts}
      />
    </div>
  );
}

function HsrTravelTimeStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const stationRouteDistances = getStationRouteDistances(draft);
  const hsrTravelTime = getHsrTravelTimeResult(draft);
  let cumulativeKm = 0;

  function updateSegmentSpeed(pairKey: string, speedKmh: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      hsrTravelTimes: {
        ...currentDraft.hsrTravelTimes,
        [pairKey]: { speedKmh },
      },
    }));
  }

  if (stationRouteDistances.length === 0) {
    return (
      <section className="empty-state">
        <h3>Перегоны пока не рассчитаны</h3>
        <p>Вернитесь к карте, поставьте станции на трассу и добавьте минимум две точки линии.</p>
      </section>
    );
  }

  return (
    <div className="hsr-time-step">
      <section className="form-section">
        <p className="eyebrow">Расчёт времени</p>
        <h3>Время хода ВСМ по перегонам</h3>
        <div className="table-scroll">
          <table className="input-table">
            <thead>
              <tr>
                <th>Перегон</th>
                <th>Километровая отметка</th>
                <th>Расстояние, км</th>
                <th>Средняя скорость, км/ч</th>
                <th>Разгон, мин</th>
                <th>Торможение, мин</th>
                <th>Время, ЧЧ:ММ</th>
              </tr>
            </thead>
            <tbody>
              {stationRouteDistances.map((distance) => {
                const pairKey = `${distance.fromLabel}-${distance.toLabel}`;
                const speedValue = draft.hsrTravelTimes[pairKey]?.speedKmh ?? '';
                const speedError = validateHsrSpeed(speedValue);
                const speed = parseNumberInput(speedValue);
                const travelTimeMinutes =
                  speed !== null && speed > 0 ? (distance.distanceKm / speed) * 60 + 3 : null;
                cumulativeKm += distance.distanceKm;

                return (
                  <tr key={pairKey}>
                    <th scope="row">{getCorrespondenceTitle(draft, distance.fromLabel, distance.toLabel)}</th>
                    <td>{formatKm(cumulativeKm)}</td>
                    <td>{formatPassengerFlowValue(distance.distanceKm)}</td>
                    <td>
                      <input
                        aria-invalid={speedError ? true : undefined}
                        className={speedError ? 'is-invalid' : undefined}
                        inputMode="decimal"
                        onChange={(event) => updateSegmentSpeed(pairKey, event.target.value)}
                        value={speedValue}
                      />
                      {speedError ? <small className="field-error">{speedError}</small> : null}
                    </td>
                    <td>2</td>
                    <td>1</td>
                    <td>{travelTimeMinutes === null ? 'не рассчитано' : formatDuration(travelTimeMinutes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="forecast-summary-panel">
        <p className="eyebrow">Итог</p>
        <h3>Итоговое время ВСМ</h3>
        <dl className="forecast-summary-grid forecast-summary-grid--compact">
          <div>
            <dt>Разгон всего</dt>
            <dd>{formatDuration(stationRouteDistances.length * 2)}</dd>
          </div>
          <div>
            <dt>Торможение всего</dt>
            <dd>{formatDuration(stationRouteDistances.length)}</dd>
          </div>
          <div>
            <dt>Перегонов</dt>
            <dd>{stationRouteDistances.length}</dd>
          </div>
          <div>
            <dt>Итого</dt>
            <dd>{hsrTravelTime ? formatDuration(hsrTravelTime.totalMinutes) : '—'}</dd>
          </div>
        </dl>
        <p className="status-note">
          Чистое время ВСМ в прогнозе берётся отсюда. Существующее время ВСМ в модели остаётся 0, потому что линии ещё нет.
        </p>
      </section>
    </div>
  );
}

function RegionalCharacteristicsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const regional = getPz1RegionalCharacteristics(draft);
  const stationRegions = getEnabledStationRegions(draft.stationDrafts);

  function updateRegionalField(fieldId: keyof Pz1RegionalCharacteristicInputs, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      regionalCharacteristics: {
        ...currentDraft.regionalCharacteristics,
        [fieldId]: value,
      },
    }));
  }

  function updateRegionParameter(region: string, fieldId: keyof Pz1RegionalParameterInputs, value: string) {
    updateDraft((currentDraft) => {
      const currentRegional = getPz1RegionalCharacteristics(currentDraft);

      return {
        ...currentDraft,
        regionalCharacteristics: {
          ...currentRegional,
          regionParameters: {
            ...(currentRegional.regionParameters ?? {}),
            [region]: {
              ...(currentRegional.regionParameters?.[region] ?? {
                grpExisting: '',
                grpForecast: '',
                populationExisting: '',
                populationForecast: '',
                averageSalary: '',
                kGdpFlow: '',
              }),
              [fieldId]: value,
            },
          },
        },
      };
    });
  }

  function getRegionParameters(region: string): Pz1RegionalParameterInputs {
    return (
      regional.regionParameters?.[region] ?? {
        grpExisting: '',
        grpForecast: '',
        populationExisting: '',
        populationForecast: '',
        averageSalary: '',
        kGdpFlow: '',
      }
    );
  }

  return (
    <div className="regional-step">
      <section className="form-section">
        <p className="eyebrow">Регионы</p>
        <h3>Характеристики регионов</h3>
        {stationRegions.length === 0 ? (
          <p className="status-note">Вернитесь к карте и выберите регион для каждой включённой станции.</p>
        ) : (
          <div className="table-scroll">
            <table className="input-table regional-parameter-table">
              <thead>
                <tr>
                  <th>Регион</th>
                  {regionalParameterFields.map((field) => (
                    <th key={field.id}>
                      {field.label}
                      <small>{field.helper}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stationRegions.map((region) => {
                  const parameters = getRegionParameters(region);

                  return (
                    <tr key={region}>
                      <th scope="row">{region}</th>
                      {regionalParameterFields.map((field) => {
                        const value = parameters[field.id];
                        const error = validateRegionParameterField(field.id, value);

                        return (
                          <td key={field.id}>
                            {field.grouped ? (
                              <GroupedNumberInput
                                ariaLabel={`${region}: ${field.label}`}
                                error={error}
                                onChange={(nextValue) => updateRegionParameter(region, field.id, nextValue)}
                                value={value}
                              />
                            ) : (
                              <input
                                aria-invalid={error ? true : undefined}
                                className={error ? 'is-invalid' : undefined}
                                inputMode="decimal"
                                onChange={(event) => updateRegionParameter(region, field.id, event.target.value)}
                                value={value}
                              />
                            )}
                            {error ? <small className="field-error">{error}</small> : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <FieldWithHint
              error={validateRegionalCharacteristicField('inducedDemandPct', regional.inducedDemandPct)}
              hint="%"
              id="regional-inducedDemandPct"
              inputMode="decimal"
              label="Прогнозируемый индуцированный спрос"
              onChange={(value) => updateRegionalField('inducedDemandPct', value)}
              tooltip={INDUCED_DEMAND_TOOLTIP}
              value={regional.inducedDemandPct}
            />
          </div>
        )}
      </section>
      <section className="forecast-summary-panel">
        <p className="eyebrow">Проверка</p>
        <h3>Что пойдёт в прогноз</h3>
        {stationRegions.length === 0 || validateRegionalCharacteristicField('inducedDemandPct', regional.inducedDemandPct) ? (
          <p className="status-note">Заполните параметры регионов, чтобы сформировать входы формулы роста рынка.</p>
        ) : (
          <p className="status-note">
            Для каждой корреспонденции берётся пара регионов её станций. Если несколько станций находятся в одном
            регионе, значения повторяются автоматически из одного блока.
          </p>
        )}
      </section>
    </div>
  );
}

function AllCorrespondenceTravelTimesStep() {
  const { draft } = useModuleState<Pz1Draft>();
  const details = getSyncedCorrespondenceDetails(draft);

  return (
    <TopicCorrespondencePage emptyText="Назначьте станции на карте, чтобы появились пары для времени в пути.">
      {details.map((detail) => (
        <CorrespondenceTravelTimeStep key={detail.pairKey} pairKey={detail.pairKey} />
      ))}
    </TopicCorrespondencePage>
  );
}

function AllCorrespondenceDiscomfortStep() {
  const { draft } = useModuleState<Pz1Draft>();
  const details = getSyncedCorrespondenceDetails(draft);

  return (
    <TopicCorrespondencePage emptyText="Назначьте станции на карте, чтобы появились пары для коэффициента дискомфорта.">
      {details.map((detail) => (
        <CorrespondenceDiscomfortStep key={detail.pairKey} pairKey={detail.pairKey} />
      ))}
    </TopicCorrespondencePage>
  );
}

function AllCorrespondenceFrequencyFareStep() {
  const { draft } = useModuleState<Pz1Draft>();
  const details = getSyncedCorrespondenceDetails(draft);

  return (
    <TopicCorrespondencePage emptyText="Назначьте станции на карте, чтобы появились пары для частоты и стоимости.">
      {details.map((detail) => (
        <section className="correspondence-topic-block" key={detail.pairKey}>
          <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
          <div className="correspondence-split-page">
            <CorrespondenceFrequencyStep pairKey={detail.pairKey} />
            <CorrespondenceFareStep pairKey={detail.pairKey} />
          </div>
        </section>
      ))}
    </TopicCorrespondencePage>
  );
}

function AllCorrespondenceAnnualFlowStep() {
  const { draft } = useModuleState<Pz1Draft>();
  const details = getSyncedCorrespondenceDetails(draft);

  return (
    <TopicCorrespondencePage emptyText="Назначьте станции на карте, чтобы появились пары для годового пассажиропотока.">
      {details.map((detail) => (
        <CorrespondenceAnnualFlowStep key={detail.pairKey} pairKey={detail.pairKey} />
      ))}
    </TopicCorrespondencePage>
  );
}

function AllCorrespondenceModelStep() {
  const { draft } = useModuleState<Pz1Draft>();
  const details = getSyncedCorrespondenceDetails(draft);

  return (
    <TopicCorrespondencePage emptyText="Назначьте станции на карте, чтобы появились пары для модели прогноза.">
      {details.map((detail) => (
        <CorrespondenceModelStep key={detail.pairKey} pairKey={detail.pairKey} />
      ))}
    </TopicCorrespondencePage>
  );
}

function TopicCorrespondencePage({ children, emptyText }: { children: ReactNode; emptyText: string }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);

  if (!hasContent) {
    return (
      <section className="empty-state">
        <h3>Корреспонденции пока не сформированы</h3>
        <p>{emptyText}</p>
      </section>
    );
  }

  return <div className="topic-correspondence-page">{children}</div>;
}

function CorrespondenceTravelTimeStep({ pairKey }: { pairKey: string }) {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const detail = getDetailOrNull(draft, pairKey);
  const scenario = getPz1CorrespondenceScenarios(draft)[pairKey];
  const travelTime = scenario?.travelTime ?? detail?.travelTime;

  if (!detail || !travelTime) {
    return <MissingCorrespondence />;
  }

  function updateTravelTime(rowId: string, modeId: TransportModeId, side: 'existing' | 'forecast', value: string) {
    updateDraft((currentDraft) =>
      patchCorrespondenceDetail(currentDraft, pairKey, (currentDetail) => {
        const currentCell = currentDetail.travelTime[rowId][modeId];
        const nextCell = {
          ...currentCell,
          [side]: value,
          forecast:
            side === 'existing' && shouldMirrorForecast(currentCell.existing, currentCell.forecast)
              ? value
              : side === 'forecast'
                ? value
                : currentCell.forecast,
        };

        return {
          ...currentDetail,
          travelTime: {
            ...currentDetail.travelTime,
            [rowId]: {
              ...currentDetail.travelTime[rowId],
              [modeId]: nextCell,
            },
          },
        };
      }),
    );
  }

  return (
    <section className="form-section correspondence-detail">
      <p className="eyebrow">Время в пути</p>
      <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
      <SplitModeTable
        columns={getActiveTransportColumns(draft, pairKey)}
        getReadOnly={(rowId, modeId, side) =>
          (modeId === 'hSR' && side === 'existing') ||
          (modeId === 'hSR' && rowId === 'cleanTravel' && side === 'forecast') ||
          (modeId === 'car' && rowId !== 'cleanTravel')
        }
        onChange={updateTravelTime}
        onExcludeMode={(modeId) => updateDraft((currentDraft) => excludeTransportMode(currentDraft, pairKey, modeId))}
        rows={correspondenceTravelTimeRows}
        values={travelTime}
      />
      <ExcludedModesBar
        excludedColumns={getExcludedTransportColumns(draft, pairKey)}
        onRestoreMode={(modeId) => updateDraft((currentDraft) => restoreTransportMode(currentDraft, pairKey, modeId))}
      />
      <p className="status-note">
        Формат времени: ЧЧ:ММ. Для личного автомобиля вводится только чистое время поездки. Крестик в шапке столбца
        исключает вид транспорта из этой корреспонденции — он пропадёт со всех её таблиц и из расчёта прогноза.
      </p>
    </section>
  );
}

function CorrespondenceDiscomfortStep({ pairKey }: { pairKey: string }) {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const detail = getDetailOrNull(draft, pairKey);
  const scenario = getPz1CorrespondenceScenarios(draft)[pairKey];

  if (!detail) {
    return <MissingCorrespondence />;
  }

  function updateDiscomfort(side: 'existing' | 'forecast', rowId: string, modeId: TransportModeId, value: string) {
    updateDraft((currentDraft) =>
      patchCorrespondenceDetail(currentDraft, pairKey, (currentDetail) => {
        const matrixKey = side === 'existing' ? 'discomfortExisting' : 'discomfortForecast';

        return {
          ...currentDetail,
          [matrixKey]: {
            values: updateCellValue(currentDetail[matrixKey].values, rowId, modeId, value) as Record<
              string,
              Record<TransportModeId, string>
            >,
          },
        };
      }),
    );
  }

  return (
    <section className="form-section correspondence-detail">
      <p className="eyebrow">Коэффициент дискомфорта</p>
      <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
      <SplitDiscomfortEditTable
        aggregates={scenario?.discomfortAggregates}
        columns={getActiveTransportColumns(draft, pairKey)}
        existingMatrix={detail.discomfortExisting}
        forecastMatrix={detail.discomfortForecast}
        onChange={updateDiscomfort}
      />
    </section>
  );
}

function CorrespondenceFrequencyStep({ pairKey }: { pairKey: string }) {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const detail = getDetailOrNull(draft, pairKey);

  if (!detail) {
    return <MissingCorrespondence />;
  }

  return (
    <section className="form-section correspondence-detail">
      <p className="eyebrow">Частота сообщения</p>
      <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
      <TransportSplitRows
        columns={getActiveTransportColumns(draft, pairKey)}
        getReadOnly={(modeId, side) => modeId === 'car' || (modeId === 'hSR' && side === 'existing')}
        helper="рейсов/сутки"
        onChange={(modeId, side, value) =>
          updateDraft((currentDraft) =>
            patchCorrespondenceDetail(currentDraft, pairKey, (currentDetail) => ({
              ...currentDetail,
              frequency: {
                ...currentDetail.frequency,
                [modeId]: mergeSplitValueOnInput(currentDetail.frequency[modeId], side, value),
              },
            })),
          )
        }
        values={detail.frequency}
      />
      <p className="status-note">Для ВСМ существующая частота равна 0. Для личного автомобиля частота заблокирована.</p>
    </section>
  );
}

function CorrespondenceFareStep({ pairKey }: { pairKey: string }) {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const detail = getDetailOrNull(draft, pairKey);

  if (!detail) {
    return <MissingCorrespondence />;
  }

  return (
    <section className="form-section correspondence-detail">
      <p className="eyebrow">Стоимость проезда</p>
      <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
      <TransportSplitRows
        columns={getActiveTransportColumns(draft, pairKey)}
        getReadOnly={(modeId, side) => modeId === 'hSR' && side === 'existing'}
        helper="руб./пасс."
        onChange={(modeId, side, value) =>
          updateDraft((currentDraft) =>
            patchCorrespondenceDetail(currentDraft, pairKey, (currentDetail) => ({
              ...currentDetail,
              fare: {
                ...currentDetail.fare,
                [modeId]: mergeSplitValueOnInput(currentDetail.fare[modeId], side, value),
              },
            })),
          )
        }
        values={detail.fare}
      />
    </section>
  );
}

function StationOtherParametersStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const enabledStations = draft.stationDrafts.filter((station) => station.enabled);

  function updateStationOtherParameter(stationLabel: Pz1StationDraft['label'], fieldId: string, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      stationOtherParameters: {
        ...currentDraft.stationOtherParameters,
        [stationLabel]: {
          ...(currentDraft.stationOtherParameters[stationLabel] ?? {}),
          [fieldId]: value,
        },
      },
    }));
  }

  if (enabledStations.length === 0) {
    return (
      <section className="empty-state">
        <h3>Станции пока не выбраны</h3>
        <p>Вернитесь к карте и включите станции, чтобы появились таблицы прочих параметров.</p>
      </section>
    );
  }

  return (
    <div className="station-parameters-grid">
      {enabledStations.map((station) => (
        <section className="form-section correspondence-detail" key={station.label}>
          <p className="eyebrow">Станция {station.label}</p>
          <h3>{station.name || station.label}</h3>
          <div className="regional-fields">
            {stationOtherParameterRows.map((row) => {
              const value = draft.stationOtherParameters[station.label]?.[row.id] ?? '';

              return (
                <FieldWithHint
                  error={validateOtherParameterField(row.id, value)}
                  hint={row.helper ?? ''}
                  id={`${station.label}-${row.id}`}
                  inputMode="decimal"
                  key={row.id}
                  label={row.label}
                  onChange={(nextValue) => updateStationOtherParameter(station.label, row.id, nextValue)}
                  value={value}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CorrespondenceAnnualFlowStep({ pairKey }: { pairKey: string }) {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const detail = getDetailOrNull(draft, pairKey);
  const scenario = getPz1CorrespondenceScenarios(draft)[pairKey];

  if (!detail || !scenario) {
    return <MissingCorrespondence />;
  }

  function updateAnnualFlow(modeId: TransportModeId, fieldId: keyof Pz1CorrespondenceDetailDraft['annualFlows'][TransportModeId], value: string) {
    updateDraft((currentDraft) =>
      patchCorrespondenceDetail(currentDraft, pairKey, (currentDetail) => {
        const currentFlow = currentDetail.annualFlows[modeId];
        const capacityExistingValue = currentFlow.capacityExisting ?? currentFlow.capacity;
        const nextFlow = {
          ...currentFlow,
          [fieldId]: value,
          capacityForecast:
            fieldId === 'capacityExisting' && shouldMirrorForecast(capacityExistingValue, currentFlow.capacityForecast ?? '')
              ? value
              : fieldId === 'capacityForecast'
                ? value
                : currentFlow.capacityForecast,
          occupancyForecast:
            fieldId === 'occupancyExisting' && shouldMirrorForecast(currentFlow.occupancyExisting, currentFlow.occupancyForecast)
              ? value
              : fieldId === 'occupancyForecast'
                ? value
                : currentFlow.occupancyForecast,
        };

        return {
          ...currentDetail,
          annualFlows: {
            ...currentDetail.annualFlows,
            [modeId]: nextFlow,
          },
        };
      }),
    );
  }

  return (
    <section className="form-section correspondence-detail">
      <p className="eyebrow">Пассажиропоток</p>
      <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
      <div className="table-scroll">
        <table className="input-table">
          <thead>
            <tr>
              <th>Вид транспорта</th>
              <th>Вместимость ТС существующая, пасс.</th>
              <th>Вместимость ТС прогнозная, пасс.</th>
              <th>Заполняемость существующая</th>
              <th>Заполняемость прогнозная</th>
              <th>Рейсов/сутки существующие</th>
              <th>Рейсов/сутки прогноз</th>
              <th>Поток существующий, пасс./год</th>
              <th>Поток прогнозный, пасс./год</th>
            </tr>
          </thead>
          <tbody>
            {getActiveTransportColumns(draft, pairKey).map((column) => {
              const annualFlow = detail.annualFlows[column.id];
              const capacityExistingValue = annualFlow.capacityExisting ?? annualFlow.capacity;
              const capacityForecastValue = annualFlow.capacityForecast ?? annualFlow.capacity;
              const capacityExistingLocked = isAnnualFlowFieldLocked('capacityExisting', column.id);
              const capacityExistingError = validateAnnualFlowField('capacityExisting', capacityExistingValue, column.id);
              const capacityForecastError = validateAnnualFlowField('capacityForecast', capacityForecastValue, column.id);
              const occupancyExistingError = validateAnnualFlowField('occupancyExisting', annualFlow.occupancyExisting, column.id);
              const occupancyForecastError = validateAnnualFlowField('occupancyForecast', annualFlow.occupancyForecast, column.id);

              return (
                <tr key={column.id}>
                  <th scope="row">{column.label}</th>
                  <td>
                    <input
                      aria-invalid={capacityExistingError ? true : undefined}
                      className={capacityExistingError ? 'is-invalid' : undefined}
                      inputMode="decimal"
                      onChange={(event) => updateAnnualFlow(column.id, 'capacityExisting', event.target.value)}
                      readOnly={capacityExistingLocked}
                      value={capacityExistingLocked ? '0' : capacityExistingValue}
                    />
                    {capacityExistingError ? <small className="field-error">{capacityExistingError}</small> : null}
                  </td>
                  <td>
                    <input
                      aria-invalid={capacityForecastError ? true : undefined}
                      className={capacityForecastError ? 'is-invalid' : undefined}
                      inputMode="decimal"
                      onChange={(event) => updateAnnualFlow(column.id, 'capacityForecast', event.target.value)}
                      value={capacityForecastValue}
                    />
                    {capacityForecastError ? <small className="field-error">{capacityForecastError}</small> : null}
                  </td>
                  <td>
                    <input
                      aria-invalid={occupancyExistingError ? true : undefined}
                      className={occupancyExistingError ? 'is-invalid' : undefined}
                      inputMode="decimal"
                      onChange={(event) => updateAnnualFlow(column.id, 'occupancyExisting', event.target.value)}
                      value={annualFlow.occupancyExisting}
                    />
                    {occupancyExistingError ? <small className="field-error">{occupancyExistingError}</small> : null}
                  </td>
                  <td>
                    <input
                      aria-invalid={occupancyForecastError ? true : undefined}
                      className={occupancyForecastError ? 'is-invalid' : undefined}
                      inputMode="decimal"
                      onChange={(event) => updateAnnualFlow(column.id, 'occupancyForecast', event.target.value)}
                      value={annualFlow.occupancyForecast}
                    />
                    {occupancyForecastError ? <small className="field-error">{occupancyForecastError}</small> : null}
                  </td>
                  <td>{detail.frequency[column.id].existing || '—'}</td>
                  <td>{detail.frequency[column.id].forecast || '—'}</td>
                  <td>{formatOptionalPassengerFlowValue(scenario.annualFlows[column.id].existingAnnualFlow)}</td>
                  <td>{formatOptionalPassengerFlowValue(scenario.annualFlows[column.id].forecastAnnualFlow)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CorrespondenceModelStep({ pairKey }: { pairKey: string }) {
  const { draft } = useModuleState<Pz1Draft>();
  const detail = getDetailOrNull(draft, pairKey);
  const forecast = getPz1CorrespondencePassengerFlowForecast(draft, pairKey);
  const missingFields = forecast ? [] : getForecastMissingFields(draft, pairKey);
  const chartData = forecast ? buildPassengerFlowChartData(forecast) : [];

  if (!detail) {
    return <MissingCorrespondence />;
  }

  return (
    <section className="forecast-summary-panel">
      <p className="eyebrow">Модель</p>
      <h3>{getCorrespondenceTitle(draft, detail.fromLabel, detail.toLabel)}</h3>
      {forecast ? (
        <>
          <dl className="forecast-summary-grid">
            <div>
              <dt>Существующий поток</dt>
              <dd>{formatPassengerFlowValue(forecast.totalDemand.existingAnnualFlow)}</dd>
            </div>
            <div>
              <dt>Базовый прогноз</dt>
              <dd>{formatPassengerFlowValue(forecast.totalDemand.baseForecast)}</dd>
            </div>
            <div>
              <dt>Индуцированный спрос</dt>
              <dd>{formatPassengerFlowValue(forecast.totalDemand.inducedDemand)}</dd>
            </div>
            <div>
              <dt>Итоговый прогноз</dt>
              <dd>{formatPassengerFlowValue(forecast.totalDemand.totalForecast)}</dd>
            </div>
          </dl>
          <div className="forecast-output-grid">
            <div className="forecast-chart">
              <ResponsiveContainer height={300} width="100%">
                <BarChart data={chartData} margin={{ bottom: 8, left: 10, right: 10, top: 18 }}>
                  <CartesianGrid stroke="#e4edfa" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatCompactPassengerFlowValue(Number(value))} />
                  <Tooltip />
                  <Legend />
                  {getActiveTransportColumns(draft, pairKey).map((column) => (
                    <Bar
                      dataKey={column.id}
                      fill={passengerFlowChartColors[column.id]}
                      key={column.id}
                      name={column.label}
                      stackId="flow"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ForecastResultTable forecast={forecast} />
          </div>
        </>
      ) : (
        <ForecastMissingState missingFields={missingFields} />
      )}
    </section>
  );
}

function ConsumerPropertiesStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const correspondenceTables = getSyncedCorrespondenceTables(draft);

  return (
    <div className="consumer-tables">
      {correspondenceTables.length === 0 ? (
        <section className="empty-state">
          <h3>Корреспонденции пока не сформированы</h3>
          <p>Назначьте станции на карте, чтобы появились пары для таблиц потребительских свойств.</p>
        </section>
      ) : null}
      {correspondenceTables.map((table) => {
        const activeColumns = transportColumns.filter((column) => table.activeModes.includes(column.id));
        const excludedColumns = transportColumns.filter((column) => !table.activeModes.includes(column.id));

        return (
          <section className="correspondence-table" key={table.pairKey}>
            <DataEntryTable
              caption={`Корреспонденция ${getCorrespondenceTitle(draft, table.fromLabel, table.toLabel)}`}
              columns={activeColumns}
              canRemoveColumn={(columnId) => isTransportModeRemovable(columnId as TransportModeId)}
              getCellMeta={(rowId, columnId) => getConsumerCellMeta(rowId, table.values[rowId]?.[columnId] ?? '')}
              getError={(rowId, columnId) => validateConsumerCell(rowId, table.values[rowId]?.[columnId] ?? '')}
              onChange={(rowId, columnId, value) => updateCorrespondenceTable(table.pairKey, { values: updateCellValue(table.values, rowId, columnId, value) })}
              onRemoveColumn={(columnId) => {
                const modeId = columnId as TransportModeId;
                if (!isTransportModeRemovable(modeId)) {
                  return;
                }

                updateCorrespondenceTable(table.pairKey, {
                  activeModes: table.activeModes.filter((activeModeId) => activeModeId !== modeId),
                });
              }}
              rows={consumerRows}
              values={table.values}
            />
            {excludedColumns.length > 0 ? (
              <div className="excluded-modes">
                <span>Исключены для этой пары:</span>
                {excludedColumns.map((column) => (
                  <button
                    className="button button--ghost"
                    key={column.id}
                    onClick={() =>
                      updateCorrespondenceTable(table.pairKey, {
                        activeModes: [...table.activeModes, column.id],
                      })
                    }
                    type="button"
                  >
                    Вернуть {column.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
      <section className="correspondence-table">
        <DataEntryTable
          caption="Коэффициент дискомфорта"
          columns={transportColumns}
          getCellMeta={(rowId, columnId) => getDiscomfortCellMeta(draft.discomfortMatrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
          getError={(rowId, columnId) => validateDiscomfortCell(draft.discomfortMatrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
          getInputClassName={() => 'discomfort-value'}
          getInputStyle={(rowId, columnId) =>
            getDiscomfortInputStyle(draft.discomfortMatrix.values[rowId]?.[columnId as TransportModeId] ?? '')
          }
          onChange={(rowId, columnId, value) => updateDiscomfortValue(rowId, columnId as TransportModeId, value)}
          rows={discomfortRows}
          values={draft.discomfortMatrix.values}
        />
      </section>
    </div>
  );

  function updateCorrespondenceTable(pairKey: string, patch: Partial<Pz1CorrespondenceTableDraft>) {
    updateDraft((currentDraft) => {
      const syncedTables = syncCorrespondenceTables(currentDraft);
      const currentTable = syncedTables[pairKey];

      if (!currentTable) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        correspondenceTables: {
          ...syncedTables,
          [pairKey]: {
            ...currentTable,
            ...patch,
          },
        },
      };
    });
  }

  function updateDiscomfortValue(rowId: string, modeId: TransportModeId, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      discomfortMatrix: {
        values: updateCellValue(currentDraft.discomfortMatrix.values, rowId, modeId, value) as Record<
          string,
          Record<TransportModeId, string>
        >,
      },
    }));
  }
}

function PassengerFlowForecastStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const forecast = getPz1PassengerFlowForecast(draft);
  const effectiveInputs = getEffectivePassengerFlowInputs(draft);
  const chartData = forecast ? buildPassengerFlowChartData(forecast) : [];
  const modeTableValues = passengerFlowModeRows.reduce<Record<string, Record<string, string>>>((values, row) => {
    values[row.id] = transportColumns.reduce<Record<string, string>>((modeValues, column) => {
      modeValues[column.id] = effectiveInputs.modes[column.id]?.[row.id] ?? '';
      return modeValues;
    }, {});
    return values;
  }, {});

  function updateRegionalField(fieldId: keyof Pz1PassengerFlowRegionalInputs, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      passengerFlowForecast: {
        ...currentDraft.passengerFlowForecast,
        regional: {
          ...currentDraft.passengerFlowForecast.regional,
          [fieldId]: value,
        },
      },
    }));
  }

  function updateModeField(modeId: TransportModeId, fieldId: keyof Pz1PassengerFlowModeInputs, value: string) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      passengerFlowForecast: {
        ...currentDraft.passengerFlowForecast,
        modes: {
          ...currentDraft.passengerFlowForecast.modes,
          [modeId]: {
            ...currentDraft.passengerFlowForecast.modes[modeId],
            [fieldId]: value,
          },
        },
      },
    }));
  }

  return (
    <div className="passenger-flow-step">
      <section className="form-section">
        <p className="eyebrow">Регионы</p>
        <h3>Параметры роста рынка</h3>
        <div className="passenger-flow-regions">
          {passengerFlowRegionalFields.map((field) => (
            <FieldWithHint
              hint={field.hint}
              id={`passenger-flow-${field.id}`}
              key={field.id}
              label={field.label}
              onChange={(value) => updateRegionalField(field.id, value)}
              value={effectiveInputs.regional[field.id]}
            />
          ))}
        </div>
      </section>

      <DataEntryTable
        caption="Параметры по видам транспорта"
        columns={transportColumns}
        getError={(rowId, columnId) =>
          validatePassengerFlowModeInput(
            rowId as keyof Pz1PassengerFlowModeInputs,
            effectiveInputs.modes[columnId as TransportModeId]?.[
              rowId as keyof Pz1PassengerFlowModeInputs
            ] ?? '',
          )
        }
        onChange={(rowId, columnId, value) =>
          updateModeField(columnId as TransportModeId, rowId as keyof Pz1PassengerFlowModeInputs, value)
        }
        rows={passengerFlowModeRows}
        values={modeTableValues}
      />

      <section className="forecast-summary-panel">
        <p className="eyebrow">Расчёт</p>
        <h3>Итог прогноза</h3>
        {forecast ? (
          <>
            <dl className="forecast-summary-grid">
              <div>
                <dt>Существующий рынок</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.existingAnnualFlow)}</dd>
              </div>
              <div>
                <dt>Базовый прогноз</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.baseForecast)}</dd>
              </div>
              <div>
                <dt>Индуцированный спрос</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.inducedDemand)}</dd>
              </div>
              <div>
                <dt>Итоговый прогноз</dt>
                <dd>{formatPassengerFlowValue(forecast.totalDemand.totalForecast)}</dd>
              </div>
            </dl>

            <div className="forecast-output-grid">
              <div className="forecast-chart">
                <ResponsiveContainer height={300} width="100%">
                  <BarChart data={chartData} margin={{ bottom: 8, left: 10, right: 10, top: 18 }}>
                    <CartesianGrid stroke="#e4edfa" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCompactPassengerFlowValue(Number(value))} />
                    <Tooltip />
                    <Legend />
                    {transportColumns.map((column) => (
                      <Bar
                        dataKey={column.id}
                        fill={passengerFlowChartColors[column.id]}
                        key={column.id}
                        name={column.label}
                        stackId="flow"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="table-scroll">
                <table className="forecast-result-table">
                  <thead>
                    <tr>
                      <th>Вид транспорта</th>
                      <th>Прогноз, пасс./год</th>
                      <th>Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.modes.map((mode) => (
                      <tr key={mode.modeId}>
                        <th scope="row">{getTransportModeLabel(mode.modeId)}</th>
                        <td>{formatPassengerFlowValue(mode.forecastAnnualFlow)}</td>
                        <td>{formatPercent(mode.forecastShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="status-note">
            Заполните числовые поля: существующий поток должен быть больше нуля, TTC и время в пути — положительными.
          </p>
        )}
      </section>
    </div>
  );
}

function FinalIndicatorsStep() {
  const { draft, updateDraft } = useModuleState<Pz1Draft>();
  const totalLengthText = formatKm(getRouteMetrics(draft).totalLengthKm);
  const computedFinalIndicators = getComputedFinalIndicators(draft);

  return (
    <div className="indicator-step">
      <div className="indicator-grid">
        {finalIndicators.map((indicator) => {
          const isComputed =
            indicator.id === 'lineLength' ||
            indicator.id === 'stationCount' ||
            indicator.id === 'annualFlow' ||
            indicator.id === 'travelTime';

          return (
            <FieldWithHint
              hint={indicator.hint}
              id={indicator.id}
              key={indicator.id}
              label={indicator.label}
              onChange={(value) =>
                updateDraft((currentDraft) => ({
                  ...currentDraft,
                  finalIndicators: { ...currentDraft.finalIndicators, [indicator.id]: value },
                }))
              }
              readOnly={isComputed}
              unit={'unit' in indicator ? indicator.unit : undefined}
              value={
                indicator.id === 'lineLength'
                  ? totalLengthText
                  : indicator.id === 'stationCount'
                    ? computedFinalIndicators.stationCount
                    : indicator.id === 'annualFlow'
                      ? computedFinalIndicators.annualFlow || 'не рассчитано'
                      : indicator.id === 'travelTime'
                        ? computedFinalIndicators.travelTime
                        : draft.finalIndicators[indicator.id] ?? ''
              }
            />
          );
        })}
      </div>
      <label className="notes-field">
        <span>Комментарий к исходным данным</span>
        <textarea
          onChange={(event) =>
            updateDraft((currentDraft) => ({
              ...currentDraft,
              notes: event.target.value,
            }))
          }
          value={draft.notes}
        />
      </label>
    </div>
  );
}

function ResultStep() {
  const { draft, setCurrentStepIndex, setPhase } = useModuleState<Pz1Draft>();
  const [exportStatus, setExportStatus] = useState('');
  const bridge = createPz1Bridge(draft);
  const result = createPz1Result(draft);
  const computedFinalIndicators = getComputedFinalIndicators(draft);
  const fileSlug = sanitizeFileName(draft.passport.lineTitle, 'pz1');
  const filledConsumerCells = countFilledConsumerCells(draft);
  const filledIndicatorCount = finalIndicators.filter((indicator) =>
    indicator.id === 'lineLength' ? result.totalLengthKm > 0 : isFilled(computedFinalIndicators[indicator.id] ?? ''),
  ).length;
  const totalLengthText = formatKm(result.totalLengthKm);
  const stationRouteDistances = getStationRouteDistances(draft);

  function returnToFinalIndicators() {
    setCurrentStepIndex(Math.max(0, getPz1TaskStepCount(draft) - 1));
    setPhase('task');
  }

  function downloadJson() {
    jsonFileDraftStorage.save(bridge, `${fileSlug}-bridge.json`);
    setExportStatus('✓ Файл сохранён');
  }

  async function downloadPdf() {
    try {
      const { downloadPz1Pdf } = await import('../../pdf/render');
      const passengerFlowChartImage = result.passengerFlowForecast
        ? createPassengerFlowChartImage(result.passengerFlowForecast)
        : undefined;
      await downloadPz1Pdf(
        {
          team: draft.passport.team,
          lineTitle: draft.passport.lineTitle,
          variantTitle: getPz1VariantTitle(draft.selectedVariantId),
          stationCount: result.stations.length,
          routePointCount: result.routeLine.vertices.length,
          totalLengthKm: result.totalLengthKm,
          filledConsumerCells,
          filledIndicatorCount,
          createdAt: draft.passport.createdAt,
          correspondenceScenarios: result.correspondenceScenarios,
          consumerProperties: result.consumerProperties,
          discomfortMatrix: result.discomfortMatrix,
          finalIndicators: result.finalIndicators,
          hsrTravelTime: result.hsrTravelTime,
          notes: result.notes,
          passengerFlowForecast: result.passengerFlowForecast,
          passengerFlowChartImage,
          regionalCharacteristics: result.regionalCharacteristics,
          routeLine: result.routeLine,
          stationRouteDistances,
          previewImage: result.previewImage,
          stations: result.stations,
        },
        `${fileSlug}-report.pdf`,
      );
      setExportStatus('✓ Файл сохранён');
    } catch {
      setExportStatus('Не удалось сформировать PDF. Попробуйте скачать JSON и повторить экспорт.');
    }
  }

  return (
    <div className="result-layout">
      <section className="result-summary">
        <p className="eyebrow">Итог ПЗ1</p>
        <h2>Задание выполнено</h2>
        <p>Проверьте сводку и скачайте отчёт. Файл JSON понадобится, если вы захотите перенести данные в следующее задание.</p>
        <dl className="summary-grid">
          <div>
            <dt>Вариант</dt>
            <dd>{getPz1VariantTitle(draft.selectedVariantId)}</dd>
          </div>
          <div>
            <dt>Число станций</dt>
            <dd>{result.stations.length}</dd>
          </div>
          <div>
            <dt>Длина трассы</dt>
            <dd>{totalLengthText}</dd>
          </div>
          <div>
            <dt>Общий пассажиропоток</dt>
            <dd>{computedFinalIndicators.annualFlow || 'не рассчитано'}</dd>
          </div>
          <div>
            <dt>Билетная выручка</dt>
            <dd>{computedFinalIndicators.ticketRevenue || 'не заполнено'}</dd>
          </div>
          <div>
            <dt>Точки линии трассы</dt>
            <dd>{result.routeLine.vertices.length}</dd>
          </div>
        </dl>
        <p className="save-warning">Сохраните файл перед выходом — прогресс не восстановится, если закрыть страницу.</p>
      </section>

      <section className="result-actions">
        <p className="eyebrow">Экспорт</p>
        <h2>Скачать файлы</h2>
        <p className="status-note">PDF нужен для сдачи преподавателю. JSON можно загрузить позже, чтобы продолжить работу с теми же данными.</p>
        <button className="button button--outline" onClick={returnToFinalIndicators} type="button">
          ← Назад к показателям
        </button>
        <button className="button button--primary" onClick={() => void downloadPdf()} type="button">
          Скачать PDF
        </button>
        <button className="button button--secondary" onClick={downloadJson} type="button">
          Скачать JSON
        </button>
        {exportStatus ? <p className="status-note">{exportStatus}</p> : null}
      </section>
    </div>
  );
}

/**
 * Список исключённых видов транспорта с кнопкой возврата (ТЗ v3.5 §4, DoD).
 * Разметка и класс `.excluded-modes` взяты из ConsumerPropertiesStep — того
 * экрана, где эта функция жила до перехода на компоновку «страница на тему».
 */
function ExcludedModesBar({
  excludedColumns,
  onRestoreMode,
}: {
  excludedColumns: typeof transportColumns;
  onRestoreMode: (modeId: TransportModeId) => void;
}) {
  if (excludedColumns.length === 0) {
    return null;
  }

  return (
    <div className="excluded-modes">
      <span>Исключены для этой корреспонденции:</span>
      {excludedColumns.map((column) => (
        <button className="button button--outline" key={column.id} onClick={() => onRestoreMode(column.id)} type="button">
          Вернуть {column.label}
        </button>
      ))}
    </div>
  );
}

function SplitModeTable({
  columns,
  getReadOnly,
  onChange,
  onExcludeMode,
  rows,
  values,
}: {
  columns: typeof transportColumns;
  getReadOnly?: (rowId: string, modeId: TransportModeId, side: 'existing' | 'forecast') => boolean;
  onChange: (rowId: string, modeId: TransportModeId, side: 'existing' | 'forecast', value: string) => void;
  onExcludeMode?: (modeId: TransportModeId) => void;
  rows: typeof correspondenceTravelTimeRows;
  values: Pz1CorrespondenceDetailDraft['travelTime'];
}) {
  return (
    <div className="table-scroll">
      <table className="input-table split-mode-table">
        <thead>
          <tr>
            <th>Показатель</th>
            {columns.map((column) => (
              <th key={column.id}>
                <span className="data-entry__column-head">
                  {column.label}
                  {onExcludeMode && isTransportModeRemovable(column.id) ? (
                    <button
                      aria-label={`Исключить ${column.label} из корреспонденции`}
                      className="data-entry__remove-column"
                      onClick={() => onExcludeMode(column.id)}
                      type="button"
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {row.label}
                {row.helper ? <small>{row.helper}</small> : null}
              </th>
              {columns.map((column) => (
                <td key={column.id}>
                  <label className="split-input">
                    <span>Сущ.</span>
                    <input
                      aria-invalid={isDurationInputInvalid(values[row.id][column.id].existing) ? true : undefined}
                      className={isDurationInputInvalid(values[row.id][column.id].existing) ? 'is-invalid' : undefined}
                      inputMode="numeric"
                      onChange={(event) => onChange(row.id, column.id, 'existing', event.target.value)}
                      readOnly={getReadOnly?.(row.id, column.id, 'existing')}
                      value={values[row.id][column.id].existing}
                    />
                    {isDurationInputInvalid(values[row.id][column.id].existing) ? <small className="field-error">ЧЧ:ММ</small> : null}
                  </label>
                  <label className="split-input">
                    <span>Прогн.</span>
                    <input
                      aria-invalid={isDurationInputInvalid(values[row.id][column.id].forecast) ? true : undefined}
                      className={isDurationInputInvalid(values[row.id][column.id].forecast) ? 'is-invalid' : undefined}
                      inputMode="numeric"
                      onChange={(event) => onChange(row.id, column.id, 'forecast', event.target.value)}
                      readOnly={getReadOnly?.(row.id, column.id, 'forecast')}
                      value={values[row.id][column.id].forecast}
                    />
                    {isDurationInputInvalid(values[row.id][column.id].forecast) ? <small className="field-error">ЧЧ:ММ</small> : null}
                  </label>
                </td>
              ))}
            </tr>
          ))}
          <tr className="input-table__total-row">
            <th scope="row">ИТОГО</th>
            {columns.map((column) => (
              <td key={column.id}>
                <div className="split-total">
                  <span>Сущ. {formatDurationTotal(values, column.id, 'existing')}</span>
                  <span>Прогн. {formatDurationTotal(values, column.id, 'forecast')}</span>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SplitDiscomfortEditTable({
  aggregates,
  columns,
  existingMatrix,
  forecastMatrix,
  onChange,
}: {
  aggregates?: Record<TransportModeId, { existing: number | null; forecast: number | null }>;
  columns: typeof transportColumns;
  existingMatrix: Pz1Draft['discomfortMatrix'];
  forecastMatrix: Pz1Draft['discomfortMatrix'];
  onChange: (side: 'existing' | 'forecast', rowId: string, modeId: TransportModeId, value: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="input-table split-discomfort-table">
        <thead>
          <tr>
            <th>Показатель</th>
            {columns.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {discomfortRows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              {columns.map((column) => {
                const existingValue = existingMatrix.values[row.id]?.[column.id] ?? '';
                const forecastValue = forecastMatrix.values[row.id]?.[column.id] ?? '';
                const existingError = validateDiscomfortCell(existingValue);
                const forecastError = validateDiscomfortCell(forecastValue);

                return (
                  <td key={column.id}>
                    <label className="split-input">
                      <span>Сущ.</span>
                      <input
                        aria-invalid={existingError ? true : undefined}
                        className={existingError ? 'is-invalid discomfort-value' : 'discomfort-value'}
                        inputMode="decimal"
                        onChange={(event) => onChange('existing', row.id, column.id, event.target.value)}
                        readOnly={column.id === 'hSR'}
                        style={getDiscomfortInputStyle(existingValue)}
                        value={existingValue}
                      />
                      {existingError ? <small className="field-error">{existingError}</small> : null}
                    </label>
                    <label className="split-input">
                      <span>Прогн.</span>
                      <input
                        aria-invalid={forecastError ? true : undefined}
                        className={forecastError ? 'is-invalid discomfort-value' : 'discomfort-value'}
                        inputMode="decimal"
                        onChange={(event) => onChange('forecast', row.id, column.id, event.target.value)}
                        style={getDiscomfortInputStyle(forecastValue)}
                        value={forecastValue}
                      />
                      {forecastError ? <small className="field-error">{forecastError}</small> : null}
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="input-table__total-row">
            <th scope="row">ИТОГО</th>
            {columns.map((column) => (
              <td key={column.id}>
                <div className="split-total">
                  <span>Сущ. {formatNullableDecimal(aggregates?.[column.id]?.existing ?? null)}</span>
                  <span>Прогн. {formatNullableDecimal(aggregates?.[column.id]?.forecast ?? null)}</span>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DiscomfortEditTable({
  aggregates,
  caption,
  matrix,
  onChange,
  side,
}: {
  aggregates?: Record<TransportModeId, { existing: number | null; forecast: number | null }>;
  caption: string;
  matrix: Pz1Draft['discomfortMatrix'];
  onChange: (rowId: string, modeId: TransportModeId, value: string) => void;
  side: 'existing' | 'forecast';
}) {
  return (
    <section className="form-section correspondence-detail">
      <DataEntryTable
        caption={caption}
        columns={transportColumns}
        getCellMeta={(rowId, columnId) => getDiscomfortCellMeta(matrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
        getError={(rowId, columnId) => validateDiscomfortCell(matrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
        getInputClassName={() => 'discomfort-value'}
        getInputStyle={(rowId, columnId) => getDiscomfortInputStyle(matrix.values[rowId]?.[columnId as TransportModeId] ?? '')}
        onChange={(rowId, columnId, value) => onChange(rowId, columnId as TransportModeId, value)}
        rows={discomfortRows}
        values={matrix.values}
      />
      <div className="aggregate-strip">
        {transportColumns.map((column) => (
          <span key={column.id}>
            {column.label}: {formatNullableDecimal(aggregates?.[column.id]?.[side] ?? null)}
          </span>
        ))}
      </div>
    </section>
  );
}

function TransportSplitRows({
  columns,
  getReadOnly,
  helper,
  onChange,
  values,
}: {
  columns: typeof transportColumns;
  getReadOnly?: (modeId: TransportModeId, side: 'existing' | 'forecast') => boolean;
  helper: string;
  onChange: (modeId: TransportModeId, side: 'existing' | 'forecast', value: string) => void;
  values: Pz1CorrespondenceDetailDraft['frequency'];
}) {
  return (
    <div className="table-scroll">
      <table className="input-table">
        <thead>
          <tr>
            <th>Вид транспорта</th>
            <th>Существующее, {helper}</th>
            <th>Прогнозное, {helper}</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.id}>
              <th scope="row">{column.label}</th>
              <td>
                <input
                  aria-invalid={isNonNegativeNumberInputInvalid(values[column.id].existing) ? true : undefined}
                  className={isNonNegativeNumberInputInvalid(values[column.id].existing) ? 'is-invalid' : undefined}
                  inputMode="decimal"
                  onChange={(event) => onChange(column.id, 'existing', event.target.value)}
                  readOnly={getReadOnly?.(column.id, 'existing')}
                  value={values[column.id].existing}
                />
                {isNonNegativeNumberInputInvalid(values[column.id].existing) ? <small className="field-error">Число ≥ 0</small> : null}
              </td>
              <td>
                <input
                  aria-invalid={isNonNegativeNumberInputInvalid(values[column.id].forecast) ? true : undefined}
                  className={isNonNegativeNumberInputInvalid(values[column.id].forecast) ? 'is-invalid' : undefined}
                  inputMode="decimal"
                  onChange={(event) => onChange(column.id, 'forecast', event.target.value)}
                  readOnly={getReadOnly?.(column.id, 'forecast')}
                  value={values[column.id].forecast}
                />
                {isNonNegativeNumberInputInvalid(values[column.id].forecast) ? <small className="field-error">Число ≥ 0</small> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ForecastResultTable({ forecast }: { forecast: Pz1PassengerFlowResult }) {
  return (
    <div className="table-scroll">
      <table className="forecast-result-table">
        <thead>
          <tr>
            <th>Вид транспорта</th>
            <th>Существующий, пасс./год</th>
            <th>Прогноз, пасс./год</th>
            <th>Доля</th>
          </tr>
        </thead>
        <tbody>
          {forecast.modes.map((mode) => (
            <tr key={mode.modeId}>
              <th scope="row">{getTransportModeLabel(mode.modeId)}</th>
              <td>{formatPassengerFlowValue(mode.existingAnnualFlow)}</td>
              <td>{formatPassengerFlowValue(mode.forecastAnnualFlow)}</td>
              <td>{formatPercent(mode.forecastShare)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MissingCorrespondence() {
  return (
    <section className="empty-state">
      <h3>Корреспонденция не найдена</h3>
      <p>Вернитесь к карте и проверьте включённые станции.</p>
    </section>
  );
}

function ForecastMissingState({ missingFields }: { missingFields: string[] }) {
  if (missingFields.length === 0) {
    return (
      <p className="status-note">
        Модель пока не рассчитана. Проверьте, чтобы существующий поток был больше 0, а время и TTC были положительными.
      </p>
    );
  }

  return (
    <div className="forecast-missing-state">
      <p className="status-note">Чтобы построить график имитационной модели, заполните недостающие поля:</p>
      <ul className="missing-field-list">
        {missingFields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </div>
  );
}

const passengerFlowChartColors: Record<TransportModeId, string> = {
  hSR: '#e0182d',
  airplane: '#003d84',
  bus: '#08a696',
  suburbanTrain: '#7b61ff',
  longDistanceTrain: '#f59e0b',
  car: '#475569',
};

function buildPassengerFlowChartData(forecast: Pz1PassengerFlowResult) {
  return [
    buildPassengerFlowChartRow('Существующий поток', (modeId) => {
      const mode = forecast.modes.find((item) => item.modeId === modeId);
      return mode?.existingAnnualFlow ?? 0;
    }),
    buildPassengerFlowChartRow('Прогноз', (modeId) => {
      const mode = forecast.modes.find((item) => item.modeId === modeId);
      return mode?.forecastAnnualFlow ?? 0;
    }),
  ];
}

function buildPassengerFlowChartRow(label: string, getValue: (modeId: TransportModeId) => number) {
  const row = { name: label } as Record<string, string | number>;

  for (const column of transportColumns) {
    row[column.id] = getValue(column.id);
  }

  return row;
}

function createPassengerFlowChartImage(forecast: Pz1PassengerFlowResult) {
  const canvas = document.createElement('canvas');
  const pixelRatio = window.devicePixelRatio || 1;
  const width = 920;
  const height = 360;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#003d84';
  context.font = '800 22px Raleway, Arial, sans-serif';
  context.fillText('Существующий поток и прогноз', 32, 38);

  const plotX = 88;
  const plotY = 62;
  const plotWidth = 560;
  const plotHeight = 220;
  const barWidth = 92;
  const barXs = [230, 430];
  const barGroups = [
    {
      label: 'Существующий поток',
      values: transportColumns.map((column) =>
        getPassengerFlowModeValue(forecast, column.id, 'existingAnnualFlow'),
      ),
    },
    {
      label: 'Прогноз',
      values: transportColumns.map((column) =>
        getPassengerFlowModeValue(forecast, column.id, 'forecastAnnualFlow'),
      ),
    },
  ];
  const maxTotal = Math.max(
    1,
    ...barGroups.map((group) => group.values.reduce((sum, value) => sum + value, 0)),
  );

  context.strokeStyle = '#e4edfa';
  context.lineWidth = 1;
  context.beginPath();
  for (let index = 0; index <= 4; index += 1) {
    const y = plotY + (plotHeight / 4) * index;
    context.moveTo(plotX, y);
    context.lineTo(plotX + plotWidth, y);
  }
  context.stroke();

  context.strokeStyle = '#8b87a0';
  context.beginPath();
  context.moveTo(plotX, plotY);
  context.lineTo(plotX, plotY + plotHeight);
  context.lineTo(plotX + plotWidth, plotY + plotHeight);
  context.stroke();

  barGroups.forEach((group, groupIndex) => {
    let offset = 0;

    group.values.forEach((value, modeIndex) => {
      const column = transportColumns[modeIndex];
      const segmentHeight = (value / maxTotal) * plotHeight;
      const x = barXs[groupIndex];
      const y = plotY + plotHeight - offset - segmentHeight;
      context.fillStyle = passengerFlowChartColors[column.id];
      context.fillRect(x, y, barWidth, Math.max(segmentHeight, value > 0 ? 1 : 0));
      offset += segmentHeight;
    });

    context.fillStyle = '#232323';
    context.font = '700 15px Raleway, Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(group.label, barXs[groupIndex] + barWidth / 2, plotY + plotHeight + 30);
  });

  context.textAlign = 'left';
  context.font = '600 14px Raleway, Arial, sans-serif';
  transportColumns.forEach((column, index) => {
    const y = 84 + index * 36;
    context.fillStyle = passengerFlowChartColors[column.id];
    context.fillRect(700, y - 12, 16, 16);
    context.fillStyle = '#232323';
    context.fillText(column.label, 726, y + 1);
  });

  return canvas.toDataURL('image/png');
}

function getPassengerFlowModeValue(
  forecast: Pz1PassengerFlowResult,
  modeId: TransportModeId,
  field: 'existingAnnualFlow' | 'forecastAnnualFlow',
) {
  return forecast.modes.find((mode) => mode.modeId === modeId)?.[field] ?? 0;
}

function getForecastMissingFields(draft: Pz1Draft, pairKey: string) {
  const detail = getDetailOrNull(draft, pairKey);
  const table = getSyncedCorrespondenceTables(draft).find((item) => item.pairKey === pairKey);
  const scenario = getPz1CorrespondenceScenarios(draft)[pairKey];
  const missingFields = new Set<string>();

  if (!detail || !table) {
    return ['Карта: корреспонденция не найдена'];
  }

  const regional = getPz1RegionalCharacteristics(draft);
  const endpoints = [
    { label: detail.fromLabel, title: 'станции отправления' },
    { label: detail.toLabel, title: 'станции назначения' },
  ];

  for (const endpoint of endpoints) {
    const station = draft.stationDrafts.find((item) => item.label === endpoint.label);
    const region = station?.region.trim() ?? '';
    if (!region) {
      missingFields.add(`Размещение станций: регион ${endpoint.title}`);
      continue;
    }

    const parameters = regional.regionParameters?.[region];
    if (!parameters) {
      missingFields.add(`Характеристики регионов: блок региона ${region}`);
      continue;
    }

    for (const field of regionalParameterFields) {
      if (validateRegionParameterField(field.id, parameters[field.id]) !== null) {
        missingFields.add(`Характеристики регионов: ${field.label} (${region})`);
      }
    }
  }

  if (validateRegionalCharacteristicField('inducedDemandPct', regional.inducedDemandPct) !== null) {
    missingFields.add('Характеристики регионов: прогнозируемый индуцированный спрос');
  }

  const travelTime = scenario?.travelTime ?? detail.travelTime;
  for (const modeId of table.activeModes) {
    for (const row of correspondenceTravelTimeRows) {
      if (parseDurationInput(travelTime[row.id][modeId].existing) === null) {
        missingFields.add(`Время в пути: ${row.label}, ${getTransportModeLabel(modeId)}, существующее`);
      }
      if (parseDurationInput(travelTime[row.id][modeId].forecast) === null) {
        missingFields.add(`Время в пути: ${row.label}, ${getTransportModeLabel(modeId)}, прогноз`);
      }
    }

    for (const side of ['existing', 'forecast'] as const) {
      if (parseNumberInput(detail.frequency[modeId][side]) === null) {
        missingFields.add(`Частота сообщений и стоимость проезда: частота ${getTransportModeLabel(modeId)}, ${side === 'existing' ? 'существующая' : 'прогнозная'}`);
      }
      if (parseNumberInput(detail.fare[modeId][side]) === null) {
        missingFields.add(`Частота сообщений и стоимость проезда: стоимость ${getTransportModeLabel(modeId)}, ${side === 'existing' ? 'существующая' : 'прогнозная'}`);
      }
    }

    for (const row of discomfortRows) {
      if (validateDiscomfortCell(detail.discomfortExisting.values[row.id]?.[modeId] ?? '') !== null) {
        missingFields.add(`Коэффициент дискомфорта: ${row.label}, ${getTransportModeLabel(modeId)}, существующее`);
      }
      if (validateDiscomfortCell(detail.discomfortForecast.values[row.id]?.[modeId] ?? '') !== null) {
        missingFields.add(`Коэффициент дискомфорта: ${row.label}, ${getTransportModeLabel(modeId)}, прогноз`);
      }
    }

    const annualFlow = detail.annualFlows[modeId];
    const capacityExistingValue = annualFlow.capacityExisting ?? annualFlow.capacity;
    const capacityForecastValue = annualFlow.capacityForecast ?? annualFlow.capacity;
    if (validateAnnualFlowField('capacityExisting', capacityExistingValue, modeId) !== null) {
      missingFields.add(`Годовой пассажиропоток: вместимость ${getTransportModeLabel(modeId)}, существующая`);
    }
    if (validateAnnualFlowField('capacityForecast', capacityForecastValue, modeId) !== null) {
      missingFields.add(`Годовой пассажиропоток: вместимость ${getTransportModeLabel(modeId)}, прогнозная`);
    }
    if (validateAnnualFlowField('occupancyExisting', annualFlow.occupancyExisting, modeId) !== null) {
      missingFields.add(`Годовой пассажиропоток: заполняемость ${getTransportModeLabel(modeId)}, существующая`);
    }
    if (validateAnnualFlowField('occupancyForecast', annualFlow.occupancyForecast, modeId) !== null) {
      missingFields.add(`Годовой пассажиропоток: заполняемость ${getTransportModeLabel(modeId)}, прогнозная`);
    }
  }

  for (const stationLabel of [detail.fromLabel, detail.toLabel]) {
    const station = draft.stationDrafts.find((item) => item.label === stationLabel);
    for (const row of stationOtherParameterRows) {
      const value = draft.stationOtherParameters[stationLabel]?.[row.id] ?? '';
      if (validateOtherParameterField(row.id, value) !== null) {
        missingFields.add(`Прочие параметры: ${row.label} (${station?.name || stationLabel})`);
      }
    }
  }

  return [...missingFields];
}

function validatePassengerFlowModeInput(fieldId: keyof Pz1PassengerFlowModeInputs, value: string) {
  const parsed = parseNumberInput(value);

  if (parsed === null) {
    return 'Заполните числом';
  }

  if (parsed < 0) {
    return 'Значение не может быть отрицательным';
  }

  if ((fieldId === 'travelTimeHours' || fieldId === 'totalTransportCost') && parsed <= 0) {
    return 'Значение должно быть больше 0';
  }

  return null;
}

function getDetailOrNull(draft: Pz1Draft, pairKey: string) {
  return getSyncedCorrespondenceDetails(draft).find((detail) => detail.pairKey === pairKey) ?? null;
}

function patchCorrespondenceDetail(
  draft: Pz1Draft,
  pairKey: string,
  updater: (detail: Pz1CorrespondenceDetailDraft) => Pz1CorrespondenceDetailDraft,
) {
  const syncedDetails = syncCorrespondenceDetails(draft);
  const currentDetail = syncedDetails[pairKey];

  if (!currentDetail) {
    return draft;
  }

  return {
    ...draft,
    correspondenceDetails: {
      ...syncedDetails,
      [pairKey]: updater(currentDetail),
    },
  };
}

function mergeSplitValueOnInput(
  currentValue: Pz1CorrespondenceDetailDraft['frequency'][TransportModeId],
  side: 'existing' | 'forecast',
  value: string,
) {
  return {
    ...currentValue,
    [side]: value,
    forecast:
      side === 'existing' && shouldMirrorForecast(currentValue.existing, currentValue.forecast)
        ? value
        : side === 'forecast'
          ? value
          : currentValue.forecast,
  };
}

function shouldMirrorForecast(existingValue: string, forecastValue: string) {
  return !forecastValue.trim() || forecastValue === existingValue;
}

function formatOptionalPassengerFlowValue(value: number | undefined) {
  return value === undefined ? '—' : formatPassengerFlowValue(value);
}

function formatNullableDecimal(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value);
}

function isFilled(value: string) {
  return value.trim().length > 0;
}

function getConsumerCellMeta(rowId: string, value: string) {
  void rowId;
  void value;

  return null;
}

function getDiscomfortCellMeta(value: string) {
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed === 0) {
    return '0 — комфортнее';
  }

  if (parsed === 1) {
    return '1 — менее комфортно';
  }

  return 'Диапазон 0…1';
}

function getDiscomfortInputStyle(value: string): CSSProperties | undefined {
  const parsed = parseNumberInput(value);
  if (parsed === null || parsed < 0 || parsed > 1) {
    return undefined;
  }

  const low = { r: 225, g: 245, b: 238 };
  const high = { r: 253, g: 243, b: 242 };
  const mix = {
    r: Math.round(low.r + (high.r - low.r) * parsed),
    g: Math.round(low.g + (high.g - low.g) * parsed),
    b: Math.round(low.b + (high.b - low.b) * parsed),
  };

  return {
    backgroundColor: `rgb(${mix.r}, ${mix.g}, ${mix.b})`,
  };
}

function formatKm(value: number) {
  if (value <= 0) {
    return 'не рассчитано';
  }

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} км`;
}

function formatPassengerFlowValue(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function formatCompactPassengerFlowValue(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value);
}

function formatDuration(totalMinutes: number) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDurationTotal(
  values: Pz1CorrespondenceDetailDraft['travelTime'],
  modeId: TransportModeId,
  side: 'existing' | 'forecast',
) {
  const totalMinutes = correspondenceTravelTimeRows.reduce<number | null>((sum, row) => {
    if (sum === null) {
      return null;
    }

    const minutes = parseDurationInput(values[row.id][modeId][side]);
    return minutes === null ? null : sum + minutes;
  }, 0);

  return totalMinutes === null ? '—' : formatDuration(totalMinutes);
}

function parseDurationInput(value: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isDurationInputInvalid(value: string) {
  return value.trim().length > 0 && parseDurationInput(value) === null;
}

function isNonNegativeNumberInputInvalid(value: string) {
  if (!value.trim()) {
    return false;
  }

  const parsed = parseNumberInput(value);
  return parsed === null || parsed < 0;
}

function parseNumberInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getTransportModeLabel(modeId: TransportModeId) {
  return transportColumns.find((column) => column.id === modeId)?.label ?? modeId;
}

function isIntroComplete(draft: Pz1Draft) {
  return isPassportComplete(draft);
}
