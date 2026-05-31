import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FadeInUp } from '../../components/FadeInUp';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Skeleton, SkeletonStack } from '../../components/Skeleton';
import { TextField } from '../../components/TextField';
import { useAppTheme } from '../../theme/useAppTheme';
import { DISCOS, type Meter } from '../../types/domain';
import { useMeterStore } from '../../store/meterStore';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import type { MetersStackParamList } from './navigation';

type Props = NativeStackScreenProps<MetersStackParamList, 'MeterList'>;

const discoLabel = (code: Meter['disco']) =>
  DISCOS.find(d => d.value === code)?.label ?? code;

export function MeterListScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const meters = useMeterStore(s => s.meters);
  const loading = useMeterStore(s => s.loading);
  const refresh = useMeterStore(s => s.refresh);

  const [query, setQuery] = useState('');
  // Defer the *derived* filtering work until the user actually pauses typing.
  // The TextField still updates per-keystroke for instant feedback.
  const debouncedQuery = useDebouncedValue(query, 150);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    navigation.setOptions({ title: 'Meters' });
  }, [navigation]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      return meters;
    }
    return meters.filter(
      m =>
        m.meterName.toLowerCase().includes(q) ||
        m.consumerNumber.toLowerCase().includes(q) ||
        m.disco.toLowerCase().includes(q),
    );
  }, [meters, debouncedQuery]);

  const goToDetail = useCallback(
    (meterId: string) => navigation.navigate('MeterDetail', { meterId }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Meter; index: number }) => (
      <MeterRow item={item} index={index} colors={colors} onPress={goToDetail} />
    ),
    [colors, goToDetail],
  );

  const showSkeleton = loading && meters.length === 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TextField
          placeholder="Search by name, consumer no or DISCO"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="+ Add meter"
          onPress={() => navigation.navigate('MeterForm', {})}
        />
      </View>

      {showSkeleton ? (
        <View style={styles.list}>
          {[0, 1, 2].map(i => (
            <Card style={styles.cardSpacing} key={i}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Skeleton width="60%" height={16} />
                  <View style={styles.skeletonGap} />
                  <Skeleton width="40%" height={12} />
                </View>
                <Skeleton width={70} height={26} radius={999} />
              </View>
            </Card>
          ))}
          <SkeletonStack rows={2} style={styles.skeletonStackSpacer} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyById}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          // Windowing tuned for our list (typically 1-20 meters).
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            debouncedQuery ? (
              <EmptyState
                title="No matches"
                message={`Nothing matched "${debouncedQuery}".`}
                icon="🔍"
              />
            ) : (
              <EmptyState
                title="No meters yet"
                message="Add your first electricity meter to start tracking usage."
                actionLabel="Add meter"
                icon="⚡"
                onAction={() => navigation.navigate('MeterForm', {})}
              />
            )
          }
        />
      )}
    </View>
  );
}

const keyById = (item: Meter): string => item.id;

interface MeterRowProps {
  item: Meter;
  index: number;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: (meterId: string) => void;
}

const MeterRow = React.memo(function MeterRow({
  item,
  index,
  colors,
  onPress,
}: MeterRowProps) {
  return (
    <FadeInUp delay={Math.min(index * 50, 300)}>
      <Pressable onPress={() => onPress(item.id)}>
        <Card style={styles.cardSpacing}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.title, { color: colors.text }]}>
                {item.meterName}
              </Text>
              <Text style={[styles.consumer, { color: colors.textMuted }]}>
                Consumer No: {item.consumerNumber}
              </Text>
            </View>
            <View
              style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {discoLabel(item.disco)}
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
    </FadeInUp>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingBottom: 8 },
  spacer: { height: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  cardSpacing: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  consumer: { fontSize: 13, marginTop: 2 },
  badge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  skeletonGap: { height: 8 },
  skeletonStackSpacer: { marginTop: 16, paddingHorizontal: 4 },
});
