import {parseSettings,parseFilters} from '../src/presentation/forms';
import {defaultSettings} from '../src/types';
test('valida ajustes completos sin mutar entrada ante rechazo',()=>{
 expect(parseSettings('a:80,b:443,c:9000','http://localhost:3000','15','0.3','0.5',false)).toEqual({...defaultSettings,hosts:[{host:'a',port:80},{host:'b',port:443},{host:'c',port:9000}],backendUrl:'http://localhost:3000'});
 expect(()=>parseSettings('a:80','ftp://x','0','0.8','0.2',false)).toThrow();
 expect(defaultSettings.hosts).toHaveLength(3);
});
test('filtros: fecha ISO y caja validada, zona antimeridiano y campos vacíos',()=>{
 expect(parseFilters('LTE','2026-01-01','2026-01-02','-90,170,90,-170')).toEqual({network:'LTE',from:1767225600000,to:1767312000000,bbox:{south:-90,west:170,north:90,east:-170}});
 expect(parseFilters('','','','')).toEqual({});
 for(const args of [['','2026-02-30','',''],['','2026-01-02','2026-01-01',''],['','','','91,0,92,1']])expect(()=>parseFilters(...args as [string,string,string,string])).toThrow();
});
