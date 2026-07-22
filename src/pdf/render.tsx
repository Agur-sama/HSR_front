import { Circle, Document, Font, Image, Page, Polyline, Rect, StyleSheet, Svg, Text, View, pdf } from '@react-pdf/renderer';
import ptSerifRegular from '@fontsource/pt-serif/files/pt-serif-cyrillic-400-normal.woff?url';
import ptSerifItalic from '@fontsource/pt-serif/files/pt-serif-cyrillic-400-italic.woff?url';
import ptSerifBold from '@fontsource/pt-serif/files/pt-serif-cyrillic-700-normal.woff?url';
import ralewayMedium from '@fontsource/raleway/files/raleway-cyrillic-500-normal.woff?url';
import ralewayBold from '@fontsource/raleway/files/raleway-cyrillic-800-normal.woff?url';
import { downloadTextFile } from '../bridge/io';
import type { CorrespondenceTable, GeoPoint, Pz1PassengerFlowResult, Pz1Result, RouteLine } from '../bridge/schema';
import { consumerRows, finalIndicators, transportColumns } from '../modules/pz1/model';
import { buildDisplayRoutePoints, computeRouteLineMetrics } from '../shared/lib/routeGeometry';

const PAGE_SIZE = 'A4';
const MARGIN_MM = 20;
const PDF_MAP_WIDTH = 470;
const PDF_MAP_HEIGHT = 80;
const PDF_MAP_PADDING = 12;
const runtimeProcess = (globalThis as { process?: { cwd: () => string; versions?: { node?: string } } }).process;

interface PdfStation {
  label: string;
  name: string;
  lat: number;
  lng: number;
  type: 'terminal' | 'intermediate';
}

interface PdfMapPoint {
  x: number;
  y: number;
}

interface PdfMapStationPoint extends PdfMapPoint {
  key: string;
}

interface PdfMapOverlay {
  routePoints: PdfMapPoint[];
  stationPoints: PdfMapStationPoint[];
}

export interface Pz1PdfSummary {
  team: string;
  lineTitle: string;
  variantTitle: string;
  stationCount: number;
  routePointCount: number;
  totalLengthKm: number;
  filledConsumerCells: number;
  filledIndicatorCount: number;
  createdAt: string;
  consumerProperties?: Pz1Result['consumerProperties'];
  finalIndicators?: Pz1Result['finalIndicators'];
  passengerFlowForecast?: Pz1PassengerFlowResult;
  passengerFlowChartImage?: string;
  notes?: string;
  stations?: PdfStation[];
  routeLine?: RouteLine;
  previewImage?: string;
}

export interface Pz1PdfSection {
  title: string;
  rows: Array<[string, string]>;
}

Font.register({
  family: 'RalewayPdf',
  fonts: [
    { src: resolveFontSource(ralewayMedium), fontWeight: 500 },
    { src: resolveFontSource(ralewayBold), fontWeight: 800 },
  ],
});

Font.register({
  family: 'PtSerifPdf',
  fonts: [
    { src: resolveFontSource(ptSerifRegular), fontWeight: 400 },
    { src: resolveFontSource(ptSerifItalic), fontStyle: 'italic', fontWeight: 400 },
    { src: resolveFontSource(ptSerifBold), fontWeight: 700 },
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
        ['Общая длина трассы', formatKm(summary.totalLengthKm)],
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

function resolveFontSource(source: string) {
  if (runtimeProcess?.versions?.node && source.startsWith('/node_modules/')) {
    return `${runtimeProcess.cwd()}${source}`;
  }

  return source;
}

function Pz1ReportDocument({ summary }: { summary: Pz1PdfSummary }) {
  const sections = createPz1PdfSections(summary);

  return (
    <Document title="ПЗ1. Технико-экономическое обоснование">
      <Page size={PAGE_SIZE} style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.assignment}>Практическое задание № 1</Text>
          <Text style={styles.title}>Технико-экономическое обоснование проекта ВСМ</Text>
        </View>
        <KeyValueTable rows={sections[0].rows} />
        <View style={styles.contents}>
          <Text style={styles.sectionTitle}>Содержание</Text>
          <Text style={styles.contentsLine}>1. Исходные данные варианта</Text>
          <Text style={styles.contentsLine}>2. План трассы и размещение станций</Text>
          <Text style={styles.contentsLine}>3. Матрица корреспонденций</Text>
          <Text style={styles.contentsLine}>4. Прогноз пассажиропотока</Text>
          <Text style={styles.contentsLine}>5. Технико-экономические показатели</Text>
        </View>
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <RunningHeader pageNumber="2" summary={summary} />
        <Text style={styles.sectionTitle}>1. Исходные данные варианта</Text>
        <KeyValueTable rows={sections[0].rows} />
        <Text style={styles.sectionTitle}>2. План трассы и размещение станций</Text>
        <KeyValueTable rows={sections[1].rows} />
        <Text style={styles.caption}>Рисунок 1 — План трассы ВСМ с размещением станций</Text>
        <MapPlanPreview previewImage={summary.previewImage} routeLine={summary.routeLine} stations={summary.stations ?? []} />
        <StationTable stations={summary.stations ?? []} />
        <RouteSegmentTable routeLine={summary.routeLine} />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <RunningHeader pageNumber="3" summary={summary} />
        <Text style={styles.sectionTitle}>3. Матрица корреспонденций</Text>
        <KeyValueTable rows={sections[2].rows} />
        <CorrespondenceTables tables={summary.consumerProperties ?? {}} />
        <Text style={styles.caption}>Таблица 1 — Потребительские свойства по корреспонденциям</Text>
        <Text style={styles.sectionTitle}>4. Прогноз пассажиропотока</Text>
        <PassengerFlowForecastReport
          chartImage={summary.passengerFlowChartImage}
          forecast={summary.passengerFlowForecast}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <RunningHeader pageNumber="4" summary={summary} />
        <Text style={styles.sectionTitle}>5. Технико-экономические показатели</Text>
        <FinalIndicatorsTable finalIndicatorValues={summary.finalIndicators ?? {}} totalLengthKm={summary.totalLengthKm} />
        {summary.notes ? (
          <>
            <Text style={styles.sectionTitle}>Комментарий к исходным данным</Text>
            <Text style={styles.paragraph}>{summary.notes}</Text>
          </>
        ) : null}
      </Page>
    </Document>
  );
}

function RunningHeader({ pageNumber, summary }: { pageNumber: string; summary: Pz1PdfSummary }) {
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

function MapPlanPreview({
  previewImage,
  routeLine,
  stations,
}: {
  previewImage?: string;
  routeLine?: RouteLine;
  stations: PdfStation[];
}) {
  const overlay = createMapOverlay(routeLine, stations);
  const hasOverlay = overlay.routePoints.length >= 2 || overlay.stationPoints.length > 0;

  return (
    <View style={styles.mapFrame}>
      {previewImage ? (
        <Image src={previewImage} style={styles.mapImage} />
      ) : (
        <View style={styles.mapFallback}>
          {hasOverlay ? null : <Text style={styles.mapText}>Снимок карты не был сохранён в результате шага.</Text>}
        </View>
      )}
      {hasOverlay ? (
        <Svg
          height={PDF_MAP_HEIGHT}
          style={styles.mapOverlay}
          viewBox={`0 0 ${PDF_MAP_WIDTH} ${PDF_MAP_HEIGHT}`}
          width={PDF_MAP_WIDTH}
        >
          {overlay.routePoints.length >= 2 ? (
            <Polyline
              fill="none"
              points={formatSvgPoints(overlay.routePoints)}
              stroke="#E0182D"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3.5}
            />
          ) : null}
          {overlay.stationPoints.map((point) => (
            <Circle cx={point.x} cy={point.y} fill="#003D84" key={point.key} r={4.2} stroke="#ffffff" strokeWidth={1.5} />
          ))}
        </Svg>
      ) : null}
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

function RouteSegmentTable({ routeLine }: { routeLine?: RouteLine }) {
  if (!routeLine || routeLine.segments.length === 0) {
    return <Text style={styles.paragraph}>Сегменты трассы пока не заданы.</Text>;
  }

  const metrics = computeRouteLineMetrics(routeLine);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.stationLabelCell}>№</Text>
        <Text style={styles.stationTypeCell}>Стрела прогиба</Text>
        <Text style={styles.stationNameCell}>Радиус</Text>
        <Text style={styles.stationCoordCell}>Длина</Text>
      </View>
      {metrics.segments.map((segment, index) => (
        <View key={segment.segmentId} style={styles.tableRow}>
          <Text style={styles.stationLabelCell}>{index + 1}</Text>
          <Text style={styles.stationTypeCell}>{formatKm(routeLine.segments[index].sagittaKm, '0 км')}</Text>
          <Text style={styles.stationNameCell}>{segment.radiusKm ? formatKm(segment.radiusKm) : 'прямая вставка'}</Text>
          <Text style={styles.stationCoordCell}>{formatKm(segment.arcLengthKm)}</Text>
        </View>
      ))}
    </View>
  );
}

function CorrespondenceTables({ tables }: { tables: Record<string, CorrespondenceTable> }) {
  const tableList = Object.values(tables);

  if (tableList.length === 0) {
    return <Text style={styles.paragraph}>Таблицы корреспонденций пока не заполнены.</Text>;
  }

  return (
    <View>
      {tableList.map((table) => (
        <View key={table.pairKey} style={styles.compactTableBlock} wrap={false}>
          <Text style={styles.compactTableTitle}>Корреспонденция {table.pairKey}</Text>
          <View style={styles.compactTable}>
            <View style={styles.compactHeaderRow}>
              <Text style={styles.metricCell}>Показатель</Text>
              {table.activeModes.map((modeId) => (
                <Text key={modeId} style={styles.modeCell}>
                  {getTransportModeLabel(modeId)}
                </Text>
              ))}
            </View>
            {consumerRows.map((row) => (
              <View key={row.id} style={styles.compactRow}>
                <Text style={styles.metricCell}>{row.label}</Text>
                {table.activeModes.map((modeId) => (
                  <Text key={modeId} style={styles.modeCell}>
                    {formatRequiredValue(table.values[row.id]?.[modeId] ?? '')}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const pdfPassengerFlowChartColors: Record<string, string> = {
  hSR: '#e0182d',
  airplane: '#003d84',
  bus: '#08a696',
  suburbanTrain: '#7b61ff',
  longDistanceTrain: '#f59e0b',
  car: '#475569',
};

function PassengerFlowForecastReport({
  chartImage,
  forecast,
}: {
  chartImage?: string;
  forecast?: Pz1PassengerFlowResult;
}) {
  if (!forecast) {
    return <Text style={styles.paragraph}>Прогноз пассажиропотока пока не рассчитан.</Text>;
  }

  return (
    <View>
      <KeyValueTable
        rows={[
          ['Существующий рынок, пасс./год', formatInteger(forecast.totalDemand.existingAnnualFlow)],
          ['Базовый прогноз, пасс./год', formatInteger(forecast.totalDemand.baseForecast)],
          ['Индуцированный спрос, пасс./год', formatInteger(forecast.totalDemand.inducedDemand)],
          ['Итоговый прогноз, пасс./год', formatInteger(forecast.totalDemand.totalForecast)],
        ]}
      />
      <Text style={styles.caption}>Таблица 2 — Распределение прогноза пассажиропотока по видам транспорта</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.flowModeCell}>Вид транспорта</Text>
          <Text style={styles.flowValueCell}>Существующий поток</Text>
          <Text style={styles.flowValueCell}>Прогноз</Text>
          <Text style={styles.flowShareCell}>Доля</Text>
        </View>
        {forecast.modes.map((mode) => (
          <View key={mode.modeId} style={styles.tableRow}>
            <Text style={styles.flowModeCell}>{getTransportModeLabel(mode.modeId)}</Text>
            <Text style={styles.flowValueCell}>{formatInteger(mode.existingAnnualFlow)}</Text>
            <Text style={styles.flowValueCell}>{formatInteger(mode.forecastAnnualFlow)}</Text>
            <Text style={styles.flowShareCell}>{formatPercent(mode.forecastShare)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>Рисунок 2 — Существующий поток и прогноз с накоплением по видам транспорта</Text>
      {chartImage ? (
        <Image src={chartImage} style={styles.passengerFlowChartImage} />
      ) : (
        <PassengerFlowForecastChart forecast={forecast} />
      )}
    </View>
  );
}

function PassengerFlowForecastChart({ forecast }: { forecast: Pz1PassengerFlowResult }) {
  const barGroups = [
    {
      label: 'Существующий поток',
      values: transportColumns.map((column) => getPassengerFlowModeValue(forecast, column.id, 'existingAnnualFlow')),
    },
    {
      label: 'Прогноз',
      values: transportColumns.map((column) => getPassengerFlowModeValue(forecast, column.id, 'forecastAnnualFlow')),
    },
  ];
  const maxTotal = Math.max(
    1,
    ...barGroups.map((group) => group.values.reduce((sum, value) => sum + value, 0)),
  );
  const chartHeight = 96;
  const chartBottom = 112;
  const barWidth = 72;
  const barXs = [132, 282];

  return (
    <View style={styles.passengerFlowChartFrame}>
      <Svg height={138} viewBox="0 0 470 138" width={470}>
        <Rect fill="#ffffff" height={138} width={470} x={0} y={0} />
        <Rect fill="#e4edfa" height={1} width={360} x={62} y={chartBottom} />
        {barGroups.map((group, groupIndex) => {
          let offset = 0;

          return transportColumns.map((column, modeIndex) => {
            const value = group.values[modeIndex];
            const segmentHeight = (value / maxTotal) * chartHeight;
            const y = chartBottom - offset - segmentHeight;
            offset += segmentHeight;

            return (
              <Rect
                fill={pdfPassengerFlowChartColors[column.id]}
                height={Math.max(segmentHeight, value > 0 ? 1 : 0)}
                key={`${group.label}-${column.id}`}
                width={barWidth}
                x={barXs[groupIndex]}
                y={y}
              />
            );
          });
        })}
      </Svg>
      <View style={styles.passengerFlowChartLabels}>
        {barGroups.map((group) => (
          <Text key={group.label} style={styles.passengerFlowChartLabel}>
            {group.label}
          </Text>
        ))}
      </View>
      <View style={styles.passengerFlowLegend}>
        {transportColumns.map((column) => (
          <View key={column.id} style={styles.passengerFlowLegendItem}>
            <View style={[styles.passengerFlowLegendSwatch, { backgroundColor: pdfPassengerFlowChartColors[column.id] }]} />
            <Text>{column.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function getPassengerFlowModeValue(
  forecast: Pz1PassengerFlowResult,
  modeId: string,
  field: 'existingAnnualFlow' | 'forecastAnnualFlow',
) {
  return forecast.modes.find((mode) => mode.modeId === modeId)?.[field] ?? 0;
}

function FinalIndicatorsTable({
  finalIndicatorValues,
  totalLengthKm,
}: {
  finalIndicatorValues: Record<string, string>;
  totalLengthKm: number;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.finalIndexCell}>№</Text>
        <Text style={styles.finalNameCell}>Показатель</Text>
        <Text style={styles.finalValueCell}>Значение</Text>
      </View>
      {finalIndicators.map((indicator, index) => (
        <View key={indicator.id} style={styles.tableRow}>
          <Text style={styles.finalIndexCell}>{index + 1}</Text>
          <Text style={styles.finalNameCell}>{indicator.label}</Text>
          <Text style={styles.finalValueCell}>
            {indicator.id === 'lineLength'
              ? formatKm(totalLengthKm)
              : formatRequiredValue(finalIndicatorValues[indicator.id] ?? '')}
          </Text>
        </View>
      ))}
    </View>
  );
}

function getTransportModeLabel(modeId: string) {
  return transportColumns.find((column) => column.id === modeId)?.label ?? modeId;
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

function formatInteger(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, style: 'percent' }).format(value);
}

function formatKm(value: number, zeroText = 'не рассчитано') {
  if (value <= 0) {
    return zeroText;
  }

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} км`;
}

function formatStationType(type: PdfStation['type']) {
  return type === 'terminal' ? 'начально-конечная' : 'промежуточная';
}

function createMapOverlay(routeLine: RouteLine | undefined, stations: PdfStation[]): PdfMapOverlay {
  const routeGeoPoints = routeLine ? buildDisplayRoutePoints(routeLine, 32) : [];
  const stationGeoPoints = stations
    .map((station) => ({ key: station.label, lon: station.lng, lat: station.lat }))
    .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat));
  const boundsPoints: GeoPoint[] = [...routeGeoPoints, ...stationGeoPoints];

  if (boundsPoints.length === 0) {
    return { routePoints: [], stationPoints: [] };
  }

  const project = createPdfMapProjection(boundsPoints);

  return {
    routePoints: routeGeoPoints.map(project),
    stationPoints: stationGeoPoints.map((point) => ({
      key: point.key,
      ...project(point),
    })),
  };
}

function createPdfMapProjection(points: GeoPoint[]) {
  const minLon = Math.min(...points.map((point) => point.lon));
  const maxLon = Math.max(...points.map((point) => point.lon));
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const innerWidth = PDF_MAP_WIDTH - PDF_MAP_PADDING * 2;
  const innerHeight = PDF_MAP_HEIGHT - PDF_MAP_PADDING * 2;

  return (point: GeoPoint): PdfMapPoint => ({
    x: lonSpan <= 0 ? PDF_MAP_WIDTH / 2 : PDF_MAP_PADDING + ((point.lon - minLon) / lonSpan) * innerWidth,
    y: latSpan <= 0 ? PDF_MAP_HEIGHT / 2 : PDF_MAP_PADDING + ((maxLat - point.lat) / latSpan) * innerHeight,
  });
}

function formatSvgPoints(points: PdfMapPoint[]) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

const styles = StyleSheet.create({
  page: {
    padding: `${MARGIN_MM}mm`,
    color: '#111111',
    fontFamily: 'PtSerifPdf',
    fontSize: 11.5,
    lineHeight: 1.35,
  },
  titleBlock: {
    marginBottom: 34,
    marginTop: 34,
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
    marginBottom: 8,
    marginTop: 9,
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
    marginBottom: 16,
    paddingBottom: 6,
  },
  paragraph: {
    marginBottom: 10,
  },
  table: {
    borderLeft: '1 solid #111111',
    borderTop: '1 solid #111111',
    marginBottom: 10,
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
    padding: 4,
    width: '40%',
  },
  tableCellValue: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '60%',
  },
  stationLabelCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '14%',
  },
  stationTypeCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '25%',
  },
  stationNameCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '31%',
  },
  stationCoordCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '30%',
  },
  compactTableBlock: {
    marginBottom: 10,
  },
  compactTableTitle: {
    fontFamily: 'RalewayPdf',
    fontSize: 10,
    fontWeight: 800,
    marginBottom: 4,
  },
  compactTable: {
    borderLeft: '1 solid #111111',
    borderTop: '1 solid #111111',
  },
  compactHeaderRow: {
    backgroundColor: '#f4f2fa',
    display: 'flex',
    flexDirection: 'row',
    fontWeight: 700,
  },
  compactRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  metricCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '28%',
  },
  modeCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    flexBasis: 0,
    flexGrow: 1,
    fontSize: 8.5,
    padding: 4,
  },
  flowModeCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '34%',
  },
  flowValueCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '27%',
  },
  flowShareCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '12%',
  },
  passengerFlowChartImage: {
    border: '1 solid #111111',
    height: 170,
    objectFit: 'contain',
    width: '100%',
  },
  passengerFlowChartFrame: {
    border: '1 solid #111111',
    marginBottom: 10,
    padding: 8,
  },
  passengerFlowChartLabels: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  passengerFlowChartLabel: {
    fontFamily: 'RalewayPdf',
    fontSize: 9,
    fontWeight: 800,
  },
  passengerFlowLegend: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  passengerFlowLegendItem: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontSize: 8,
    gap: 3,
    width: '31%',
  },
  passengerFlowLegendSwatch: {
    height: 7,
    width: 7,
  },
  formulaBox: {
    alignItems: 'center',
    border: '1 solid #111111',
    marginBottom: 12,
    padding: 10,
  },
  finalIndexCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '8%',
  },
  finalNameCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '52%',
  },
  finalValueCell: {
    borderBottom: '1 solid #111111',
    borderRight: '1 solid #111111',
    padding: 4,
    width: '40%',
  },
  caption: {
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 4,
    textAlign: 'center',
  },
  mapFrame: {
    alignItems: 'center',
    backgroundColor: '#eef3ec',
    border: '1 solid #111111',
    height: 78,
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  mapImage: {
    height: '100%',
    width: '100%',
  },
  mapFallback: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  mapOverlay: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  mapText: {
    color: '#555555',
    textAlign: 'center',
  },
});
