import React from 'react';
import {Text,View} from 'react-native';
import Svg,{Circle,Line,Polyline,Text as SvgText} from 'react-native-svg';
export function Chart({title,points,unit}:{title:string;points:{time:number;value:number|null}[];unit:string}){
 const valid=points.filter((p):p is {time:number;value:number}=>p.value!==null);const max=Math.max(1,...valid.map(p=>p.value));
 const start=points[0]?.time??0,end=points[points.length-1]?.time??1;
 const x=(time:number)=>40+(time-start)/Math.max(1,end-start)*250;
 const y=(value:number)=>115-value/max*90;
 // Missing observations break the line rather than interpolating across failures.
 const segments:{time:number;value:number}[][]=[];let segment:{time:number;value:number}[]=[];
 for(const p of points){if(p.value===null){if(segment.length)segments.push(segment);segment=[];}else segment.push({time:p.time,value:p.value});}if(segment.length)segments.push(segment);
 return <View accessibilityLabel={title}><Text style={{fontWeight:'700',marginTop:12}}>{title} ({unit})</Text>{!valid.length?<Text>Sin datos disponibles</Text>:<>
 <Svg width="100%" height={150} viewBox="0 0 320 150" accessibilityLabel={`${title}: ${valid.map(p=>p.value.toFixed(2)).join(', ')} ${unit}`}>
 <Line x1={40} y1={15} x2={40} y2={115} stroke="#61758a"/><Line x1={40} y1={115} x2={300} y2={115} stroke="#61758a"/>
 <SvgText x={0} y={25} fontSize={10} fill="#102b46">{max.toFixed(1)}</SvgText><SvgText x={10} y={118} fontSize={10} fill="#102b46">0</SvgText>
 {segments.map((s,i)=><Polyline key={i} points={s.map(p=>`${x(p.time)},${y(p.value)}`).join(' ')} fill="none" stroke="#086b9b" strokeWidth={2}/>)}
 {valid.map((p,i)=><Circle key={i} cx={x(p.time)} cy={y(p.value)} r={3} fill="#086b9b"/>)}
 <SvgText x={40} y={140} fontSize={10} fill="#102b46">{new Date(start).toLocaleTimeString('es-AR')}</SvgText>
 <SvgText x={230} y={140} fontSize={10} fill="#102b46">{new Date(end).toLocaleTimeString('es-AR')}</SvgText>
 </Svg><Text>Último: {valid[valid.length-1].value.toFixed(2)} {unit}</Text></>}</View>;
}
