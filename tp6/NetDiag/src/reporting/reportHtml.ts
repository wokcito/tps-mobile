export interface ReportPhoto {
  uri: string;
  latitude?: number;
  longitude?: number;
}
export interface ReportData {
  title: string;
  siteName: string;
  notes: string;
  technician: string;
  createdAt: number;
  latitude?: number;
  longitude?: number;
  photos: ReportPhoto[];
}

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const coords = (lat?: number, lon?: number): string | null =>
  lat === undefined || lon === undefined
    ? null
    : `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

export const buildReportHtml = (r: ReportData): string => {
  const gps = coords(r.latitude, r.longitude);
  const photos = r.photos.length
    ? r.photos
        .map(p => {
          const c = coords(p.latitude, p.longitude);
          return `<figure><img src="${esc(p.uri)}" style="max-width:100%"/><figcaption>${
            c ? `GPS ${c}` : 'Sin ubicación GPS'
          }</figcaption></figure>`;
        })
        .join('\n')
    : '<p>Sin fotos</p>';
  return `<html><head><meta charset="utf-8"/></head><body style="font-family:sans-serif">
<h1>${esc(r.title)}</h1>
<p><b>Sitio:</b> ${esc(r.siteName)}<br/>
<b>Técnico:</b> ${esc(r.technician)}<br/>
<b>Fecha:</b> ${new Date(r.createdAt).toISOString()}<br/>
<b>Ubicación:</b> ${gps ? `GPS ${gps}` : 'Sin ubicación GPS'}</p>
<h2>Notas técnicas</h2>
<p>${esc(r.notes)}</p>
<h2>Evidencia fotográfica</h2>
${photos}
</body></html>`;
};
