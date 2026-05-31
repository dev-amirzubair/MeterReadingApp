import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StatTile } from '../../components/StatTile';
import { useAppTheme } from '../../theme/useAppTheme';
import { useMeterStore } from '../../store/meterStore';
import {
  selectReadingsForMeter,
  useReadingStore,
} from '../../store/readingStore';
import { DISCOS, type Reading } from '../../types/domain';
import {
  averageMonthlyUnits,
  currentMonthUsage,
  monthlyUsageFromReadings,
  unitsSinceLastBill,
} from '../../utils/usage';
import { toBarPoints } from '../analytics/chartData';
import type { MetersStackParamList } from './navigation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32 - 32;

type Props = NativeStackScreenProps<MetersStackParamList, 'MeterDetail'>;

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy');

const TIMELINE_LIMIT = 8;

export function MeterDetailScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { meterId } = route.params;

  const meter = useMeterStore(s => s.meters.find(m => m.id === meterId));
  const readingsSelector = useMemo(
    () => selectReadingsForMeter(meterId),
    [meterId],
  );
  const readings = useReadingStore(readingsSelector);
  const refreshReadings = useReadingStore(s => s.refreshForMeter);

  useFocusEffect(
    useCallback(() => {
      refreshReadings(meterId);
    }, [meterId, refreshReadings]),
  );

  // Stable refs so the header button isn't redefined every render.
  const navRef = useRef(navigation);
  navRef.current = navigation;
  const meterIdRef = useRef(meterId);
  meterIdRef.current = meterId;

  const renderHeaderRight = useCallback(
    () => (
      <Text
        onPress={() =>
          navRef.current.navigate('MeterForm', { meterId: meterIdRef.current })
        }
        style={[styles.editLink, { color: colors.primary }]}>
        Edit
      </Text>
    ),
    [colors.primary],
  );

  useEffect(() => {
    navigation.setOptions({
      title: meter?.meterName ?? 'Meter',
      headerRight: meter ? renderHeaderRight : undefined,
    });
  }, [meter, navigation, renderHeaderRight]);

  const usages = useMemo(
    () => monthlyUsageFromReadings(readings),
    [readings],
  );
  const current = currentMonthUsage(usages);
  const average = averageMonthlyUnits(usages);
  const lastReading: Reading | null = readings[0] ?? null;

  // "X units consumed since last bill reading"
  // Show only when the most recent reading is a CASUAL one and a BILL exists.
  const sinceLastBill = useMemo(() => {
    if (!lastReading || lastReading.readingType !== 'CASUAL') {
      return null;
    }
    const bills = readings.filter(r => r.readingType === 'BILL');
    if (bills.length === 0) {
      return null;
    }
    const units = unitsSinceLastBill(bills, lastReading);
    return units !== null ? { units, casual: lastReading } : null;
  }, [lastReading, readings]);

  if (!meter) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          title="Meter not found"
          message="It may have been deleted."
          actionLabel="Back to meters"
          onAction={() => navigation.popToTop()}
        />
      </View>
    );
  }

  const discoFull = DISCOS.find(d => d.value === meter.disco);
  const visibleReadings = readings.slice(0, TIMELINE_LIMIT);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Card title={meter.meterName} subtitle={discoFull?.region ?? meter.disco}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
            Consumer No
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {meter.consumerNumber}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
            DISCO
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {discoFull?.label ?? meter.disco}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
            Created
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatDate(meter.createdAt)}
          </Text>
        </View>
      </Card>

      {sinceLastBill ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.warningSoft,
              borderColor: colors.warning,
            },
          ]}>
          <Text style={[styles.bannerTitle, { color: colors.warning }]}>
            {sinceLastBill.units.toLocaleString()} units since last bill reading
          </Text>
          <Text style={[styles.bannerHint, { color: colors.textMuted }]}>
            Based on the latest CASUAL reading on{' '}
            {formatDate(sinceLastBill.casual.readingDate)}.
          </Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <StatTile
          label="LAST READING"
          value={
            lastReading ? `${lastReading.readingValue.toLocaleString()}` : '—'
          }
          hint={
            lastReading
              ? `${lastReading.readingType} · ${formatDate(lastReading.readingDate)}`
              : 'No readings yet'
          }
          tone="primary"
        />
        <View style={styles.gap} />
        <StatTile
          label="THIS MONTH"
          value={current ? `${current.units}` : '—'}
          hint={current ? 'units' : 'Need 2+ BILL readings'}
          tone="success"
        />
      </View>

      <View style={styles.statsRow}>
        <StatTile
          label="AVG MONTHLY"
          value={average !== null ? `${average}` : '—'}
          hint="units (BILL only)"
          tone="warning"
        />
        <View style={styles.gap} />
        <StatTile
          label="MONTHS"
          value={`${usages.length}`}
          hint="closed bill cycles"
        />
      </View>

      <Card title="Reading history" style={styles.section}>
        {readings.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>
            No readings recorded yet. Tap “Add reading” below to start.
          </Text>
        ) : (
          <>
            {visibleReadings.map(r => (
              <Pressable
                key={r.id}
                onPress={() =>
                  navigation.navigate('ReadingForm', {
                    meterId,
                    readingId: r.id,
                  })
                }
                style={({ pressed }) => [
                  styles.timelineRow,
                  pressed && { opacity: 0.6 },
                ]}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          r.readingType === 'BILL'
                            ? colors.success
                            : colors.warning,
                      },
                    ]}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.timelineValue, { color: colors.text }]}>
                    {r.readingValue.toLocaleString()}{' '}
                    <Text
                      style={[
                        styles.timelineType,
                        { color: colors.textMuted },
                      ]}>
                      · {r.readingType}
                    </Text>
                  </Text>
                  <Text
                    style={[
                      styles.timelineDate,
                      { color: colors.textMuted },
                    ]}>
                    {formatDate(r.readingDate)}
                    {r.notes ? ` · ${r.notes.slice(0, 40)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: colors.textMuted }]}>
                  ›
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() =>
                navigation.navigate('ReadingsList', { meterId })
              }
              style={({ pressed }) => [
                styles.viewAll,
                pressed && { opacity: 0.6 },
              ]}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                {readings.length > TIMELINE_LIMIT
                  ? `View all ${readings.length} readings →`
                  : 'View all readings →'}
              </Text>
            </Pressable>
          </>
        )}
      </Card>

      {usages.length >= 2 ? (
        <Card
          title="Last 6 months"
          subtitle="Monthly usage (BILL deltas)"
          style={styles.section}>
          <View style={styles.chartWrap}>
            <BarChart
              data={toBarPoints(usages.slice(-6))}
              width={CHART_WIDTH}
              height={160}
              barWidth={22}
              barBorderRadius={4}
              spacing={Math.max(
                8,
                Math.floor(CHART_WIDTH / Math.max(1, Math.min(usages.length, 6)) - 22),
              )}
              frontColor={colors.primary}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              rulesColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              noOfSections={3}
              isAnimated
              initialSpacing={4}
            />
          </View>
        </Card>
      ) : (
        <Card title="Charts" style={styles.section}>
          <Text style={{ color: colors.textMuted }}>
            Need at least two BILL readings to draw a usage chart. Open the
            Analytics tab for the full breakdown.
          </Text>
        </Card>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          label="+ Add reading"
          onPress={() =>
            navigation.navigate('ReadingForm', { meterId })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  editLink: { fontSize: 16, fontWeight: '700', marginRight: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  banner: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 15, fontWeight: '800' },
  bannerHint: { fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 12 },
  gap: { width: 10 },
  section: { marginTop: 12 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineLeft: { width: 24, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  timelineValue: { fontSize: 15, fontWeight: '700' },
  timelineType: { fontSize: 12, fontWeight: '500' },
  timelineDate: { fontSize: 12, marginTop: 2 },
  viewAll: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chevron: { fontSize: 24, fontWeight: '300', marginLeft: 8 },
  chartWrap: { alignItems: 'center', marginTop: 4 },
  actions: { marginTop: 20 },
});
