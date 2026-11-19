import type { ReactNode } from 'react';

/**
 * Descripción de vacante con formato ligero (sin HTML: se renderiza como texto, sin riesgo de inyección):
 * «## Título» → encabezado de sección, «- texto» → viñeta, el resto → párrafos.
 */
export function JobDescription({ text, headingLevel = 3 }: { text: string; headingLevel?: 3 | 4 }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];
  const H = `h${headingLevel}` as const;
  const flushBullets = () => {
    if (bullets.length) blocks.push(<ul key={`u${blocks.length}`} className="job-desc__list">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
    bullets = [];
  };
  const flushPara = () => {
    if (para.length) blocks.push(<p key={`p${blocks.length}`}>{para.join(' ')}</p>);
    para = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      flushBullets(); flushPara();
      blocks.push(<H key={`h${blocks.length}`} className="job-desc__heading">{line.slice(3)}</H>);
    } else if (/^[-•]\s+/.test(line)) {
      flushPara();
      bullets.push(line.replace(/^[-•]\s+/, ''));
    } else if (!line) {
      flushBullets(); flushPara();
    } else {
      flushBullets();
      para.push(line);
    }
  }
  flushBullets(); flushPara();
  return <div className="job-desc">{blocks}</div>;
}

/** Primer párrafo de la descripción (para extractos en listas). */
export const descriptionExcerpt = (text: string): string =>
  text.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('## ') && !/^[-•]\s/.test(l)) ?? '';
