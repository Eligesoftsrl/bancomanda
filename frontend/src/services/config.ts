// Su Vercel (EXPO_PUBLIC_SAME_ORIGIN_API=1) le API passano dallo stesso dominio: bancomanda.com/api
export const API_URL = process.env.EXPO_PUBLIC_SAME_ORIGIN_API === '1' ? '' : process.env.EXPO_PUBLIC_BACKEND_URL || '';
