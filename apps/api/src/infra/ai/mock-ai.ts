import { extractSkillsFromText } from '../../modules/candidates/domain/taxonomy-skill-extractor.js';
import { hashEmbedding } from '../../modules/matching/domain/embedding.js';
import type { Embedder, SkillExtractor } from '../../ports.js';

/**
 * AI_PROVIDER=mock: extractor por taxonomía + embeddings por hashing.
 * Deterministas, sin red y sin costo: ideales para CI y demo.
 * AI_PROVIDER=bedrock (v2): ver prompts.md P3.4 — mismo puerto, adaptador Bedrock.
 */
export const aiAdapters = (): { extractor: SkillExtractor; embedder: Embedder } => ({
  extractor: { extract: async (text, taxonomy) => extractSkillsFromText(text, taxonomy) },
  embedder: { embed: async (text) => hashEmbedding(text) },
});
