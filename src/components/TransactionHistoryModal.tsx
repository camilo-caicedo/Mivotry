import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import {
  Receipt,
  X,
  RefreshCw,
  Search,
  Clock,
  Wallet,
  CreditCard,
  Building2,
  Tag,
  AlertCircle,
  ArrowDownLeft,
  Filter
} from 'lucide-react-native';
import { CONFIG } from '../config';
import { MivotryAPI, LogItem } from '../services/api';

export interface TransactionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

type FilterType = 'Todos' | 'Nómina' | 'Bonos' | 'Tarjetas de Crédito';

const formatCOP = (num: number = 0) => {
  return '$ ' + Math.round(num).toLocaleString('es-CO');
};

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  visible,
  onClose
}) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await MivotryAPI.getHistorialLogs(100);
      if (res && res.success) {
        setLogs(res.logs || []);
      } else {
        setError('No se pudo cargar el historial');
      }
    } catch (err: any) {
      console.error('Error al obtener historial:', err);
      setError(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchLogs();
      setSearchQuery('');
      setSelectedFilter('Todos');
    }
  }, [visible]);

  // Contadores para las píldoras de filtro
  const filterCounts = useMemo(() => {
    let nomina = 0;
    let bonos = 0;
    let tc = 0;

    logs.forEach((item) => {
      const cuenta = (item.cuenta || '').toLowerCase();
      const cat = (item.categoria || '').toLowerCase();

      if (cuenta.includes('nomina')) nomina++;
      if (cuenta.includes('bono')) bonos++;
      if (
        cuenta.includes('tarjeta') ||
        cuenta.includes('credito') ||
        cat.includes('tarjeta')
      ) {
        tc++;
      }
    });

    return {
      Todos: logs.length,
      Nómina: nomina,
      Bonos: bonos,
      'Tarjetas de Crédito': tc
    };
  }, [logs]);

  // Filtrado reactivo en tiempo real
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // 1. Filtro por píldora de cuenta
      if (selectedFilter === 'Nómina') {
        const cuenta = (item.cuenta || '').toLowerCase();
        if (!cuenta.includes('nomina')) return false;
      } else if (selectedFilter === 'Bonos') {
        const cuenta = (item.cuenta || '').toLowerCase();
        if (!cuenta.includes('bono')) return false;
      } else if (selectedFilter === 'Tarjetas de Crédito') {
        const cuenta = (item.cuenta || '').toLowerCase();
        const cat = (item.categoria || '').toLowerCase();
        if (
          !cuenta.includes('tarjeta') &&
          !cuenta.includes('credito') &&
          !cat.includes('tarjeta')
        ) {
          return false;
        }
      }

      // 2. Búsqueda en tiempo real por concepto, categoría o comercio
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const concepto = (item.concepto || '').toLowerCase();
        const categoria = (item.categoria || '').toLowerCase();
        const cuenta = (item.cuenta || '').toLowerCase();
        const origen = (item.origen || '').toLowerCase();

        return (
          concepto.includes(query) ||
          categoria.includes(query) ||
          cuenta.includes(query) ||
          origen.includes(query)
        );
      }

      return true;
    });
  }, [logs, selectedFilter, searchQuery]);

  // Monto acumulado de los movimientos filtrados
  const totalMontoFiltrado = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + (curr.monto || 0), 0);
  }, [filteredLogs]);

  // Badge para origen
  const renderOriginBadge = (origen: string) => {
    const o = (origen || '').toLowerCase();
    let label = origen || 'App';
    let color = '#94A3B8';
    let bg = 'rgba(148, 163, 184, 0.12)';

    if (o.includes('notificacion_tc')) {
      label = 'TC SMS';
      color = '#F59E0B';
      bg = 'rgba(245, 158, 11, 0.15)';
    } else if (o.includes('pago_tc')) {
      label = 'Abono TC';
      color = '#38BDF8';
      bg = 'rgba(56, 189, 248, 0.15)';
    } else if (o.includes('notificacion') || o.includes('sms')) {
      label = 'SMS Aprobado';
      color = '#10B981';
      bg = 'rgba(16, 185, 129, 0.15)';
    } else if (o.includes('sistema') || o.includes('rollover')) {
      label = 'Sistema';
      color = '#A855F7';
      bg = 'rgba(168, 85, 247, 0.15)';
    } else if (o.includes('manual')) {
      label = 'Manual';
      color = '#94A3B8';
      bg = 'rgba(148, 163, 184, 0.15)';
    } else if (o.includes('app')) {
      label = 'App';
      color = '#38BDF8';
      bg = 'rgba(56, 189, 248, 0.15)';
    }

    return (
      <View style={[styles.originBadge, { backgroundColor: bg, borderColor: color }]}>
        <Text style={[styles.originBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  // Badge para cuenta
  const renderAccountBadge = (cuenta: string) => {
    const c = (cuenta || '').toLowerCase();
    let label = 'Nómina';
    let color = '#10B981';
    let bg = 'rgba(16, 185, 129, 0.12)';
    let IconComponent = Building2;

    if (c.includes('bono')) {
      label = 'Bonos';
      color = '#F59E0B';
      bg = 'rgba(245, 158, 11, 0.12)';
      IconComponent = Wallet;
    } else if (c.includes('tarjeta') || c.includes('credito')) {
      label = 'TC';
      color = '#38BDF8';
      bg = 'rgba(56, 189, 248, 0.12)';
      IconComponent = CreditCard;
    }

    return (
      <View style={[styles.accountBadge, { backgroundColor: bg }]}>
        <IconComponent size={11} color={color} style={{ marginRight: 3 }} />
        <Text style={[styles.accountBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: LogItem }) => {
    return (
      <View style={styles.itemCard}>
        {/* Cabecera del Item: Fecha, Hora y Badges */}
        <View style={styles.itemHeader}>
          <View style={styles.dateTimeBox}>
            <Clock size={12} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{item.fecha || 'Sin fecha'}</Text>
            {item.hora ? <Text style={styles.timeText}>{item.hora}</Text> : null}
          </View>
          <View style={styles.headerBadges}>
            {renderAccountBadge(item.cuenta)}
            {renderOriginBadge(item.origen)}
          </View>
        </View>

        {/* Fila Principal: Categoría y Monto */}
        <View style={styles.itemMainRow}>
          <View style={styles.itemLeftCol}>
            {item.categoria ? (
              <View style={styles.categoryBadge}>
                <Tag size={10} color="#34D399" style={{ marginRight: 4 }} />
                <Text style={styles.categoryBadgeText} numberOfLines={1}>
                  {item.categoria}
                </Text>
              </View>
            ) : null}
            <Text style={styles.conceptText} numberOfLines={2}>
              {item.concepto || item.categoria || 'Gasto registrado'}
            </Text>
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountText}>
              {item.monto > 0 ? `-${formatCOP(item.monto)}` : formatCOP(item.monto)}
            </Text>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Saldo:</Text>
              <Text style={styles.balanceValue}>{formatCOP(item.saldoRestante)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const filters: FilterType[] = ['Todos', 'Nómina', 'Bonos', 'Tarjetas de Crédito'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Encabezado */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <View style={styles.headerIconBox}>
                <Receipt size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Historial de Movimientos</Text>
                <Text style={styles.headerSub}>
                  {logs.length} registro{logs.length === 1 ? '' : 's'} en Transacciones_Log
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => fetchLogs(true)}
                disabled={loading || refreshing}
                activeOpacity={0.7}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <RefreshCw size={17} color="#94A3B8" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra de Búsqueda */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={15} color="#64748B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por concepto, comercio o categoría..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtros en Píldoras */}
          <View style={styles.filterPillsRow}>
            {filters.map((filter) => {
              const isActive = selectedFilter === filter;
              const count = filterCounts[filter];
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive
                  ]}
                  onPress={() => setSelectedFilter(filter)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive
                    ]}
                  >
                    {filter}
                  </Text>
                  <View
                    style={[
                      styles.pillCountBadge,
                      isActive && styles.pillCountBadgeActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillCountText,
                        isActive && styles.pillCountTextActive
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Barra de resumen de filtro */}
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Mostrando <Text style={styles.summaryHighlight}>{filteredLogs.length}</Text> movimiento{filteredLogs.length === 1 ? '' : 's'}
            </Text>
            {filteredLogs.length > 0 && totalMontoFiltrado > 0 && (
              <Text style={styles.summaryAmount}>
                Total: <Text style={styles.summaryAmountHighlight}>{formatCOP(totalMontoFiltrado)}</Text>
              </Text>
            )}
          </View>

          {/* Cuerpo: Lista / Loading / Empty State */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Cargando historial de movimientos...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <AlertCircle size={36} color="#EF4444" />
              <Text style={styles.errorTitle}>Error al cargar</Text>
              <Text style={styles.errorDesc}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchLogs(false)}
              >
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : filteredLogs.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                {searchQuery.trim() || selectedFilter !== 'Todos' ? (
                  <Filter size={28} color="#F59E0B" />
                ) : (
                  <Receipt size={28} color="#10B981" />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() || selectedFilter !== 'Todos'
                  ? 'Sin resultados coincidentes'
                  : 'Sin movimientos registrados'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery.trim() || selectedFilter !== 'Todos'
                  ? 'No hay transacciones que coincidan con los filtros o término de búsqueda aplicado.'
                  : 'Los gastos registrados desde la app o aprobados desde las notificaciones bancarias se guardarán en Transacciones_Log.'}
              </Text>
              {(searchQuery.trim().length > 0 || selectedFilter !== 'Todos') && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('Todos');
                  }}
                >
                  <Text style={styles.clearFiltersBtnText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredLogs}
              keyExtractor={(item, index) => item.timestamp || `log_${index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={5}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#0A252C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    height: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800'
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06181D',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 13,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8
  },
  clearSearchBtn: {
    padding: 4
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    flexWrap: 'wrap'
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#06181D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6
  },
  filterPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981'
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  filterPillTextActive: {
    color: '#10B981',
    fontWeight: '700'
  },
  pillCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10
  },
  pillCountBadgeActive: {
    backgroundColor: '#10B981'
  },
  pillCountText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700'
  },
  pillCountTextActive: {
    color: '#06181D',
    fontWeight: '800'
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  summaryText: {
    color: '#64748B',
    fontSize: 11
  },
  summaryHighlight: {
    color: '#F1F5F9',
    fontWeight: '700'
  },
  summaryAmount: {
    color: '#64748B',
    fontSize: 11
  },
  summaryAmountHighlight: {
    color: '#F59E0B',
    fontWeight: '700'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24
  },
  itemCard: {
    backgroundColor: '#0F3741',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    paddingBottom: 6
  },
  dateTimeBox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  timeText: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 6
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  accountBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  originBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5
  },
  originBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  itemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  itemLeftCol: {
    flex: 1
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#06181D',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  categoryBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700'
  },
  conceptText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  amountCol: {
    alignItems: 'flex-end'
  },
  amountText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800'
  },
  balanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4
  },
  balanceLabel: {
    color: '#64748B',
    fontSize: 10
  },
  balanceValue: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700'
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13
  },
  errorTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800'
  },
  errorDesc: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700'
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  emptyTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center'
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16
  },
  clearFiltersBtn: {
    backgroundColor: '#06181D',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  clearFiltersBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700'
  }
});
