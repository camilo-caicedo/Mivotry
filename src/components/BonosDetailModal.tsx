import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  X,
  CreditCard,
  Gift,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import { GastoItem } from '../services/api';
import {
  BudgetProgressBar,
  formatCOP,
  getBudgetColor,
} from './BudgetProgressBar';
import { getBonoCategoryConfig } from './BonosDashboardWidget';

export interface BonosDetailModalProps {
  visible: boolean;
  onClose: () => void;
  bonosData?: {
    presupuestoTotal: number;
    gastos: GastoItem[];
  };
  onPressCategory?: (gasto: GastoItem) => void;
  onRechargePress?: () => void;
  onQuickExpensePress?: () => void;
}

/** Categorías base por defecto si aún no han cargado los datos del backend */
const DEFAULT_BONOS_CATEGORIES: GastoItem[] = [
  { fila: 10, nombre: 'Pricesmart', presupuestoTotal: 700000, manejoActual: 700000 },
  { fila: 11, nombre: 'Verduras y demás', presupuestoTotal: 200000, manejoActual: 200000 },
  { fila: 12, nombre: 'Gatos', presupuestoTotal: 200000, manejoActual: 200000 },
  { fila: 13, nombre: 'Salidas 1', presupuestoTotal: 250000, manejoActual: 250000 },
];

export const BonosDetailModal: React.FC<BonosDetailModalProps> = ({
  visible,
  onClose,
  bonosData,
  onPressCategory,
  onRechargePress,
  onQuickExpensePress,
}) => {
  const rawCategories: GastoItem[] =
    bonosData?.gastos && bonosData.gastos.length > 0
      ? bonosData.gastos
      : DEFAULT_BONOS_CATEGORIES;

  // Filtrar el encabezado 'Bonos' (fila 23) para listar y calcular únicamente los rubros individuales
  const categories: GastoItem[] = rawCategories.filter(
    item => (item.nombre || '').trim().toLowerCase() !== 'bonos' && item.fila !== 23
  );

  const presupuestoTotal =
    bonosData?.presupuestoTotal && bonosData.presupuestoTotal > 0
      ? bonosData.presupuestoTotal
      : 1600000;

  const totalDisponible = categories.reduce(
    (sum, item) => sum + (item.manejoActual ?? 0),
    0
  );

  const pctDisponible =
    presupuestoTotal > 0
      ? Math.max(0, Math.min(100, (totalDisponible / presupuestoTotal) * 100))
      : 0;

  const globalColor = getBudgetColor(totalDisponible, presupuestoTotal);
  const isGlobalOverspent = totalDisponible < 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* BARRA SUPERIOR DE ARRASTRE */}
          <View style={styles.handleBar} />

          {/* HEADER DEL MODAL */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <View style={styles.headerIconBox}>
                <CreditCard size={20} color="#A78BFA" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Tarjeta de Bonos / Alimentación</Text>
                <Text style={styles.headerSubtitle}>Sodexo • Pluxee (Cupo mensual)</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* CONTENIDO SCROLLEABLE */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TARJETA RESUMEN DE SALDO TOTAL */}
            <View style={styles.balanceSummaryCard}>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceLabel}>Saldo Total Disponible</Text>
                <View style={styles.statusIndicator}>
                  <View
                    style={[styles.statusDot, { backgroundColor: globalColor }]}
                  />
                  <Text style={[styles.statusText, { color: globalColor }]}>
                    {isGlobalOverspent
                      ? 'Sobregirado'
                      : `${Math.round(pctDisponible)}% libre`}
                  </Text>
                </View>
              </View>

              <View style={styles.balanceAmountRow}>
                <Text style={styles.balanceBig}>{formatCOP(totalDisponible)}</Text>
                <View style={styles.budgetChip}>
                  <Text style={styles.budgetChipSub}>Cupo mensual</Text>
                  <Text style={styles.budgetChipVal}>
                    {formatCOP(presupuestoTotal)}
                  </Text>
                </View>
              </View>

              <View style={styles.globalProgressWrapper}>
                <BudgetProgressBar
                  disponible={totalDisponible}
                  presupuesto={presupuestoTotal}
                  size="medium"
                  showLabel={true}
                  customLabel={`Cupo global: ${formatCOP(totalDisponible)}`}
                />
              </View>
            </View>

            {/* SECCIÓN DESGLOSE DE CATEGORÍAS */}
            <View style={styles.breakdownHeader}>
              <View style={styles.breakdownTitleRow}>
                <Sparkles size={15} color="#A78BFA" />
                <Text style={styles.breakdownTitle}>Desglose de Categorías</Text>
              </View>
              <Text style={styles.breakdownSubtitle}>
                {categories.length} rubros activos
              </Text>
            </View>

            <View style={styles.categoryList}>
              {categories.map((item, index) => {
                const config = getBonoCategoryConfig(item.nombre);
                const categoryBalance = item.manejoActual ?? 0;
                const categoryBudget = item.presupuestoTotal ?? 0;
                const itemColor = getBudgetColor(categoryBalance, categoryBudget);
                const isOver = categoryBalance < 0;

                const pctCategory =
                  categoryBudget > 0
                    ? Math.max(
                        0,
                        Math.min(100, (categoryBalance / categoryBudget) * 100)
                      )
                    : 0;

                return (
                  <TouchableOpacity
                    key={`bono-cat-${item.fila ?? index}-${item.nombre}`}
                    activeOpacity={0.75}
                    onPress={() => onPressCategory && onPressCategory(item)}
                    style={styles.categoryCard}
                  >
                    {/* Fila superior: Emoji + Info + Monto */}
                    <View style={styles.categoryTopRow}>
                      <View style={styles.categoryLeft}>
                        <View
                          style={[
                            styles.categoryIconBox,
                            {
                              backgroundColor: config.bgIconColor,
                              borderColor: `${config.accentColor}33`,
                            },
                          ]}
                        >
                          <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName} numberOfLines={1}>
                            {item.nombre}
                          </Text>
                          <Text style={styles.categoryBudget}>
                            Presupuesto: {formatCOP(categoryBudget)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.categoryRight}>
                        <Text style={[styles.categoryBalance, { color: itemColor }]}>
                          {formatCOP(categoryBalance)}
                        </Text>
                        <View style={styles.categoryBadgeRow}>
                          {isOver ? (
                            <View style={styles.overspentPill}>
                              <AlertTriangle size={10} color="#DC2626" />
                              <Text style={styles.overspentPillText}>Excedido</Text>
                            </View>
                          ) : (
                            <Text style={styles.categoryPctText}>
                              {Math.round(pctCategory)}% disp.
                            </Text>
                          )}
                          <ChevronRight size={14} color="#64748B" />
                        </View>
                      </View>
                    </View>

                    {/* Barra de progreso de la categoría */}
                    <View style={styles.categoryProgressBarWrapper}>
                      <BudgetProgressBar
                        disponible={categoryBalance}
                        presupuesto={categoryBudget}
                        size="small"
                        showLabel={false}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TIP INFORMATIVO */}
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 Toca cualquier rubro para registrar un gasto directo con tarjeta de bonos Sodexo / Pluxee.
              </Text>
            </View>
          </ScrollView>

          {/* BOTONES DE ACCIÓN FIJOS EN EL FOOTER */}
          <View style={styles.footerActions}>
            {onRechargePress && (
              <TouchableOpacity
                style={styles.rechargeBtn}
                onPress={onRechargePress}
                activeOpacity={0.8}
              >
                <RefreshCw size={15} color="#A78BFA" />
                <Text style={styles.rechargeBtnText}>Recargar Bonos</Text>
              </TouchableOpacity>
            )}

            {onQuickExpensePress && (
              <TouchableOpacity
                style={styles.expenseBtn}
                onPress={onQuickExpensePress}
                activeOpacity={0.8}
              >
                <PlusCircle size={15} color="#10B981" />
                <Text style={styles.expenseBtnText}>Registrar Gasto de Bono</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#0A252C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  balanceSummaryCard: {
    backgroundColor: '#06181D',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0F3741',
    marginBottom: 18,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  balanceBig: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  budgetChip: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(15, 55, 65, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F3741',
  },
  budgetChipSub: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  budgetChipVal: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  globalProgressWrapper: {
    marginTop: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  breakdownSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  categoryList: {
    gap: 10,
    marginBottom: 14,
  },
  categoryCard: {
    backgroundColor: '#06181D',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0F3741',
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryBudget: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryBalance: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryPctText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  overspentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  overspentPillText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '700',
  },
  categoryProgressBarWrapper: {
    marginTop: 2,
  },
  tipBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    marginBottom: 6,
  },
  tipText: {
    color: '#C4B5FD',
    fontSize: 11,
    lineHeight: 16,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0A252C',
  },
  rechargeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  rechargeBtnText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  expenseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  expenseBtnText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default BonosDetailModal;
