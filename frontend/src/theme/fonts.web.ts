import { Asset } from 'expo-asset';

// Plus Jakarta Sans servito dall'app stessa (niente Google Fonts esterni: GDPR)
const FACES: [number, number][] = [
  [400, require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf')],
  [500, require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf')],
  [600, require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf')],
  [700, require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf')],
  [800, require('@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf')],
];

export const installFonts = () => {
  if (typeof document === 'undefined' || document.getElementById('bm-fonts')) return;
  const css = FACES.map(([weight, mod]) =>
    `@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:${weight};font-display:swap;src:url("${Asset.fromModule(mod).uri}") format("truetype");}`
  ).join('\n');
  const el = document.createElement('style');
  el.id = 'bm-fonts';
  el.textContent = css;
  document.head.appendChild(el);
};
