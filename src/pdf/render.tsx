import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import ptSerifRegular from '@fontsource/pt-serif/files/pt-serif-cyrillic-400-normal.woff?url';
import ptSerifBold from '@fontsource/pt-serif/files/pt-serif-cyrillic-700-normal.woff?url';
import ralewayMedium from '@fontsource/raleway/files/raleway-cyrillic-500-normal.woff?url';
import ralewayBold from '@fontsource/raleway/files/raleway-cyrillic-800-normal.woff?url';
import { downloadTextFile } from '../bridge/io';

const PAGE_SIZE = 'A4';
const MARGIN_MM = 20;

interface PdfStation {
  label: string;
  name: string;
  lat: number;
  lng: number;
  type: 'terminal' | 'intermediate';
}

export interface Pz1PdfSummary {
  team: string;
  lineTitle: string;
  variantTitle: string;
  stationCount: number;
  routePointCount: number;
  filledConsumerCells: number;
  filledIndicatorCount: number;
  createdAt: string;
  stations?: PdfStation[];
  routeLine?: Array<[number, number]>;
}

export interface Pz1PdfSection {
  title: string;
  rows: Array<[string, string]>;
}

Font.register({
  family: 'RalewayPdf',
  fonts: [
    { src: ralewayMedium, fontWeight: 500 },
    { src: ralewayBold, fontWeight: 800 },
  ],
});

Font.register({
  family: 'PtSerifPdf',
  fonts: [
    { src: ptSerifRegular, fontWeight: 400 },
    { src: ptSerifBold, fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

export async function downloadPz1Pdf(summary: Pz1PdfSummary, fileName: string): Promise<void> {
  const blob = await createPz1PdfBlob(summary);
  downloadTextFile(fileName, 'application/pdf', await blob.arrayBuffer());
}

export async function createPz1PdfBlob(summary: Pz1PdfSummary): Promise<Blob> {
  return pdf(<Pz1ReportDocument summary={summary} />).toBlob();
}

export function createPz1PdfSections(summary: Pz1PdfSummary): Pz1PdfSection[] {
  return [
    {
      title: '1. Исходные данные',
      rows: [
        ['Команда', formatRequiredValue(summary.team)],
        ['Название линии', formatRequiredValue(summary.lineTitle)],
        ['Вариант', formatRequiredValue(summary.variantTitle)],
        ['Дата выполнения', formatDate(summary.createdAt)],
      ],
    },
    {
      title: '2. План трассы и размещение станций',
      rows: [
        ['Станций с координатами', String(summary.stationCount)],
        ['Точек линии трассы', String(summary.routePointCount)],
        ['Формат линии', 'Отдельный массив вершин [долгота, широта], не линия по станциям'],
      ],
    },
    {
      title: '3. Заполнение расчётных таблиц',
      rows: [
        ['Ячейки потребительских свойств', String(summary.filledConsumerCells)],
        ['Технико-экономические показатели', String(summary.filledIndicatorCount)],
      ],
    },
  ];
}

function Pz1ReportDocument({ summary }: { summary: Pz1PdfSummary }) {
  const sections = createPz1PdfSections(summary);

  return (
    <Document title="ПЗ1. Технико-экономическое обоснование">
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.titleHeader}>
          <Text style={styles.kicker}>ШКОЛА ВСМ · РУТ (МИИТ)</Text>
          <Text style={styles.kicker}>Детская проектно-исследовательская школа</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.assignment}>Практическое задание № 1</Text>
          <Text style={styles.title}>Технико-экономическое обоснование проекта ВСМ</Text>
        </View>
        <KeyValueTable rows={sections[0].rows} />
        <View style={styles.contents}>
          <Text style={styles.sectionTitle}>Содержание</Text>
          <Text style={styles.contentsLine}>1. Исходные данные варианта</Text>
          <Text style={styles.contentsLine}>2. План трассы и размещение станций</Text>
          <Text style={styles.contentsLine}>3. Заполнение расчётных таблиц</Text>
          <Text style={styles.contentsLine}>4. Итоговая сводка</Text>
        </View>
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <RunningHeader summary={summary} pageNumber="2" />
        <Text style={styles.sectionTitle}>2. План трассы и размещение станций</Text>
        <KeyValueTable rows={sections[1].rows} />
        <StationTable stations={summary.stations ?? []} />
        <Text style={styles.caption}>Рисунок 1 — План трассы ВСМ с размещением станций</Text>
        <View style={styles.mapFrame}>
          <Text style={styles.mapText}>Снимок карты будет добавлен после подключения previewImage для визуальных шагов.</Text>
        </View>
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <RunningHeader summary={summary} pageNumber="3" />
        <Text style={styles.sectionTitle}>3. Заполнение расчётных таблиц</Text>
        <KeyValueTable rows={sections[2].rows} />
        <Text style={styles.paragraph}>
          Итоговый PDF фиксирует данные, введённые студентом в статическом симуляторе. JSON-файл сохраняется отдельно
          и может быть загружен при продолжении работы.
        </Text>
        <Text style={styles.sectionTitle}>4. Итоговая сводка</Text>
        <KeyValueTable
          rows={[
            ['Вариант', formatRequiredValue(summary.variantTitle)],
            ['Число станций', String(summary.stationCount)],
            ['Точек линии трассы', String(summary.routePointCount)],
            ['Дата формирования отчёта', formatDate(new Date().toISOString())],
          ]}
        />
      </Page>
    </Document>
  );
}

function RunningHeader({ summary, pageNumber }: { summary: Pz1PdfSummary; pageNumber: string }) {
  return (
    <View style={styles.runningHeader} fixed>
      <Text>
        Команда «{formatRequiredValue(summary.team)}» · ПЗ1 · {formatRequiredValue(summary.lineTitle)}
      </Text>
      <Text>{pageNumber}</Text>
    </View>
  );
}

function KeyValueTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <View style={styles.table}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.tableRow}>
          <Text style={styles.tableCellLabel}>{label}</Text>
          <Text style={styles.tableCellValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function StationTable({ stations }: { stations: PdfStation[] }) {
  if (stations.length === 0) {
    return <Text style={styles.paragraph}>Станции пока не назначены.</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.stationLabelCell}>Станция</Text>
        <Text style={styles.stationTypeCell}>Тип</Text>
        <Text style={styles.stationNameCell}>Название</Text>
        <Text style={styles.stationCoordCell}>Координаты</Text>
      </View>
      {stations.map((station) => (
        <View key={station.label} style={styles.tableRow}>
          <Text style={styles.stationLabelCell}>{station.label}</Text>
          <Text style={styles.stationTypeCell}>{formatStationType(station.type)}</Text>
          <Text style={styles.stationNameCell}>{station.name}</Text>
          <Text style={styles.stationCoordCell}>
            {formatNumber(station.lat)}; {formatNumber(station.lng)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function formatRequiredValue(value: string) {
  const trimmed = value.trim();
  return trimmed || 'не заполнено';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'не указана' : date.toLocaleDateString('ru-RU');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 5 }).format(value);
}

function formatStationType(type: PdfStation['type']) {
  return type === 'terminal' ? 'начально-конечная' : 'промежуточная';
}

const styles = StyleSheet.create({
  page: {
    padding: `${MARGIN_MM}mm`,
    color: '#111111',
    fontFamily: 'PtSerifPdf',
    fontSize: 11.5,
    lineHeight: 1.35,
  },
  titleHeader: {
    borderBottom: '1 solid #111111',
    marginBottom: 42,
    paddingBottom: 10,
  },
  kicker: {
    color: '#3a288b',
    fontFamily: 'RalewayPdf',
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  titleBlock: {
    marginBottom: 34,
    textAlign: 'center',
  },
  assignment: {
    fontFamily: 'RalewayPdf',
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'RalewayPdf',
    fontSize: 18,
    fontWeight: 800,
  },
  sectionTitle: {
    color: '#3a288b',
    fontFamily: 'RalewayPdf',
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 10,
    marginTop: 12,
  },
  contents: {
    marginTop: 32,
  },
  contentsLine: {
    marginBottom: 6,
  },
  runningHeader: {
    borderBottom: '1 solid #111111',
    color: '#3a288b',
    display: 'flex',
    flexDirection: 'row',
    fontFamily: 'RalewayPdf',
    fontSize: 9,
    fontWeight: 500,
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 6,
  },
  paragraph: {
    marginBottom: 10,
  },
  table: {
    borderLeft: '1 solid #111111',
    borderTop: '1 solid #111111',
    marginBottom: 14,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  tableHeaderRow: {
    backgroundColor: '#f4f2fa',
    display: 'flex',
    flexDirection: 'row',
    fontWeight: 700,
  },
  tableCellLabel: {
    backgroundColor: '#f4f2fa',
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    fontWeight: 700,
    padding: 5,
    width: '40%',
  },
  tableCellValue: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 5,
    width: '60%',
  },
  stationLabelCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 5,
    width: '14%',
  },
  stationTypeCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 5,
    width: '25%',
  },
  stationNameCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 5,
    width: '31%',
  },
  stationCoordCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 5,
    width: '30%',
  },
  caption: {
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 6,
    textAlign: 'center',
  },
  mapFrame: {
    alignItems: 'center',
    border: '1 solid #111111',
    height: 150,
    justifyContent: 'center',
    padding: 12,
  },
  mapText: {
    color: '#555555',
    textAlign: 'center',
  },
});
