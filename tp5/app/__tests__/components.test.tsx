import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {Button,Share,Text,TextInput} from 'react-native';
import {useMonitor} from '../src/store';
import {defaultSettings,Measurement} from '../src/types';
import {Dashboard} from '../src/presentation/Dashboard';
import {MapScreen} from '../src/presentation/MapScreen';
import {History} from '../src/presentation/History';
import {FilterScreen} from '../src/presentation/FilterScreen';
import {ExportScreen} from '../src/presentation/ExportScreen';
import {SettingsScreen} from '../src/presentation/SettingsScreen';
import {applyFilters,runMeasurement,saveSettings} from '../src/runtime';

jest.mock('../src/runtime',()=>({runMeasurement:jest.fn(async()=>{}),newSession:jest.fn(async()=>{}),cancelMeasurement:jest.fn(),applyFilters:jest.fn(async()=>{}),saveSettings:jest.fn(async()=>{})}));
jest.mock('../src/background',()=>({configureBackground:jest.fn(async()=>{})}));
jest.mock('../src/native/telephony',()=>({requestMeasurementPermissions:jest.fn(async()=>true)}));
jest.mock('../src/geo/location',()=>({requestIOSLocation:jest.fn(async()=>{})}));
jest.mock('@notifee/react-native',()=>({requestPermission:jest.fn(async()=>({}))}));
jest.mock('react-native-geolocation-service',()=>({requestAuthorization:jest.fn(async()=> 'granted')}));
jest.mock('react-native-maps',()=>({__esModule:true,default:'MapView',Heatmap:'Heatmap',Marker:'Marker',PROVIDER_GOOGLE:'google'}));
jest.mock('react-native-svg',()=>({__esModule:true,default:'Svg',Circle:'Circle',Line:'Line',Polyline:'Polyline',Text:'SvgText'}));
const measurement:Measurement={id:'m',sessionId:'s',timestamp:1000,network:'LTE',operator:'Operador AR',signalDbm:-85,position:{latitude:-34,longitude:-58,accuracy:4,timestamp:1000},rtt:[{host:'a',port:80,min:10,avg:20,max:30,jitter:20,loss:0,samples:[10,30]}],throughput:{downloadMbps:8,uploadMbps:4,downloadBytes:1000000,uploadBytes:500000},errors:[]};
let tree:TestRenderer.ReactTestRenderer;
async function render(component:React.ReactElement){await act(async()=>{tree=TestRenderer.create(component);});return tree!;}
const text=()=>tree.root.findAllByType(Text).map(n=>n.props.children).flat(Infinity).join(' ').replace(/\s+/g,' ');
async function click(title:string){await act(async()=>{await tree.root.findAllByType(Button).find(b=>b.props.title===title)!.props.onPress();});}
beforeEach(()=>{jest.clearAllMocks();useMonitor.setState({ready:true,busy:false,error:null,rows:[],sessions:[{id:'s',name:'Recorrido',startedAt:0}],sessionId:'s',settings:defaultSettings,filters:{},network:{network:'WiFi',operator:null,signalDbm:null}});});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());});
test('Dashboard vacío, permiso/medición y resultado completo en español',async()=>{
 await render(<Dashboard/>);expect(text()).toContain('Todavía no hay mediciones');expect(text()).toContain('WiFi');await click('Medir ahora');expect(runMeasurement).toHaveBeenCalledTimes(1);
 await act(async()=>{useMonitor.setState({rows:[measurement]});});
 expect(text()).toContain('8.00 Mbps');expect(text()).toContain('4.00 Mbps');expect(text()).toContain('10.00 ms');expect(text()).toContain('20.00 ms');expect(text()).toContain('30.00 ms');expect(text()).toContain('-34.00000, -58.00000');
});
test('Mapa alimenta Heatmap y marcador sólo con GPS; filtros navegan',async()=>{
 useMonitor.setState({rows:[measurement,{...measurement,id:'no-gps',position:null}]});const navigate=jest.fn();await render(<MapScreen navigation={{navigate} as never} route={{key:'map',name:'Mapa'}}/>);
 expect(tree.root.findAllByType('Marker' as never)).toHaveLength(1);const points=tree.root.findByType('Heatmap' as never).props.points;expect(points).toHaveLength(1);expect(points[0].latitude).toBe(-34);expect(points[0].weight).toBeGreaterThan(0);expect(points[0].weight).toBeLessThanOrEqual(1);
 await click('Cambiar filtros');expect(navigate).toHaveBeenCalledWith('Filtros');
});
test('Historial separa sesiones y muestra tres series',async()=>{
 useMonitor.setState({rows:[measurement,{...measurement,id:'m2',sessionId:'s2'}]});await render(<History/>);expect(text()).toContain('1 mediciones en la sesión');expect(tree.root.findAllByType('Svg' as never)).toHaveLength(3);expect(text()).toContain('Latencia promedio');expect(text()).toContain('Throughput de subida');
});
test('Filtros inválidos no ejecutan queries, limpiar conserva comportamiento',async()=>{
 await render(<FilterScreen/>);await act(async()=>tree.root.findAllByType(TextInput)[3].props.onChangeText('99,0,100,1'));await click('Aplicar filtros');expect(applyFilters).not.toHaveBeenCalled();expect(text()).toContain('Coordenadas inválidas');await click('Limpiar filtros');expect(applyFilters).toHaveBeenCalledWith({});
});
test('Exportación comparte JSON completo con filtros actuales',async()=>{
 useMonitor.setState({rows:[measurement]});const share=jest.spyOn(Share,'share').mockResolvedValue({action:Share.sharedAction,activityType:undefined});await render(<ExportScreen/>);await click('Compartir JSON');expect(share).toHaveBeenCalledWith({title:'Mediciones JSON',message:JSON.stringify([measurement],null,2)});expect(text()).toContain('JSON enviado al menú de compartir.');share.mockRestore();
});
test('Ajustes preservan configuración válida y rechazan hosts insuficientes sin persistir',async()=>{
 await render(<SettingsScreen/>);await click('Guardar ajustes');expect(saveSettings).toHaveBeenCalledWith(defaultSettings);jest.mocked(saveSettings).mockClear();await act(async()=>tree.root.findAllByType(TextInput)[0].props.onChangeText('a:80'));await click('Guardar ajustes');expect(saveSettings).not.toHaveBeenCalled();expect(text()).toContain('3 y 10 hosts');
});
