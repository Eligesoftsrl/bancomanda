import { Redirect } from 'expo-router';

// Link "Accedi" della landing: porta al login (o alla home se già collegato)
export default function AccediRedirect() {
  return <Redirect href="/" />;
}
