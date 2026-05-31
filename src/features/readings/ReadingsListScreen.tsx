import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FadeInUp } from '../../components/FadeInUp';
import { OptionPicker } from '../../components/OptionPicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppTheme } from '../../theme/useAppTheme';
import { useMeterStore } from '../../store/meterStore';
import {
  selectReadingsForMeter,
  useReadingStore,
} from '../../store/readingStore';
import type { Reading } from '../../types/domain';
import type { MetersStackParamList } from '../meters/navigation';

type Props = NativeStackScreenProps<MetersStackParamList, 'ReadingsList'>;

type Filter = 'ALL' | 'BILL' | 'CASUAL';
type SortDir = 'NEWEST' | 'OLDEST';

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'BILL', label: 'BILL' },
  { value: 'CASUAL', label: 'CASUAL' },
];

const SORT_OPTIONS: { value: SortDir; label: string }[] = [
  { value: 'NEWEST', label: 'Newest' },
  { value: 'OLDEST', label: 'Oldest' },
];

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy');

const ItemSeparator = () => <View style={styles.separator} />;

const keyById = (item: Reading): string => item.id;

export function ReadingsListScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { meterId } = route.params;

  const meter = useMeterStore(
    useCallback(s => s.meters.find(m => m.id === meterId), [meterId]),
  );
  const readingsSelector = useMemo(
    () => selectReadingsForMeter(meterId),
    [meterId],
  );
  const readings = useReadingStore(readingsSelector);
  const loadingMeterId = useReadingStore(s => s.loadingMeterId);
  const refresh = useReadingStore(s => s.refreshForMeter);
  const removeReading = useReadingStore(s => s.remove);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [sortDir, setSortDir] = useState<SortDir>('NEWEST');

  // Track the currently-open Swipeable so we can close it when another opens.
  const openSwipeRef = useRef<SwipeableMethods | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh(meterId);
    }, [meterId, refresh]),
  );

  useEffect(() => {
    navigation.setOptions({
      title: meter?.meterName
        ? `${meter.meterName} – Readings`
        : 'Readings',
    });
  }, [meter?.meterName, navigation]);

  const visible = useMemo(() => {
    let list = readings;
    if (filter !== 'ALL') {
      list = list.filter(r => r.readingType === filter);
    }
    list = [...list].sort((a, b) => {
      const cmp = a.readingDate.localeCompare(b.readingDate);
      return sortDir === 'NEWEST' ? -cmp : cmp;
    });
    return list;
  }, [readings, filter, sortDir]);

  const counts = useMemo(() => {
    let bill = 0;
    let casual = 0;
    for (const r of readings) {
      if (r.readingType === 'BILL') {
        bill++;
      } else {
        casual++;
      }
    }
    return { bill, casual, total: readings.length };
  }, [readings]);

  const confirmDelete = useCallback(
    (reading: Reading, swipeable?: SwipeableMethods | null) => {
      Alert.alert(
        'Delete this reading?',
        `${reading.readingValue.toLocaleString()} on ${formatDate(reading.readingDate)} (${reading.readingType}). This cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => swipeable?.close(),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              swipeable?.close();
              removeReading(reading.id, meterId);
            },
          },
        ],
      );
    },
    [meterId, removeReading],
  );

  const goToEdit = useCallback(
    (readingId: string) =>
      navigation.navigate('ReadingForm', { meterId, readingId }),
    [meterId, navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Reading; index: number }) => (
      <FadeInUp delay={Math.min(index * 40, 240)}>
        <SwipeableRow
          item={item}
          colors={colors}
          onPress={goToEdit}
          onConfirmDelete={confirmDelete}
          openRef={openSwipeRef}
        />
      </FadeInUp>
    ),
    [colors, confirmDelete, goToEdit],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Card>
          <OptionPicker<Filter>
            label={`${counts.total} reading${counts.total === 1 ? '' : 's'} (BILL: ${counts.bill}, CASUAL: ${counts.casual})`}
            value={filter}
            onChange={setFilter}
            options={FILTER_OPTIONS}
          />
          <View style={styles.spacer} />
          <OptionPicker<SortDir>
            label="Sort"
            value={sortDir}
            onChange={setSortDir}
            options={SORT_OPTIONS}
          />
        </Card>
      </View>

      <FlatList
        data={visible}
        keyExtractor={keyById}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
        // Windowing tuned for a long history (5+ years of monthly readings).
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        refreshControl={
          <RefreshControl
            refreshing={loadingMeterId === meterId}
            onRefresh={() => refresh(meterId)}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          visible.length > 0 ? (
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>
              Tap to edit · Swipe left to delete
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={
              filter === 'ALL'
                ? 'No readings yet'
                : `No ${filter} readings`
            }
            message={
              filter === 'ALL'
                ? 'Record your first reading to start tracking usage.'
                : `No readings with type ${filter}. Try the All filter or add a new one.`
            }
            actionLabel="+ Add reading"
            onAction={() => navigation.navigate('ReadingForm', { meterId })}
            icon="📒"
          />
        }
      />

      {visible.length > 0 ? (
        <View style={styles.fab}>
          <PrimaryButton
            label="+ Add reading"
            onPress={() => navigation.navigate('ReadingForm', { meterId })}
          />
        </View>
      ) : null}
    </View>
  );
}

interface SwipeableRowProps {
  item: Reading;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: (readingId: string) => void;
  onConfirmDelete: (
    item: Reading,
    swipeable?: SwipeableMethods | null,
  ) => void;
  openRef: React.MutableRefObject<SwipeableMethods | null>;
}

const SwipeableRow = React.memo(function SwipeableRow({
  item,
  colors,
  onPress,
  onConfirmDelete,
  openRef,
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const renderRightActions = (
    _progress: SharedValue<number>,
    translation: SharedValue<number>,
  ) => (
    <RightAction
      translation={translation}
      bg={colors.danger}
      onPress={() => onConfirmDelete(item, swipeableRef.current)}
    />
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={56}
      renderRightActions={renderRightActions}
      overshootRight={false}
      onSwipeableWillOpen={() => {
        if (
          openRef.current &&
          openRef.current !== swipeableRef.current
        ) {
          openRef.current.close();
        }
        openRef.current = swipeableRef.current;
      }}
      containerStyle={styles.swipeContainer}>
      <Pressable
        onPress={() => onPress(item.id)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                item.readingType === 'BILL' ? colors.success : colors.warning,
            },
          ]}
        />
        <View style={styles.rowMain}>
          <View style={styles.rowHeaderLine}>
            <Text style={[styles.rowValue, { color: colors.text }]}>
              {item.readingValue.toLocaleString()}
            </Text>
            <Text
              style={[
                styles.rowType,
                {
                  color:
                    item.readingType === 'BILL'
                      ? colors.success
                      : colors.warning,
                }, 
              ]}>
              {item.readingType}
            </Text>
          </View>
          <Text style={[styles.rowDate, { color: colors.textMuted }]}>
            {formatDate(item.readingDate)}
            {item.notes ? ` · ${item.notes.slice(0, 60)}` : ''}
          </Text>
          {item.ocrDetectedValue !== null &&
          item.ocrDetectedValue !== undefined &&
          item.ocrDetectedValue !== item.readingValue ? (
            <Text style={[styles.rowOcr, { color: colors.textMuted }]}>
              OCR detected: {item.ocrDetectedValue.toLocaleString()} (corrected)
            </Text>
          ) : null}
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
});

interface RightActionProps {
  translation: SharedValue<number>;
  bg: string;
  onPress: () => void;
}

function RightAction({ translation, bg, onPress }: RightActionProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translation.value + 80 }],
  }));

  return (
    <Animated.View style={[styles.rightAction, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={[styles.rightActionButton, { backgroundColor: bg }]}>
        <Text style={styles.rightActionText}>Delete</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingBottom: 8 },
  spacer: { height: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  separator: { height: 8 },
  swipeContainer: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  rowMain: { flex: 1 },
  rowHeaderLine: { flexDirection: 'row', alignItems: 'baseline' },
  rowValue: { fontSize: 18, fontWeight: '800' },
  rowType: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rowDate: { fontSize: 12, marginTop: 2 },
  rowOcr: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  chevron: { fontSize: 24, fontWeight: '300', marginLeft: 8 },
  footerHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  rightAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rightActionButton: {
    width: 72,
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionText: { color: '#fff', fontWeight: '700' },
});
