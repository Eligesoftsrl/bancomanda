import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Appear } from '../motion/Appear';
import { C, FONT } from '../../theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
};

export const PageHeader = ({ title, subtitle, right, children, testID }: Props) => {
  const compact = useWindowDimensions().width < 768;
  return (
    <View style={[styles.header, compact && styles.headerCompact]} testID={testID}>
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Appear from="above" style={styles.titles}>
          <Text style={[styles.title, compact && styles.titleCompact]} testID="page-title">{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </Appear>
        {right && <Appear from="above" index={1} style={[styles.right, compact && styles.rightCompact]}>{right}</Appear>}
      </View>
      {children && <Appear from="above" index={2} style={styles.below}>{children}</Appear>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 24, paddingVertical: 14, gap: 12 },
  headerCompact: { paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  rowCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  titles: { flexShrink: 1, minWidth: 180 },
  title: { fontFamily: FONT, fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  titleCompact: { fontSize: 20 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  rightCompact: { justifyContent: 'flex-start' },
  below: { alignItems: 'stretch' },
});
