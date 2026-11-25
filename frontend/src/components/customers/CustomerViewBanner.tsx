import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appear } from '../motion/Appear';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R } from '../../theme/tokens';

type Props = { view: 'inactive' | 'archived'; count: number; onArchiveAll: () => void };

export const CustomerViewBanner = ({ view, count, onArchiveAll }: Props) => {
  const inactive = view === 'inactive';
  return (
    <Appear style={[styles.box, inactive ? styles.boxWarn : styles.boxInfo]} testID={`customers-${view}-banner`}>
      <View style={[styles.icon, { backgroundColor: inactive ? C.warning : C.muted }]}>
        <Ionicons name={inactive ? 'hourglass-outline' : 'archive-outline'} size={20} color="#fff" />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>
          {inactive ? `${count} ${count === 1 ? 'cliente' : 'clienti'} senza ordini da 6 mesi` : `${count} ${count === 1 ? 'cliente archiviato' : 'clienti archiviati'}`}
        </Text>
        <Text style={styles.sub}>
          {inactive
            ? 'Archiviandoli spariscono dalla lista e dalla scelta cliente negli ordini. I loro ordini restano.'
            : 'Non compaiono nella scelta cliente degli ordini. Tocca Ripristina per riattivarne uno.'}
        </Text>
      </View>
      {inactive && count > 0 && (
        <PressableScale style={styles.btn} onPress={onArchiveAll} testID="customers-archive-all-button">
          <Ionicons name="archive-outline" size={17} color="#fff" />
          <Text style={styles.btnText}>Archivia tutti</Text>
        </PressableScale>
      )}
    </Appear>
  );
};

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, padding: 16, borderRadius: R.lg, marginBottom: 14 },
  boxWarn: { backgroundColor: C.warningSoft },
  boxInfo: { backgroundColor: C.sunken },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 200 },
  title: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontFamily: FONT, fontSize: 13, color: C.text2, marginTop: 2, lineHeight: 19 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 18, borderRadius: R.pill, backgroundColor: C.warningFg },
  btnText: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: '#fff' },
});
