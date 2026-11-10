import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({config}:ConfigContext):ExpoConfig=>({...config,name:'Satellite Tracker',slug:'satellite-tracker',plugins:[...(config.plugins??[]),['react-native-maps',{androidGoogleMapsApiKey:process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY??''}]]});
