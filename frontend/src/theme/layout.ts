import { useWindowDimensions } from 'react-native';

export const SIDEBAR_W = 248;

// Menu laterale su tablet in orizzontale e computer; barra in basso su telefono e tablet in verticale
export const useWideLayout = () => {
  const { width, height } = useWindowDimensions();
  const wide = width >= 1024 && width >= height;
  return { wide, contentWidth: wide ? width - SIDEBAR_W : width };
};
