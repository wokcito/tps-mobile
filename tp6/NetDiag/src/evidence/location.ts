import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const getFix = async (): Promise<Fix | null> => {
  if (Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (r !== PermissionsAndroid.RESULTS.GRANTED) {
      return null;
    }
  }
  return new Promise(resolve =>
    Geolocation.getCurrentPosition(
      p =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => resolve(null), // offline GPS can still fail indoors: caller handles null
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    ),
  );
};
