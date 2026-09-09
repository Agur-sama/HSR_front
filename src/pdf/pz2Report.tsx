import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { downloadTextFile } from '../bridge/io';
import type { Pz2Result } from '../bridge/schema';
import { KeyValueTable, PAGE_SIZE, formatDate, formatRequiredValue, styles } from './common';

/**
 * Отчёт по ПЗ2 — то, по чему преподаватель проверяет работу.
 *
 * В проекте нет ни бэкенда, ни журнала: студент сдаёт PDF, как и по ПЗ1.
 * Поэтому отчёт повторяет структуру задания — работы, этапы, ресурсный план,
 * расход материалов — и печатает те же числа, что студент видел на экранах.
 * Вёрстка общая с ПЗ1 (`./common`): это документы одного курса.
 */
export interface Pz2PdfSummary {
  team: string;
  lineTitle: string;
  createdAt: string;
  runId?: string;
  /** Длина маршрута из ПЗ1 — эталон, с которым сверялась сумма работ. */
  routeLengthKm: number;
  result: Pz2Result;
  /** Подписи типов работ и условий грунта: словарь живёт в модуле задания. */
  workKindLabels: Record<string, string>;
  conditionLabels: Record<string, string>;
}

export async function downloadPz2Pdf(summary: Pz2PdfSummary, fileName: string): Promise<void> {
  const blob = await createPz2PdfBlob(summary);
  downloadTextFile(fileName, 'application/pdf', await blob.arrayBuffer());
}

export async function createPz2PdfBlob(summary: Pz2PdfSummary): Promise<Blob> {
  return pdf(<Pz2ReportDocument summary={summary} />).toBlob();
}

function Pz2ReportDocument({ summary }: { summary: Pz2PdfSummary }) {
  const { result } = summary;
  const measuredKm = result.measuredLengthKm;
  const difference = measuredKm - summary.routeLengthKm;

  return (
    <Document
      author="Школа ВСМ"
      creator="vsm-simulator.ru"
      producer="vsm-simulator.ru"
      subject="Организация строительства ВСМ"
      title={`Практическое задание № 2 — ${summary.team || 'команда не указана'}`}
    >
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.assignment}>Практическое задание № 2</Text>
          <Text style={styles.title}>Организация строительства ВСМ</Text>
        </View>

        <KeyValueTable
          rows={[
            ['Команда', formatRequiredValue(summary.team)],
            ['Учебная группа', formatRequiredValue(summary.lineTitle)],
            ['Дата выполнения', formatDate(summary.createdAt)],
            ['Идентификатор работы', formatRequiredValue(summary.runId ?? '')],
          ]}
        />

        <View style={styles.contents}>
          <Text style={styles.sectionTitle}>Содержание</Text>
          <Text style={styles.contentsLine}>1. Работы по трассе</Text>
          <Text style={styles.contentsLine}>2. Разбиение на этапы</Text>
          <Text style={styles.contentsLine}>3. Ресурсный график</Text>
          <Text style={styles.contentsLine}>4. Расход материалов и машино-часы</Text>
        </View>
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <Header section="Работы и этапы" summary={summary} />

        <Text style={styles.sectionTitle}>1. Работы по трассе</Text>
        <KeyValueTable
          rows={[
            ['Работ перечислено', String(result.works.length)],
            ['Длина маршрута из ПЗ1', `${formatAmount(summary.routeLengthKm)} км`],
            ['Сумма длин работ', `${formatAmount(measuredKm)} км`],
            [
              'Расхождение',
              `${formatAmount(Math.abs(difference))} км${difference === 0 ? '' : difference < 0 ? ' (недомерено)' : ' (перемерено)'}`,
            ],
          ]}
        />

        {result.works.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Тип работы</Text>
              <Text style={styles.tableCellValue}>Объём</Text>
              <Text style={styles.tableCellValue}>Условия</Text>
              <Text style={styles.tableCellValue}>Этап</Text>
            </View>
            {result.works.map((work) => (
              <View key={work.id} style={styles.tableRow}>
                <Text style={styles.tableCellLabel}>{summary.workKindLabels[work.kind] ?? work.kind}</Text>
                <Text style={styles.tableCellValue}>
                  {work.lengthKm !== null ? `${formatAmount(work.lengthKm)} км` : `${formatAmount(work.count ?? 0)} шт.`}
                </Text>
                <Text style={styles.tableCellValue}>
                  {work.conditions.length === 0
                    ? 'обычные'
                    : work.conditions.map((condition) => summary.conditionLabels[condition] ?? condition).join(', ')}
                </Text>
                <Text style={styles.tableCellValue}>{findStageTitle(result, work.stageId)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.paragraph}>Работы не перечислены.</Text>
        )}

        <Text style={styles.sectionTitle}>2. Разбиение на этапы</Text>
        {result.stages.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellLabel}>Этап</Text>
              <Text style={styles.tableCellValue}>Работ</Text>
              <Text style={styles.tableCellValue}>Длина, км</Text>
              <Text style={styles.tableCellValue}>Рабочих</Text>
            </View>
            {result.stages.map((stage) => {
              const works = result.works.filter((work) => work.stageId === stage.id);
              const lengthKm = works.reduce((sum, work) => sum + (work.lengthKm ?? 0), 0);

              return (
                <View key={stage.id} style={styles.tableRow}>
                  <Text style={styles.tableCellLabel}>{stage.title}</Text>
                  <Text style={styles.tableCellValue}>{works.length}</Text>
                  <Text style={styles.tableCellValue}>{formatAmount(lengthKm)}</Text>
                  <Text style={styles.tableCellValue}>{result.plan.workersByStage[stage.id] ?? 0}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.paragraph}>Трасса на этапы не разбита.</Text>
        )}
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <Header section="Ресурсы и расход" summary={summary} />

        <Text style={styles.sectionTitle}>3. Ресурсный график</Text>
        <KeyValueTable
          rows={[
            ['Рабочих на проект', String(result.plan.totalWorkers)],
            ['Срок строительства', result.plan.durationDays > 0 ? `${result.plan.durationDays} дн.` : 'не рассчитан'],
            ['Пиковая потребность', `${result.plan.peakWorkers} чел.`],
            ['Дней с нехваткой людей', String(result.plan.overloadDays)],
          ]}
        />
        <Text style={styles.paragraph}>
          Срок считается по трудоёмкости работ и числу назначенных рабочих. Ровная загрузка достигается перераспределением
          людей между этапами: этапы строятся параллельно, и пик потребности зависит от того, как они наложились во времени.
        </Text>

        <Text style={styles.sectionTitle}>4. Расход материалов и машино-часы</Text>
        <KeyValueTable
          rows={[
            ['Трудоёмкость', `${formatAmount(result.report.laborHours)} чел.-ч`],
            ['Машино-часы', `${formatAmount(result.report.machineHours)} маш.-ч`],
          ]}
        />

        {/* Оговорка стоит рядом с числами, к которым относится: отдельной
            страницей в конце её просто не прочитают. */}
        {result.report.normsAreDraft ? (
          <Text style={styles.paragraph}>
            Нормативы расхода и трудоёмкости — предварительные и подлежат замене после проверки экспертом. Способ расчёта
            от этого не меняется: величины пересчитываются из тех же длин и количеств.
          </Text>
        ) : null}

      </Page>

      {/* Таблицы расхода — отдельной страницей: на общей они упирались в край,
          и последняя страница выходила пустой, с одним колонтитулом. */}
      <Page size={PAGE_SIZE} style={styles.page}>
        <Header section="Расход по проекту" summary={summary} />
        <Text style={styles.sectionTitle}>4.1. Материалы</Text>
        <ResourceTable rows={result.report.materials} />
        <Text style={styles.sectionTitle}>4.2. Машины</Text>
        <ResourceTable rows={result.report.machines} />
      </Page>
    </Document>
  );
}

function Header({ section, summary }: { section: string; summary: Pz2PdfSummary }) {
  return (
    <View style={styles.runningHeader} fixed>
      <Text>
        Команда «{formatRequiredValue(summary.team)}» · ПЗ2 · {formatRequiredValue(summary.lineTitle)}
      </Text>
      <Text>{section}</Text>
    </View>
  );
}

function ResourceTable({ rows }: { rows: { title: string; unit: string; amount: number }[] }) {
  if (rows.length === 0) {
    return <Text style={styles.paragraph}>Нет позиций: работы без длины или количества в расход не идут.</Text>;
  }

  return (
    <View style={styles.table}>
        {rows.map((row) => (
          <View key={row.title} style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{row.title}</Text>
            <Text style={styles.tableCellValue}>
              {formatAmount(row.amount)} {row.unit}
            </Text>
          </View>
      ))}
    </View>
  );
}

/** Этап работы по её принадлежности. Работа без этапа — это работа в пуле. */
function findStageTitle(result: Pz2Result, stageId: string | null) {
  if (stageId === null) {
    return 'не разнесена';
  }

  return result.stages.find((stage) => stage.id === stageId)?.title ?? 'не разнесена';
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}
