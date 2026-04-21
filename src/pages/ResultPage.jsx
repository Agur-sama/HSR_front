import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Stack,
  Chip,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  DownloadOutlined,
  RestartAltOutlined,
} from '@mui/icons-material';
import { resultMock } from '../data/resultMock';

// Custom SVG Icons mapped to MUI-compatible components
function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24 }}>
      <path d="M4 13h16M6 8h12M7 5h10M7 17h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24 }}>
      <path d="M4 6h5v5H4zM11 9h9M4 13h5v5H4zM11 16h9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResourcesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24 }}>
      <path d="M4 15c0-2.2 1.8-4 4-4h8v7a2 2 0 0 1-2 2H8a4 4 0 0 1-4-5ZM8 4h8v7H8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RisksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24 }}>
      <path d="M12 4 3.5 19h17L12 4Zm0 5v4m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24 }}>
      <path d="M7 4h8l4 4v12H7V4Zm8 0v4h4M10 12h6M10 16h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const iconMap = {
  budget: <BudgetIcon />,
  timeline: <TimelineIcon />,
  resources: <ResourcesIcon />,
  risks: <RisksIcon />,
  report: <ReportIcon />,
};

function scoreGradeMap(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

export default function ResultPage() {
  const ringPercent = Math.max(0, Math.min(100, resultMock.score));
  const gradeTone = scoreGradeMap(resultMock.score);
  const negativeMetricsCount = resultMock.metrics.filter((metric) => metric.tone === 'negative').length;
  const needCoachReplay = resultMock.score < 85 || negativeMetricsCount >= 2;
  const primaryActionLabel = needCoachReplay ? 'Повторить с подсказками' : 'Запустить новый сценарий';

  const scoreColors = useMemo(
    () => ({
      excellent: '#4B8F63',
      good: '#4D6F98',
      warning: '#6A84AA',
      critical: '#B45B4E',
    }),
    []
  );

  const getScoreAccentColor = useMemo(
    () => scoreColors[gradeTone] || '#2D6CDF',
    [gradeTone, scoreColors]
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1180px',
        margin: '24px auto 42px',
        px: 2,
      }}
    >
      {/* Hero Section */}
      <Card
        sx={{
          mb: 2,
          borderRadius: '18px',
          boxShadow: '0 10px 30px rgba(31, 45, 61, 0.08)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Hero Top Line */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#617899' }}>
              Симулятор управления ресурсами
            </Typography>
            <Chip
              label={resultMock.status}
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: resultMock.statusTone === 'warning' ? '#EAF1FB' : '#FFFFFF',
                borderColor: resultMock.statusTone === 'warning' ? '#C8D7ED' : '#DBE3EE',
                color: resultMock.statusTone === 'warning' ? '#4F6789' : '#1A2A3F',
              }}
            />
          </Stack>

          {/* Hero Grid */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} sm={8}>
              <Typography variant="h1" sx={{ mb: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
                Итоги проектной сессии
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: '#1A2A3F' }}>
                {resultMock.scenario}
              </Typography>
              <Typography variant="caption" sx={{ color: '#617899' }}>
                {resultMock.team} · Сессия {resultMock.sessionId} · {resultMock.completionDate}
              </Typography>
            </Grid>

            {/* Score Ring */}
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  width: 170,
                  height: 170,
                  borderRadius: '50%',
                  background: `conic-gradient(${getScoreAccentColor} ${ringPercent}%, #D7E1EF 0%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 12,
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    zIndex: 0,
                  },
                }}
              >
                <Stack
                  alignItems="center"
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                  }}
                >
                  <Box sx={{ width: 22, height: 22, mb: 0.5, color: '#10203A' }}>
                    {iconMap.report}
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '44px',
                      fontWeight: 700,
                      lineHeight: 1,
                      color: '#10203A',
                    }}
                  >
                    {resultMock.score}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#617899' }}>
                    {resultMock.grade}
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          </Grid>

          {/* Hero Actions */}
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button
              startIcon={<DownloadOutlined />}
              variant="contained"
              color="primary"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
                py: 1.25,
                px: 2,
              }}
            >
              Скачать отчет
            </Button>
            <Button
              startIcon={<RestartAltOutlined />}
              variant="outlined"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '14px',
                py: 1.25,
                px: 2,
                borderColor: '#B4C5DA',
                color: '#1A2A3F',
                '&:hover': {
                  backgroundColor: '#F8FAFC',
                  borderColor: '#B4C5DA',
                },
              }}
            >
              {primaryActionLabel}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {resultMock.metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.id}>
            <Card sx={{ height: '100%', borderRadius: '14px' }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '8px',
                      backgroundColor: '#ECF2FA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0B3A8D',
                    }}
                  >
                    {iconMap[metric.id] || iconMap.budget}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#617899', pt: 0.5 }}>
                    {metric.label}
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '28px',
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  {metric.value}
                </Typography>

                <Typography variant="caption" sx={{ color: '#617899', display: 'block', mb: 1 }}>
                  {metric.hint}
                </Typography>

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1, fontSize: '12px', color: '#617899' }}>
                  <span>
                    Факт: <strong>{metric.fact}</strong>
                  </span>
                  <span>
                    План: <strong>{metric.plan}</strong>
                  </span>
                </Stack>

                <Stack direction="row" gap={0.75}>
                  <Chip
                    label={metric.delta}
                    size="small"
                    sx={{
                      backgroundColor: metric.tone === 'positive' ? '#EDF7F1' : '#FAEEEB',
                      color: metric.tone === 'positive' ? '#3F7E57' : '#A05347',
                      fontSize: '11px',
                      fontWeight: 600,
                      height: 'auto',
                      py: 0.5,
                    }}
                  />
                  <Chip
                    label={metric.trend}
                    size="small"
                    sx={{
                      backgroundColor: metric.tone === 'positive' ? '#EDF7F1' : '#FAEEEB',
                      color: metric.tone === 'positive' ? '#3F7E57' : '#A05347',
                      fontSize: '11px',
                      fontWeight: 600,
                      height: 'auto',
                      py: 0.5,
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Details Grid */}
      <Grid container spacing={1.5}>
        {/* Score Breakdown */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h2" sx={{ mb: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                Структура оценки
              </Typography>
              <Typography variant="caption" sx={{ color: '#617899', display: 'block', mb: 2 }}>
                Как сформировался итоговый балл
              </Typography>

              <Stack spacing={1.5}>
                {resultMock.scoreParts.map((part) => {
                  const ratio = Math.round((part.value / part.max) * 100);
                  return (
                    <Box key={part.label}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75, fontSize: '14px' }}>
                        <span>{part.label}</span>
                        <strong>
                          {part.value}/{part.max}
                        </strong>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={ratio}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#ECF2FA',
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(90deg, #4D6F98, #0B3A8D)`,
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Events Timeline */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h2" sx={{ mb: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                Ключевые события
              </Typography>
              <Typography variant="caption" sx={{ color: '#617899', display: 'block', mb: 2 }}>
                Решения, повлиявшие на итог
              </Typography>

              <Stack spacing={1}>
                {resultMock.timeline.map((item) => (
                  <Box
                    key={item.title}
                    sx={{
                      pl: 1.5,
                      borderLeft: `2px solid ${item.tone === 'positive' ? '#4B8F63' : '#6A84AA'}`,
                      py: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#617899', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.08em' }}>
                      {item.month}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1A2A3F' }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#617899' }}>
                      {item.note}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: '14px' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h2" sx={{ mb: 0.5, fontFamily: "'IBM Plex Mono', monospace" }}>
                Рекомендации на следующий запуск
              </Typography>
              <Typography variant="caption" sx={{ color: '#617899', display: 'block', mb: 2 }}>
                Приоритетные шаги для улучшения результата
              </Typography>

              <Stack spacing={1}>
                {resultMock.recommendations.map((recommendation) => (
                  <Paper
                    key={recommendation.priority}
                    sx={{
                      p: 1.5,
                      backgroundColor: '#ECF2FA',
                      border: '1px solid #D7E1EF',
                      borderRadius: '12px',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip
                        label={recommendation.priority}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '11px',
                          letterSpacing: '0.06em',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #B4C5DA',
                          color: '#0B3A8D',
                          minWidth: 34,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600, pt: 0.5 }}>
                        {recommendation.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#1A2A3F', mb: 0.75 }}>
                      {recommendation.action}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#617899' }}>
                      Эффект: {recommendation.expectedEffect}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

