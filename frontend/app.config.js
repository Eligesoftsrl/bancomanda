// Su Vercel l'app vive sotto bancomanda.com/app (EXPO_WEB_BASE_URL=/app); in anteprima e su Expo Go resta alla radice
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
