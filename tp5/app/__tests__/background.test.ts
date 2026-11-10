import BackgroundFetch from 'react-native-background-fetch';
import {backgroundTask,backgroundTimeout,configureBackground,headlessTask} from '../src/background';
import {runMeasurement} from '../src/runtime';
import {useMonitor} from '../src/store';
import {defaultSettings} from '../src/types';
jest.mock('react-native-background-fetch',()=>({finish:jest.fn(),stop:jest.fn(async()=>{}),configure:jest.fn(async()=>2),NETWORK_TYPE_ANY:1}));
jest.mock('../src/runtime',()=>({initialize:jest.fn(async()=>{}),runMeasurement:jest.fn(async()=>{})}));
beforeEach(()=>{jest.clearAllMocks();useMonitor.setState({settings:{...defaultSettings,backgroundEnabled:true}});});
test('timeout cancela y finaliza exactamente una vez, incluso al salir del callback',async()=>{
 let observed:AbortSignal|undefined;
 jest.mocked(runMeasurement).mockImplementationOnce(async(signal)=>{observed=signal;await new Promise<void>(resolve=>signal!.addEventListener('abort',()=>resolve(),{once:true}));return undefined as never;});
 const task=backgroundTask('test-task');await Promise.resolve();await Promise.resolve();expect(runMeasurement).toHaveBeenCalledTimes(1);
 backgroundTimeout('test-task');await task;
 expect(observed?.aborted).toBe(true);expect(BackgroundFetch.finish).toHaveBeenCalledTimes(1);expect(BackgroundFetch.finish).toHaveBeenCalledWith('test-task');
});
test('background desactivado no mide; fallos y headless timeout siempre finalizan',async()=>{
 useMonitor.setState({settings:{...defaultSettings,backgroundEnabled:false}});await backgroundTask('off');expect(runMeasurement).not.toHaveBeenCalled();expect(BackgroundFetch.finish).toHaveBeenCalledWith('off');await configureBackground();expect(BackgroundFetch.stop).toHaveBeenCalledTimes(1);
 useMonitor.setState({settings:{...defaultSettings,backgroundEnabled:true}});jest.mocked(runMeasurement).mockRejectedValueOnce(Error('offline'));await headlessTask({taskId:'failed',timeout:false});expect(BackgroundFetch.finish).toHaveBeenCalledWith('failed');
 await headlessTask({taskId:'expired',timeout:true});expect(BackgroundFetch.finish).toHaveBeenCalledWith('expired');
});
test('configura intervalo y políticas Android explícitas',async()=>{
 await configureBackground();expect(BackgroundFetch.configure).toHaveBeenCalledWith({minimumFetchInterval:15,stopOnTerminate:false,startOnBoot:true,enableHeadless:true,requiredNetworkType:1,requiresBatteryNotLow:true},backgroundTask,backgroundTimeout);
});
