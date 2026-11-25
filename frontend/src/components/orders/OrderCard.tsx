import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Order } from '../../types';
import { FONT } from '../../theme/tokens';

const STATUS_COLORS: Record<string, string> = {
  in_attesa: '#FFAE1F',
  in_preparazione: '#00A1FF',
  pronto: '#0E9F80',
  sospeso: '#8965E5',
  consegnato: '#0E9F80',
};

const STATUS_LABELS: Record<string, string> = {
  in_attesa: 'In Attesa',
  in_preparazione: 'In Preparazione',
  pronto: 'Pronto',
  sospeso: 'Sospeso',
  consegnato: 'Consegnato',
};

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onTogglePayment: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress, onTogglePayment }) => {
  return (
    <TouchableOpacity
      style={[
        styles.orderCard,
        { borderLeftColor: STATUS_COLORS[order.status] || '#98A4B8' }
      ]}
      onPress={() => onPress(order)}
      data-testid={`order-card-${order.orderNumber}`}
    >
      <View style={styles.orderCardHeader}>
        <View style={styles.orderNumberContainer}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[order.status]}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>
          {order.customerName || 'Anonimo'}
        </Text>
      </View>
      <View style={styles.orderCardBody}>
        <Text style={styles.orderItems}>
          {order.items.length} piatt{order.items.length === 1 ? 'o' : 'i'}
        </Text>
      </View>
      <View style={styles.orderCardFooter}>
        <Text style={styles.orderTotal}>{order.total.toFixed(2)} €</Text>
        <View style={styles.orderFooterRight}>
          <TouchableOpacity 
            style={[
              styles.paymentToggle,
              order.isPaid ? styles.paymentTogglePaid : styles.paymentToggleUnpaid
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onTogglePayment(order);
            }}
            data-testid={`payment-toggle-${order.orderNumber}`}
          >
            <Ionicons 
              name="card" 
              size={14} 
              color={order.isPaid ? "#0E9F80" : "#00A1FF"} 
            />
          </TouchableOpacity>
          <Text style={styles.orderTime}>
            {format(new Date(order.createdAt), 'HH:mm')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: FONT,
    color: '#2A3547',
    fontSize: 11,
    fontWeight: '600',
  },
  customerName: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 14,
  },
  orderCardBody: {
    marginBottom: 8,
  },
  orderItems: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 13,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontFamily: FONT,
    color: '#0E9F80',
    fontSize: 18,
    fontWeight: '700',
  },
  orderFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTogglePaid: {
    backgroundColor: '#E1F7F1',
  },
  paymentToggleUnpaid: {
    backgroundColor: '#FDECEC',
  },
  orderTime: {
    fontFamily: FONT,
    color: '#5A6A85',
    fontSize: 13,
  },
});

export default OrderCard;
