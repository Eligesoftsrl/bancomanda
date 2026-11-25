import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, ScrollViewProps } from 'react-native';

// Riga di pulsanti scorrevole: su computer la rotellina del mouse scorre in orizzontale e la barra resta visibile
export const ChipScroller = ({ children, ...props }: ScrollViewProps) => {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = (ref.current as any)?.getScrollableNode?.() as HTMLElement | undefined;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // alcuni browser misurano in righe
      if (Math.abs(dy) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0 && dy < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && dy > 0;
      if (atStart || atEnd) return; // ai bordi lascia scorrere la pagina
      el.scrollLeft += dy;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'} {...props}>
      {children}
    </ScrollView>
  );
};
