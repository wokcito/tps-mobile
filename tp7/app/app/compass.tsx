import React from 'react';
import { Text,View } from 'react-native';
import { useTracker } from '../src/state';
import { useOrientation } from '../src/observer';
import { orientation } from '../src/orbital';
import { Screen,Card,SatelliteStatus,styles,colors } from '../src/ui';
export default function Compass(){const t=useTracker(),sensor=useOrientation();const target=t.current?orientation(sensor.heading,t.current.azimuth,sensor.pitch,t.current.elevation):undefined;
 return <Screen title="Orientación asistida"><SatelliteStatus/><Card>{!sensor.available&&<Text style={styles.warning}>Sensores no disponibles o sin permiso. Usá los valores de azimut/elevación como referencia manual.</Text>}<Text style={styles.subtitle}>Sostené el teléfono vertical, en orientación retrato, y calibrá lejos de metal. Norte magnético (sin corrección por declinación).</Text>{target&&<><View style={{alignItems:'center',padding:35}}><Text style={{fontSize:90,color:colors.accent,transform:[{rotate:`${target.turn}deg`}]}}>↑</Text></View><Text style={styles.text}>Girá {Math.abs(target.turn).toFixed(1)}° hacia la {target.turn>=0?'derecha':'izquierda'}</Text><Text style={styles.text}>{target.elevation>=0?'Elevá':'Bajá'} {Math.abs(target.elevation).toFixed(1)}°</Text><Text style={styles.subtitle}>Objetivo: az {t.current?.azimuth.toFixed(1)}°, el {t.current?.elevation.toFixed(1)}°</Text>{t.current&&t.current.elevation<0&&<Text style={styles.warning}>El satélite está debajo del horizonte.</Text>}</>}</Card></Screen>;
}
