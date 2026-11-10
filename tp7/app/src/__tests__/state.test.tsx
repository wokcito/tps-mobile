import React from 'react';
import { Text,Pressable } from 'react-native';
import { render,screen,fireEvent,act } from '@testing-library/react-native';
import { TrackerProvider,useTracker } from '../state';
import type { Cached,SatelliteRecord } from '../data';
const mockSettings={minElevation:10,noticeMinutes:5,ttlHours:24,constellationLimit:100,horizonDays:2,proxyUrl:'',manualObserver:{latitude:-31.392,longitude:-58.021,altitude:0.03}};
const mockService={orbital:jest.fn()};
jest.mock('../runtime',()=>({get DEFAULT_SETTINGS(){return mockSettings;},loadSettings:async()=>mockSettings,makeService:()=>mockService,storage:{set:jest.fn()},registerBackground:async()=>{},refreshSubscriptions:async()=>{}}));
jest.mock('../observer',()=>({useObserver:()=>({observer:mockSettings.manualObserver,observerStatus:'Manual'})}));
jest.mock('../prediction',()=>({predictPassesAsync:async()=>[]}));
function Probe(){const t=useTracker();return <><Text>{t.orbital?`Resultado ${t.orbital.value.norad}`:'Cargando'}</Text><Pressable accessibilityLabel="Cambiar satélite" onPress={()=>t.setNorad(123456)}><Text>Cambiar</Text></Pressable></>;}
const cached=(norad:number):Cached<SatelliteRecord>=>({value:{norad,name:String(norad),group:'active',epoch:0},savedAt:0,source:'fixture',stale:false});
test('late request from previous satellite cannot overwrite current selection',async()=>{
 let oldResolve!:(value:Cached<SatelliteRecord>)=>void,newResolve!:(value:Cached<SatelliteRecord>)=>void;
 mockService.orbital.mockImplementation((norad:number)=>new Promise(resolve=>{if(norad===25544)oldResolve=resolve;else newResolve=resolve;}));
 await render(<TrackerProvider><Probe/></TrackerProvider>);
 expect(mockService.orbital).toHaveBeenCalledWith(25544);
 await fireEvent.press(screen.getByLabelText('Cambiar satélite'));
 await act(async()=>{newResolve(cached(123456));});
 expect(screen.getByText('Resultado 123456')).toBeTruthy();
 await act(async()=>{oldResolve(cached(25544));});
 expect(screen.getByText('Resultado 123456')).toBeTruthy();
});
