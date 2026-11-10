import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { buildReportHtml, ReportData } from './reportHtml';

export const generatePdf = async (data: ReportData, fileName: string): Promise<string> => {
  const file = await RNHTMLtoPDF.convert({
    html: buildReportHtml(data),
    fileName,
    directory: 'Documents',
  });
  if (!file.filePath) {
    throw new Error('PDF generation failed');
  }
  return file.filePath;
};
