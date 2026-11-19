/**
 * Embeddings deterministas por hashing (modo AI_PROVIDER=mock). Misma dimensión que
 * Bedrock Titan v2 (1024) para que la columna pgvector no cambie al activar Bedrock.
 */
export const EMBEDDING_DIM = 1024;

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const v = new Array<number>(dim).fill(0);
  const tokens = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').match(/[\p{L}\p{N}+#.]+/gu) ?? [];
  for (const t of tokens) {
    const h = fnv1a(t);
    v[h % dim]! += (h & 1) === 0 ? 1 : -1;
  }
  const norm = Math.hypot(...v);
  return norm === 0 ? v : v.map((x) => x / norm);
}

export function cosineSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! ** 2;
    nb += b[i]! ** 2;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** Texto canónico a embeber: solo información profesional. */
export const profileText = (headline: string | null, skills: { name: string; level: number }[]): string =>
  [headline ?? '', ...skills.flatMap((s) => Array(Math.max(1, s.level)).fill(s.name))].join(' ');
