import React from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from '../../components/Card';
import { FadeInUp } from '../../components/FadeInUp';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton, SkeletonStack } from '../../components/Skeleton';
import { StatTile } from '../../components/StatTile';
import { useAppTheme } from '../../theme/useAppTheme';
import { APP_NAME } from '../../constants/app';
import { useMeterStore } from '../../store/meterStore';
import { useDashboardStats } from './useDashboardStats';
import type { RootTabParamList } from '../../navigation/RootNavigator';

const fmtMonth = (m: string) => format(parseISO(`${m}-01`), 'MMM yyyy');
const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : n.toLocaleString();

export function DashboardScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { stats, loading, hasLoadedOnce, refresh } = useDashboardStats();
  const meters = useMeterStore(s => s.meters);
  const showSkeleton = !hasLoadedOnce;

  const goToReadingForm = (autoScan: boolean) => {
    if (meters.length === 0) {
      Alert.alert(
        'No meters yet',
        'Add a meter first, then come back to record readings against it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add meter',
            onPress: () =>
              navigation.navigate('Meters', {
                screen: 'MeterForm',
                params: {},
              }),
          },
        ],
      );
      return;
    }
    if (meters.length === 1) {
      navigation.navigate('Meters', {
        screen: 'ReadingForm',
        params: { meterId: meters[0].id, autoScan },
      });
      return;
    }
    // Multiple meters: drop the user into the meters list to choose one.
    navigation.navigate('Meters', { screen: 'MeterList' });
  };

  const startAddReading = () => goToReadingForm(false);
  const startScanReading = () => goToReadingForm(true);

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
      <FadeInUp>
        <Text style={[styles.greeting, { color: colors.text }]}>{APP_NAME}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Track meter readings and electricity usage. Everything is stored on
          this device.
        </Text>
      </FadeInUp>

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          <FadeInUp delay={60}>
            <View style={styles.statsRow}>
              <StatTile
                label="TOTAL METERS"
                value={fmtNum(stats.totalMeters)}
                tone="primary"
              />
              <View style={styles.gap} />
              <StatTile
                label="THIS MONTH"
                value={fmtNum(stats.currentMonthUnits)}
                hint="units"
                tone="success"
              />
            </View>
          </FadeInUp>

          <FadeInUp delay={120}>
            <View style={styles.statsRow}>
              <StatTile
                label="PREVIOUS MONTH"
                value={fmtNum(stats.previousMonthUnits)}
                hint="units"
              />
              <View style={styles.gap} />
              <StatTile
                label="AVG MONTHLY"
                value={fmtNum(stats.averageMonthlyUnits)}
                hint="units (BILL only)"
                tone="warning"
              />
            </View>
          </FadeInUp>

          <FadeInUp delay={180} style={styles.section}>
            <Card title="Highest / Lowest">
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Highest
                  </Text>
                  <Text style={[styles.bigValue, { color: colors.danger }]}>
                    {fmtNum(stats.highestMonth?.units ?? null)}{' '}
                    <Text style={[styles.unit, { color: colors.textMuted }]}>
                      units
                    </Text>
                  </Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    {stats.highestMonth
                      ? fmtMonth(stats.highestMonth.month)
                      : '—'}
                  </Text>
                </View>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <View style={styles.flex}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Lowest
                  </Text>
                  <Text style={[styles.bigValue, { color: colors.success }]}>
                    {fmtNum(stats.lowestMonth?.units ?? null)}{' '}
                    <Text style={[styles.unit, { color: colors.textMuted }]}>
                      units
                    </Text>
                  </Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    {stats.lowestMonth
                      ? fmtMonth(stats.lowestMonth.month)
                      : '—'}
                  </Text>
                </View>
              </View>
            </Card>
          </FadeInUp>

          <FadeInUp delay={240} style={styles.section}>
            <Card title="Last reading">
              {stats.lastReading ? (
                <View>
                  <Text style={[styles.bigValue, { color: colors.text }]}>
                    {stats.lastReading.readingValue.toLocaleString()}
                  </Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    {stats.lastReading.readingType} ·{' '}
                    {format(
                      parseISO(stats.lastReading.readingDate),
                      'd MMM yyyy',
                    )}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.muted, { color: colors.textMuted }]}>
                  No readings yet. Add a meter, then record its first reading.
                </Text>
              )}
            </Card>
          </FadeInUp>
        </>
      )}

      <FadeInUp delay={showSkeleton ? 100 : 300} style={styles.section}>
        <Card title="Quick actions">
          <PrimaryButton label="+ Add reading" onPress={startAddReading} />
          <View style={styles.spacer} />
          <PrimaryButton
            label="Manage meters"
            variant="outline"
            onPress={() =>
              navigation.navigate('Meters', { screen: 'MeterList' })
            }
          />
          <View style={styles.spacer} />
          <PrimaryButton
            label="Check bill (WebView)"
            variant="outline"
            onPress={() => navigation.navigate('BillChecker')}
          />
          <View style={styles.spacer} />
          <PrimaryButton
            label="📷 Scan reading"
            variant="outline"
            onPress={startScanReading}
          />
        </Card>
      </FadeInUp>
    </ScrollView>
  );
}

function DashboardSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View>
      <View style={styles.statsRow}>
        <View
          style={[
            styles.skeletonTile,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Skeleton width={70} height={10} radius={4} />
          <View style={styles.spacer} />
          <Skeleton width={60} height={22} />
        </View>
        <View style={styles.gap} />
        <View
          style={[
            styles.skeletonTile,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Skeleton width={70} height={10} radius={4} />
          <View style={styles.spacer} />
          <Skeleton width={60} height={22} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View
          style={[
            styles.skeletonTile,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Skeleton width={70} height={10} radius={4} />
          <View style={styles.spacer} />
          <Skeleton width={60} height={22} />
        </View>
        <View style={styles.gap} />
        <View
          style={[
            styles.skeletonTile,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Skeleton width={70} height={10} radius={4} />
          <View style={styles.spacer} />
          <Skeleton width={60} height={22} />
        </View>
      </View>
      <View style={styles.section}>
        <Card title="Highest / Lowest">
          <SkeletonStack rows={3} />
        </Card>
      </View>
      <View style={styles.section}>
        <Card title="Last reading">
          <SkeletonStack rows={2} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', marginTop: 12 },
  gap: { width: 10 },
  section: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  divider: { width: StyleSheet.hairlineWidth, height: 60, marginHorizontal: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  bigValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  unit: { fontSize: 13, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 4 },
  spacer: { height: 10 },
  muted: {},
  skeletonTile: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
