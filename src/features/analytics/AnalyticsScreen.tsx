import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { format, parseISO } from 'date-fns';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { OptionPicker } from '../../components/OptionPicker';
import { StatTile } from '../../components/StatTile';
import { useAppTheme } from '../../theme/useAppTheme';
import { useMeterStore } from '../../store/meterStore';
import {
  applyPeriod,
  aggregatedMonthlyUsage,
  PERIOD_OPTIONS,
  summarize,
  toBarPoints,
  toYearlyPoints,
  type AnalyticsPeriod,
} from './chartData';
import { useAnalyticsData } from './useAnalyticsData';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32 - 32; // screen padding + card padding

const ALL_METERS = '__ALL__';

export function AnalyticsScreen() {
  const { colors, isDark } = useAppTheme();
  const meters = useMeterStore(s => s.meters);
  const { bills, loading, refresh } = useAnalyticsData();

  const [period, setPeriod] = useState<AnalyticsPeriod>('6M');
  const [meterId, setMeterId] = useState<string>(ALL_METERS);

  const meterOptions = useMemo(
    () => [
      { value: ALL_METERS, label: 'All meters' },
      ...meters.map(m => ({ value: m.id, label: m.meterName })),
    ],
    [meters],
  );

  const usages = useMemo(
    () => aggregatedMonthlyUsage(bills, meterId === ALL_METERS ? null : meterId),
    [bills, meterId],
  );

  const filtered = useMemo(() => applyPeriod(usages, period), [usages, period]);
  const monthlyBars = useMemo(() => toBarPoints(filtered), [filtered]);
  const yearlyBars = useMemo(
    () =>
      toYearlyPoints(usages).map(y => ({
        value: y.units,
        label: y.year,
      })),
    [usages],
  );
  const trendPoints = useMemo(
    () =>
      monthlyBars.map(p => ({
        value: p.value,
        label: p.label,
      })),
    [monthlyBars],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  const noData = bills.length < 2;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }>
      <Text style={[styles.heading, { color: colors.text }]}>Analytics</Text>
      <Text style={[styles.subheading, { color: colors.textMuted }]}>
        Computed from your BILL readings (CASUAL readings are ignored).
      </Text>

      <Card title="Period" subtitle="Filter monthly + trend charts.">
        <OptionPicker<AnalyticsPeriod>
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
        />
      </Card>

      {meters.length > 0 ? (
        <Card title="Meter" style={styles.section}>
          <OptionPicker
            value={meterId}
            onChange={setMeterId}
            options={meterOptions}
          />
        </Card>
      ) : null}

      {noData ? (
        <Card style={styles.section}>
          <EmptyState
            title="Not enough data yet"
            message="Record at least two BILL readings to start seeing usage charts."
            icon="📊"
          />
        </Card>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatTile
              label="TOTAL UNITS"
              value={summary.totalUnits.toLocaleString()}
              hint={`${summary.monthsCount} month${summary.monthsCount === 1 ? '' : 's'}`}
              tone="primary"
            />
            <View style={styles.gap} />
            <StatTile
              label="AVG / MONTH"
              value={
                summary.averageUnits !== null
                  ? summary.averageUnits.toLocaleString()
                  : '—'
              }
              hint="units"
              tone="success"
            />
          </View>

          <View style={styles.statsRow}>
            <StatTile
              label="HIGHEST"
              value={
                summary.highest
                  ? summary.highest.units.toLocaleString()
                  : '—'
              }
              hint={
                summary.highest
                  ? format(parseISO(`${summary.highest.month}-01`), 'MMM yyyy')
                  : ''
              }
              tone="danger"
            />
            <View style={styles.gap} />
            <StatTile
              label="LOWEST"
              value={
                summary.lowest ? summary.lowest.units.toLocaleString() : '—'
              }
              hint={
                summary.lowest
                  ? format(parseISO(`${summary.lowest.month}-01`), 'MMM yyyy')
                  : ''
              }
              tone="success"
            />
          </View>

          <Card title="Monthly usage" style={styles.section}>
            {monthlyBars.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>
                No data in selected period.
              </Text>
            ) : (
              <View style={styles.chart}>
                <BarChart
                  data={monthlyBars}
                  width={CHART_WIDTH}
                  height={200}
                  barWidth={20}
                  barBorderRadius={4}
                  spacing={Math.max(
                    8,
                    Math.floor((CHART_WIDTH - monthlyBars.length * 20) /
                      Math.max(1, monthlyBars.length)),
                  )}
                  frontColor={colors.primary}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  noOfSections={4}
                  isAnimated
                  initialSpacing={4}
                />
              </View>
            )}
          </Card>

          <Card title="Consumption trend" style={styles.section}>
            {trendPoints.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>
                No data in selected period.
              </Text>
            ) : (
              <View style={styles.chart}>
                <LineChart
                  data={trendPoints}
                  width={CHART_WIDTH}
                  height={200}
                  color={colors.primary}
                  thickness={3}
                  dataPointsColor={colors.primary}
                  startFillColor={colors.primary}
                  endFillColor={isDark ? colors.surface : '#FFFFFF'}
                  startOpacity={0.5}
                  endOpacity={0}
                  areaChart
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  noOfSections={4}
                  isAnimated
                  initialSpacing={8}
                />
              </View>
            )}
          </Card>

          {yearlyBars.length > 0 ? (
            <Card title="Yearly usage" subtitle="All time" style={styles.section}>
              <View style={styles.chart}>
                <BarChart
                  data={yearlyBars}
                  width={CHART_WIDTH}
                  height={180}
                  barWidth={36}
                  barBorderRadius={6}
                  spacing={28}
                  frontColor={colors.accent}
                  yAxisColor={colors.border}
                  xAxisColor={colors.border}
                  rulesColor={colors.border}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: colors.textMuted,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                  noOfSections={4}
                  isAnimated
                  initialSpacing={12}
                />
              </View>
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 24, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 4, marginBottom: 16, lineHeight: 18 },
  section: { marginTop: 12 },
  statsRow: { flexDirection: 'row', marginTop: 12 },
  gap: { width: 10 },
  chart: { alignItems: 'center', marginTop: 8 },
});
