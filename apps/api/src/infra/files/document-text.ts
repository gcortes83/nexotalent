import { extractText, getDocumentProxy } from 'unpdf';
import { ValidationError } from '../../shared/errors.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const TEXT_TYPES = ['text/plain', 'text/markdown', 'text/csv'] as const;
export const PDF_TYPE = 'application/pdf';

const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString('latin1') === '%PDF-';

/**
 * Texto de un archivo subido (CV o vacantes). Verifica magic bytes: un "PDF" que no empieza con
 * %PDF- se rechaza. El contenido se trata como dato no confiable (nunca como instrucciones).
 * PDFs escaneados (sin capa de texto) requieren OCR/Textract (v2).
 */
export async function documentText(buf: Buffer, contentType: string): Promise<string> {
  if (buf.length === 0) throw new ValidationError('El archivo está vacío');
  if (buf.length > MAX_UPLOAD_BYTES) throw new ValidationError('El archivo supera 5 MB');
  if (contentType.startsWith(PDF_TYPE)) {
    if (!isPdf(buf)) throw new ValidationError('El archivo no es un PDF válido');
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: false });
      const joined = (Array.isArray(text) ? text : [text]).join('\n').trim();
      if (!joined) throw new ValidationError('El PDF no tiene texto seleccionable (¿es un escaneo?). Pega el texto o súbelo como .txt');
      return joined;
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError('No se pudo leer el PDF');
    }
  }
  if (isPdf(buf)) throw new ValidationError('Tipo de archivo inconsistente');
  return buf.toString('utf8').replace(/\u0000/g, '').trim();
}
