import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './motion/PressableScale';
import { Appear } from './motion/Appear';
import { useAuthStore } from '../store/authStore';
import { C, FONT, R } from '../theme/tokens';
import { SIDEBAR_W } from '../theme/layout';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, string> = { index: 'receipt', menu: 'restaurant', dishes: 'fast-food', customers: 'people', reports: 'bar-chart' };

// Menu laterale in stile MaterialM (tablet orizzontale e computer)
export const SideNav = ({ state, descriptors, emitter, navigateToTab }: TabBarProps) => {
  const tenantName = useAuthStore((s) => s.user?.tenant_name || s.user?.name || '');
  return (
    <View style={styles.nav} testID="side-nav">
      <Appear from="above" style={styles.brand}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName}>Bancomanda</Text>
          {!!tenantName && <Text style={styles.tenant} numberOfLines={1}>{tenantName}</Text>}
        </View>
      </Appear>
      <Text style={styles.section}>Gestione</Text>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const focused = state.index === i;
        const badge = options.tabBarBadge;
        const onPress = () => {
          const ev = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !ev.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <Appear key={route.key} index={i + 1}>
            <PressableScale
              scaleTo={0.97}
              onPress={onPress}
              testID={options.tabBarButtonTestID}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={({ hovered }: any) => [styles.item, hovered && !focused && styles.itemHover, focused && styles.itemActive]}
            >
              <Ionicons name={(focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`) as any} size={21} color={focused ? C.primary : C.text2} />
              <Text style={[styles.label, focused && styles.labelActive]}>{String(options.title ?? route.name)}</Text>
              {badge != null && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
            </PressableScale>
          </Appear>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  nav: { width: SIDEBAR_W, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.border, paddingHorizontal: 16, paddingTop: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 28 },
  logo: { width: 40, height: 40, borderRadius: 11 },
  brandName: { fontFamily: FONT, fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  tenant: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  section: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: C.text, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, paddingHorizontal: 16, borderRadius: R.pill, marginBottom: 4 },
  itemHover: { backgroundColor: C.hover },
  itemActive: { backgroundColor: C.primarySoft },
  label: { fontFamily: FONT, flex: 1, fontSize: 15, fontWeight: '600', color: C.text2 },
  labelActive: { color: C.primary, fontWeight: '800' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: FONT, color: '#fff', fontSize: 11, fontWeight: '800' },
});
