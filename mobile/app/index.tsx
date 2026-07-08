import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem
} from 'react-native';
import {
  GROUPED_LAB_RESULTS_PAGE_LIMIT,
  NEW_DATA_PATIENT_OPTIONS,
  TIME_SERIES_PAGE_LIMIT,
  getErrorMessage,
  getLabValueNumber,
  type GroupedLabResultsRow,
  type LabResult,
  type LabResultsView,
  type LabValue,
  type NewDataPatients,
  type TimeSeriesLabResultRow
} from '../lib/labResults';
import { trpc } from '../lib/trpc';

type DisplayRow = TimeSeriesLabResultRow | GroupedLabResultsRow;

const SCROLL_TO_TOP_THRESHOLD = 48 * 8;
const LAB_RESULTS_VIEW_OPTIONS = [
  { value: 'timeSeries', label: 'Time series' },
  { value: 'byPatient', label: 'By patient' }
] as const;

const LAB_VALUE_REFERENCE_RANGES = {
  creatine: { min: 0.6, max: 1.3 },
  chloride: { min: 96, max: 106 },
  fastingGlucose: { min: 70, max: 100 },
  potassium: { min: 3.7, max: 5.2 },
  sodium: { min: 135, max: 145 },
  totalCalcium: { min: 8.5, max: 10.2 },
  totalProtein: { min: 6.0, max: 8.3 }
} as const;

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<DisplayRow>>(null);
  const [labResultsView, setLabResultsView] = useState<LabResultsView>('timeSeries');
  const [newDataPatients, setNewDataPatients] = useState<NewDataPatients>(10);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const timeSeriesQuery = useInfiniteQuery(
    trpc.labResults.timeSeries.infiniteQueryOptions(
      { limit: TIME_SERIES_PAGE_LIMIT },
      {
        enabled: labResultsView === 'timeSeries',
        initialCursor: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor
      }
    )
  );
  const byPatientQuery = useInfiniteQuery(
    trpc.labResults.byPatient.infiniteQueryOptions(
      { limit: GROUPED_LAB_RESULTS_PAGE_LIMIT },
      {
        enabled: labResultsView === 'byPatient',
        initialCursor: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor
      }
    )
  );
  const statsQuery = useQuery(trpc.labResults.stats.queryOptions());

  const invalidateLabResults = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries(trpc.labResults.timeSeries.pathFilter()),
      queryClient.invalidateQueries(trpc.labResults.byPatient.pathFilter()),
      queryClient.invalidateQueries(trpc.labResults.stats.queryFilter())
    ]);
  }, [queryClient]);

  const resetLabResultsMutation = useMutation(
    trpc.labResults.reset.mutationOptions({
      onSuccess: invalidateLabResults,
      onError: (error) => Alert.alert('Could not reset data', getErrorMessage(error))
    })
  );
  const addNewDataMutation = useMutation(
    trpc.labResults.addNewData.mutationOptions({
      onSuccess: invalidateLabResults,
      onError: (error) => Alert.alert('Could not add data', getErrorMessage(error))
    })
  );

  const timeSeriesRows = useMemo(() => {
    return timeSeriesQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  }, [timeSeriesQuery.data]);

  const groupedRows = useMemo(() => {
    return byPatientQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  }, [byPatientQuery.data]);

  const activeQuery = labResultsView === 'timeSeries' ? timeSeriesQuery : byPatientQuery;
  const activeRows: DisplayRow[] = labResultsView === 'timeSeries' ? timeSeriesRows : groupedRows;
  const isInitialLoading = activeQuery.isPending && activeRows.length === 0;
  const isRefreshing =
    activeQuery.isFetching && !activeQuery.isFetchingNextPage && activeRows.length > 0;
  const isMutating = resetLabResultsMutation.isPending || addNewDataMutation.isPending;
  const showLoadingIndicator = activeQuery.isFetching || isMutating;
  const mutatingAction = resetLabResultsMutation.isPending
    ? 'reset'
    : addNewDataMutation.isPending
      ? 'add'
      : null;

  useEffect(() => {
    setShowScrollToTop(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [labResultsView]);

  useEffect(() => {
    if (!timeSeriesQuery.isSuccess && !byPatientQuery.isSuccess) return;

    void queryClient.invalidateQueries(trpc.labResults.stats.queryFilter());
  }, [
    byPatientQuery.dataUpdatedAt,
    byPatientQuery.isSuccess,
    queryClient,
    timeSeriesQuery.dataUpdatedAt,
    timeSeriesQuery.isSuccess
  ]);

  const refreshActiveView = useCallback(() => {
    const query = labResultsView === 'timeSeries' ? timeSeriesQuery : byPatientQuery;

    void query.refetch();
  }, [byPatientQuery, labResultsView, timeSeriesQuery]);

  const loadNextPage = useCallback(() => {
    const query = labResultsView === 'timeSeries' ? timeSeriesQuery : byPatientQuery;

    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [byPatientQuery, labResultsView, timeSeriesQuery]);

  const handleAddNewData = useCallback(() => {
    if (isMutating) return;

    addNewDataMutation.mutate({ patients: newDataPatients });
  }, [addNewDataMutation, isMutating, newDataPatients]);

  const handleListScroll = useCallback((scrollOffset: number) => {
    const shouldShow = scrollOffset > SCROLL_TO_TOP_THRESHOLD;

    setShowScrollToTop((isVisible) => (isVisible === shouldShow ? isVisible : shouldShow));
  }, []);

  const handleScrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollToTop(false);
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset lab results?',
      'This clears the current lab result rows and reloads the initial dataset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetLabResultsMutation.mutate()
        }
      ]
    );
  }, [resetLabResultsMutation]);

  const renderItem = useMemo<ListRenderItem<DisplayRow>>(() => {
    return ({ item }) => {
      if (isGroupedDisplayRow(item)) {
        return item.kind === 'patient' ? (
          <PatientGroupRow row={item} />
        ) : (
          <GroupedLabResultRowCard row={item} />
        );
      }

      return <TimeSeriesLabResultCard row={item} />;
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Ino Mobile</Text>
            <Text style={styles.title}>Lab results</Text>
          </View>

          <View style={styles.titleMeta}>
            {showLoadingIndicator ? <ActivityIndicator color="#111827" /> : null}
            <View style={styles.statsRow}>
              <StatPill label="Patients" value={statsQuery.data?.patients} />
              <StatPill label="Results" value={statsQuery.data?.labResults} />
            </View>
          </View>
        </View>
        {statsQuery.error ? (
          <Text style={styles.inlineError}>
            Stats unavailable: {getErrorMessage(statsQuery.error)}
          </Text>
        ) : null}

        <View style={styles.segmentedControl}>
          {LAB_RESULTS_VIEW_OPTIONS.map((option) => {
            const isSelected = labResultsView === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: isMutating }}
                disabled={isMutating}
                onPress={() => setLabResultsView(option.value)}
                style={[styles.segmentButton, isSelected && styles.segmentButtonSelected]}
              >
                <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actionsPanel}>
          <View style={styles.patientPickerRow}>
            <Text style={styles.panelLabel}>Patients</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.patientOptionsScroll}
              contentContainerStyle={styles.patientOptions}
            >
              {NEW_DATA_PATIENT_OPTIONS.map((patients) => {
                const isSelected = newDataPatients === patients;

                return (
                  <Pressable
                    key={patients}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: isMutating }}
                    disabled={isMutating}
                    onPress={() => setNewDataPatients(patients)}
                    style={[styles.patientOption, isSelected && styles.patientOptionSelected]}
                  >
                    <Text
                      style={[
                        styles.patientOptionText,
                        isSelected && styles.patientOptionTextSelected
                      ]}
                    >
                      {patients}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isMutating }}
              disabled={isMutating}
              onPress={handleAddNewData}
              style={[styles.primaryButton, isMutating && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>
                {mutatingAction === 'add' ? 'Adding...' : 'Add new data'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isMutating }}
              disabled={isMutating}
              onPress={handleReset}
              style={[styles.secondaryButton, isMutating && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>
                {mutatingAction === 'reset' ? 'Resetting...' : 'Reset'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          ref={listRef}
          data={activeRows}
          keyExtractor={getDisplayRowKey}
          renderItem={renderItem}
          contentContainerStyle={
            activeRows.length === 0 ? styles.emptyListContent : styles.listContent
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refreshActiveView} />
          }
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.65}
          onScroll={(event) => handleListScroll(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <EmptyState
              isLoading={isInitialLoading}
              errorMessage={activeQuery.isError ? getErrorMessage(activeQuery.error) : null}
              onRetry={refreshActiveView}
            />
          }
          ListFooterComponent={
            <ListFooter
              hasRows={activeRows.length > 0}
              hasNextPage={Boolean(activeQuery.hasNextPage)}
              isFetchingNextPage={activeQuery.isFetchingNextPage}
              loadingLabel={
                labResultsView === 'timeSeries'
                  ? 'Loading more lab results...'
                  : 'Loading more patient results...'
              }
              errorMessage={
                activeRows.length > 0 && activeQuery.isError
                  ? getErrorMessage(activeQuery.error)
                  : null
              }
              onRetry={loadNextPage}
            />
          }
        />
        {showScrollToTop ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scroll lab results to top"
            onPress={handleScrollToTop}
            style={styles.scrollTopButton}
          >
            <Text style={styles.scrollTopButtonText}>Top</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function isGroupedDisplayRow(row: DisplayRow): row is GroupedLabResultsRow {
  return 'kind' in row;
}

function getDisplayRowKey(row: DisplayRow) {
  if (isGroupedDisplayRow(row)) {
    return row.kind === 'patient'
      ? `patient:${row.patient.id}`
      : `lab-result:${row.patient.id}:${row.labResult.id}`;
  }

  return `time-series:${row.id}`;
}

function StatPill({ label, value }: { label: string; value?: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value ?? '-'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TimeSeriesLabResultCard({ row }: { row: TimeSeriesLabResultRow }) {
  return (
    <View style={styles.card}>
      <LabResultCardHeader
        date={row.date}
        patient={row.patient}
        meta={row.patient.birthdate}
        showPatientId
      />
      <LabValueGrid labResult={row} />
    </View>
  );
}

function PatientGroupRow({ row }: { row: Extract<GroupedLabResultsRow, { kind: 'patient' }> }) {
  return (
    <View style={styles.patientGroup}>
      <View style={styles.patientGroupContent}>
        <Text style={styles.patientGroupTitle}>Patient</Text>
        <Text selectable style={styles.patientGroupId}>
          {row.patient.id}
        </Text>
        <Text style={styles.patientGroupMeta}>
          Born {row.patient.birthdate} - Gender {row.patient.gender} - Ethnicity{' '}
          {row.patient.ethnicity}
        </Text>
      </View>
      <View style={styles.patientGroupCount}>
        <Text style={styles.patientGroupCountValue}>{row.labResultCount}</Text>
        <Text style={styles.patientGroupCountLabel}>results</Text>
      </View>
    </View>
  );
}

function GroupedLabResultRowCard({
  row
}: {
  row: Extract<GroupedLabResultsRow, { kind: 'labResult' }>;
}) {
  return (
    <View style={[styles.card, styles.groupedLabResultCard]}>
      <LabResultCardHeader date={row.labResult.date} patient={row.patient} />
      <LabValueGrid labResult={row.labResult} />
    </View>
  );
}

function LabResultCardHeader({
  date,
  meta,
  patient,
  showPatientId = false
}: {
  date: string;
  meta?: string;
  patient: TimeSeriesLabResultRow['patient'];
  showPatientId?: boolean;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderMain}>
        <Text style={styles.cardDate}>{date}</Text>
        {showPatientId ? (
          <Text selectable style={styles.cardPatientId}>
            Patient ID {patient.id}
          </Text>
        ) : null}
        {showPatientId ? (
          <Text style={styles.cardMeta}>
            {meta ? `Born ${meta} - ` : ''}Gender {patient.gender} - Ethnicity {patient.ethnicity}
          </Text>
        ) : meta ? (
          <Text style={styles.cardMeta}>{meta}</Text>
        ) : null}
      </View>
    </View>
  );
}

function LabValueGrid({ labResult }: { labResult: LabResult }) {
  const values = [
    {
      label: 'Creatine',
      value: labResult.creatine,
      unit: labResult.creatineUnit,
      range: LAB_VALUE_REFERENCE_RANGES.creatine
    },
    {
      label: 'Chloride',
      value: labResult.chloride,
      unit: labResult.chlorideUnit,
      range: LAB_VALUE_REFERENCE_RANGES.chloride
    },
    {
      label: 'Glucose',
      value: labResult.fastingGlucose,
      unit: labResult.fastingGlucoseUnit,
      range: LAB_VALUE_REFERENCE_RANGES.fastingGlucose
    },
    {
      label: 'Potassium',
      value: labResult.potassium,
      unit: labResult.potassiumUnit,
      range: LAB_VALUE_REFERENCE_RANGES.potassium
    },
    {
      label: 'Sodium',
      value: labResult.sodium,
      unit: labResult.sodiumUnit,
      range: LAB_VALUE_REFERENCE_RANGES.sodium
    },
    {
      label: 'Calcium',
      value: labResult.totalCalcium,
      unit: labResult.totalCalciumUnit,
      range: LAB_VALUE_REFERENCE_RANGES.totalCalcium
    },
    {
      label: 'Protein',
      value: labResult.totalProtein,
      unit: labResult.totalProteinUnit,
      range: LAB_VALUE_REFERENCE_RANGES.totalProtein
    }
  ];

  return (
    <View style={styles.valueGrid}>
      {values.map((item) => (
        <LabValuePill
          key={item.label}
          label={item.label}
          value={item.value}
          unit={item.unit}
          range={item.range}
        />
      ))}
    </View>
  );
}

function LabValuePill({
  label,
  range,
  unit,
  value
}: {
  label: string;
  range: { min: number; max: number };
  unit: string;
  value: LabValue;
}) {
  const status = getLabValueStatus(value, range);
  const statusStyles =
    status === 'high'
      ? {
          marker: styles.valueStatusHigh,
          text: styles.valueStatusHighText
        }
      : status === 'low'
        ? {
            marker: styles.valueStatusLow,
            text: styles.valueStatusLowText
          }
        : null;

  return (
    <View style={styles.valuePill}>
      <View style={styles.valuePillHeader}>
        <Text style={styles.valueLabel}>{label}</Text>
        {status ? (
          <View style={[styles.valueStatusMarker, statusStyles?.marker]}>
            <Text style={[styles.valueStatusText, statusStyles?.text]}>
              {status === 'high' ? 'High' : 'Low'}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.valueText}>
        {value.toString()} <Text style={styles.valueUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function EmptyState({
  errorMessage,
  isLoading,
  onRetry
}: {
  errorMessage: string | null;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color="#111827" />
        <Text style={styles.emptyStateText}>Loading lab results...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Could not load lab results</Text>
        <Text style={styles.emptyStateText}>{errorMessage}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No lab results found</Text>
      <Text style={styles.emptyStateText}>Pull to refresh or add new data.</Text>
    </View>
  );
}

function ListFooter({
  errorMessage,
  hasNextPage,
  hasRows,
  isFetchingNextPage,
  loadingLabel,
  onRetry
}: {
  errorMessage: string | null;
  hasNextPage: boolean;
  hasRows: boolean;
  isFetchingNextPage: boolean;
  loadingLabel: string;
  onRetry: () => void;
}) {
  if (!hasRows) return null;

  if (isFetchingNextPage) {
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator color="#111827" />
        <Text style={styles.listFooterText}>{loadingLabel}</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.listFooter}>
        <Text style={styles.inlineError}>{errorMessage}</Text>
        {hasNextPage ? (
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return <View style={styles.listEndSpacer} />;
}

function getLabValueStatus(value: LabValue, range: { min: number; max: number }) {
  const numericValue = getLabValueNumber(value);

  if (numericValue === null) return null;
  if (numericValue < range.min) return 'low';
  if (numericValue > range.max) return 'high';

  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f6f8'
  },
  header: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8
  },
  titleRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  titleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  eyebrow: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6
  },
  statPill: {
    minWidth: 58,
    minHeight: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d9dde5',
    borderRadius: 7,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8
  },
  statValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0
  },
  statLabel: {
    color: '#667085',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d9dde5',
    borderRadius: 7,
    backgroundColor: '#e9edf2',
    padding: 2
  },
  segmentButton: {
    flex: 1,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5
  },
  segmentButtonSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  segmentText: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  segmentTextSelected: {
    color: '#111827'
  },
  actionsPanel: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#e1e5ec',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 8
  },
  patientPickerRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  panelLabel: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0
  },
  patientOptionsScroll: {
    flex: 1
  },
  patientOptions: {
    gap: 6,
    paddingRight: 2
  },
  patientOption: {
    minWidth: 44,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d9dde5',
    borderRadius: 7,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10
  },
  patientOptionSelected: {
    borderColor: '#111827',
    backgroundColor: '#111827'
  },
  patientOptionText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  patientOptionTextSelected: {
    color: '#ffffff'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8
  },
  primaryButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#111827',
    paddingHorizontal: 12
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  secondaryButton: {
    minWidth: 76,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f6b4b4',
    borderRadius: 7,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12
  },
  secondaryButtonText: {
    color: '#b42318',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  disabledButton: {
    opacity: 0.55
  },
  listContainer: {
    flex: 1
  },
  listContent: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 28
  },
  emptyListContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 28
  },
  card: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#d7dde6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 10
  },
  groupedLabResultCard: {
    marginLeft: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8
  },
  cardHeaderMain: {
    flex: 1
  },
  cardDate: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0
  },
  cardMeta: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 15,
    marginTop: 1
  },
  cardPatientId: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 15,
    marginTop: 1
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  valuePill: {
    width: '49%',
    minHeight: 50,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#edf0f5',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  valuePillHeader: {
    minHeight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4
  },
  valueLabel: {
    flexShrink: 1,
    color: '#667085',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0
  },
  valueStatusMarker: {
    minWidth: 34,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  valueStatusHigh: {
    backgroundColor: '#ffedd5'
  },
  valueStatusLow: {
    backgroundColor: '#dbeafe'
  },
  valueStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0
  },
  valueStatusHighText: {
    color: '#c2410c'
  },
  valueStatusLowText: {
    color: '#1d4ed8'
  },
  valueText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0
  },
  valueUnit: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '600'
  },
  patientGroup: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#e8eef7',
    padding: 12
  },
  patientGroupContent: {
    flex: 1
  },
  patientGroupTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0
  },
  patientGroupId: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 17,
    marginTop: 2
  },
  patientGroupMeta: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    marginTop: 3
  },
  patientGroupCount: {
    minWidth: 62,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  patientGroupCountValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0
  },
  patientGroupCountLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24
  },
  emptyStateTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center'
  },
  emptyStateText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center'
  },
  retryButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 14
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  listFooter: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  listFooterText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  listEndSpacer: {
    height: 88
  },
  scrollTopButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    minWidth: 64,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  scrollTopButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0
  },
  inlineError: {
    color: '#b42318',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 17
  }
});
