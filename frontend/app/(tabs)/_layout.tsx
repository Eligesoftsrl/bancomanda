import { Tabs } from 'expo-router';
import { TabIcon } from '../../src/components/TabIcon';
import { C, FONT } from '../../src/theme/tokens';
import React, { useEffect, useState, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { kitchenApi } from '../../src/services/api';
import { useAppStore } from '../../src/store/appStore';

export default function TabLayout() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [pendingKitchen, setPendingKitchen] = useState(0);
  const intervalRef = useRef<any>(null);

  const refreshCount = async () => {
    // Il contatore riflette il giorno CORRENTE reale (non selectedDate scelta dall'utente),
    // perché la Cucina lavora sul giorno attuale.
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const groups = await kitchenApi.getForDate(today);
      const total = groups.reduce((sum, g) => sum + g.pendingQuantity, 0);
      setPendingKitchen(total);
    } catch {
      // fallisce silenziosamente
    }
  };

  useEffect(() => {
    refreshCount();
    // poll ogni 15s
    intervalRef.current = setInterval(refreshCount, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh anche quando cambia la data selezionata (l'utente potrebbe aver modificato ordini di oggi)
  useEffect(() => {
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.text2,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ordini',
          tabBarIcon: ({ focused }) => <TabIcon name="receipt" focused={focused} />,
          tabBarButtonTestID: 'tab-bar-orders',
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ focused }) => <TabIcon name="restaurant" focused={focused} />,
          tabBarButtonTestID: 'tab-bar-menu',
        }}
      />
      <Tabs.Screen
        name="dishes"
        options={{
          title: 'Piatti',
          tabBarIcon: ({ focused }) => <TabIcon name="fast-food" focused={focused} />,
          tabBarButtonTestID: 'tab-bar-dishes',
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Clienti',
          tabBarIcon: ({ focused }) => <TabIcon name="people" focused={focused} />,
          tabBarButtonTestID: 'tab-bar-customers',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Report',
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" focused={focused} />,
          tabBarButtonTestID: 'tab-bar-reports',
          tabBarBadge: pendingKitchen > 0 ? pendingKitchen : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 90 : 74,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  tabLabel: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    fontFamily: FONT,
    backgroundColor: C.brand,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 20,
    height: 20,
    lineHeight: 20,
    borderRadius: 10,
  },
});
