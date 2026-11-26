import { useWindowDimensions } from 'react-native';
import { useUiStore } from '../store/uiStore';

export const SIDEBAR_W = 248;
export const SIDEBAR_RAIL = 80;

// Menu laterale su tablet in orizzontale e computer; barra in basso su telefono e tablet in verticale
export const useWideLayout = () => {
  const { width, height } = useWindowDimensions();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const wide = width >= 1024 && width >= height;
  const navW = collapsed ? SIDEBAR_RAIL : SIDEBAR_W;
  return { wide, collapsed, navW, contentWidth: wide ? width - navW : width };
};
