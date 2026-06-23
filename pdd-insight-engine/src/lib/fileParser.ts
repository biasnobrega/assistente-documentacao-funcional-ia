/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
      return await file.text();
    case 'pdf':
      return await extractTextFromPDF(file);
    case 'doc':
    case 'docx':
      return await extractTextFromDOCX(file);
    default:
      throw new Error('Formato de arquivo não suportado. Use .txt, .pdf, ou .docx');
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += strings.join(' ') + '\n';
  }
  return text;
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
