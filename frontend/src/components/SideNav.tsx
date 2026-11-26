import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { PressableScale } from './motion/PressableScale';
import { Appear } from './motion/Appear';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { C, FONT, R } from '../theme/tokens';
import { SIDEBAR_RAIL, SIDEBAR_W } from '../theme/layout';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, string> = { index: 'receipt', menu: 'restaurant', dishes: 'fast-food', customers: 'people', reports: 'bar-chart' };

// Menu laterale in stile MaterialM: aperto con le etichette o chiuso con le sole icone
export const SideNav = ({ state, descriptors, emitter, navigateToTab }: TabBarProps) => {
  const tenantName = useAuthStore((s) => s.user?.tenant_name || s.user?.name || '');
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const w = useSharedValue(collapsed ? SIDEBAR_RAIL : SIDEBAR_W);
  useEffect(() => {
    w.set(withTiming(collapsed ? SIDEBAR_RAIL : SIDEBAR_W, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [collapsed, w]);
  const navStyle = useAnimatedStyle(() => ({ width: w.value }));

  return (
    <Animated.View style={[styles.nav, collapsed && styles.navRail, navStyle]} testID="side-nav">
      <View style={[styles.brand, collapsed && styles.brandRail]}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" testID="side-nav-logo" />
        {!collapsed && (
          <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
            <Text style={styles.brandName} numberOfLines={1}>Bancomanda</Text>
            {!!tenantName && <Text style={styles.tenant} numberOfLines={1} testID="side-nav-tenant">{tenantName}</Text>}
          </Animated.View>
        )}
      </View>
      <PressableScale onPress={toggle} testID="side-nav-toggle" accessibilityLabel={collapsed ? 'Apri menu' : 'Chiudi menu'}
        containerStyle={collapsed ? styles.toggleWrapRail : styles.toggleWrap}
        style={({ hovered }: any) => [styles.toggle, hovered && styles.itemHover]}>
        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={18} color={C.text2} />
        {!collapsed && <Text style={styles.toggleText}>Riduci menu</Text>}
      </PressableScale>
      {!collapsed && <Text style={styles.section}>Gestione</Text>}
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const focused = state.index === i;
        const badge = options.tabBarBadge;
        const title = String(options.title ?? route.name);
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
              accessibilityLabel={title}
              accessibilityState={{ selected: focused }}
              style={({ hovered }: any) => [styles.item, collapsed && styles.itemRail, hovered && !focused && styles.itemHover, focused && styles.itemActive]}
            >
              <Ionicons name={(focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`) as any} size={collapsed ? 23 : 21} color={focused ? C.primary : C.text2} />
              {!collapsed && <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>{title}</Text>}
              {badge != null && (
                <View style={[styles.badge, collapsed && styles.badgeRail]} testID={`side-nav-badge-${route.name}`}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </PressableScale>
          </Appear>
        );
      })}
      <View style={{ flex: 1 }} />
      {collapsed && !!tenantName && (
        <View style={styles.avatar} testID="side-nav-avatar" accessibilityLabel={tenantName}>
          <Text style={styles.avatarText}>{tenantName.trim().charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  nav: { backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.border, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, overflow: 'hidden' },
  navRail: { paddingHorizontal: 12, alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 14 },
  brandRail: { paddingHorizontal: 0, justifyContent: 'center' },
  logo: { width: 40, height: 40, borderRadius: 11 },
  brandName: { fontFamily: FONT, fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  tenant: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  toggleWrap: { marginBottom: 16 },
  toggleWrapRail: { marginBottom: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, minWidth: 44, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.sunken, justifyContent: 'center', alignSelf: 'flex-start' },
  toggleText: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.text2 },
  section: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: C.text, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 12, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, paddingHorizontal: 16, borderRadius: R.pill, marginBottom: 4 },
  itemRail: { width: 52, height: 52, paddingHorizontal: 0, justifyContent: 'center', borderRadius: 26, marginBottom: 8 },
  itemHover: { backgroundColor: C.hover },
  itemActive: { backgroundColor: C.primarySoft },
  label: { fontFamily: FONT, flex: 1, fontSize: 15, fontWeight: '600', color: C.text2 },
  labelActive: { color: C.primary, fontWeight: '800' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeRail: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, borderWidth: 2, borderColor: C.surface },
  badgeText: { fontFamily: FONT, color: '#fff', fontSize: 11, fontWeight: '800' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: C.primary },
});
