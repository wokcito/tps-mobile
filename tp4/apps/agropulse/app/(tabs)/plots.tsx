import React from 'react';
import {router} from 'expo-router';
import {useStore} from '../../src/store';
import {Page,Title,Body,Card,Button,Loading,ErrorText,PlotBadge} from '../../src/ui';
export default function Plots(){const s=useStore();return <Page refresh={s.refresh}><Title>Lotes</Title><ErrorText message={s.error}/>{s.loading&&<Loading/>}{!s.loading&&!s.plots.length&&<Body>Sin lotes en este establecimiento.</Body>}{s.plots.map(p=><Card key={p.id}><Body>{p.name} · {p.crop||'Sin cultivo'}</Body><PlotBadge plot={p} now={s.now}/><Button title="Ver detalle" onPress={()=>router.push(`/plot/${p.id}`)}/></Card>)}{s.canWrite&&<Button title="Crear lote (GeoJSON)" onPress={()=>router.push('/edit-plot')}/>}<Button title="Actualizar" onPress={()=>void s.refresh()}/></Page>;}
