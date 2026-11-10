import type {ExpoConfig,ConfigContext} from 'expo/config';
export default ({config}:ConfigContext):ExpoConfig=>({...config,name:'AgroPulse',slug:'agropulse',android:{...config.android,config:{...config.android?.config,googleMaps:{apiKey:process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY||''}}}});
