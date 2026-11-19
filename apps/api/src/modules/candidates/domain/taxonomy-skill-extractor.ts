import type { ExtractedSkill, Skill } from './skill.js';

const ADVANCED = /(experto|expert|avanzad[oa]|advanced|senior|lider[ée]|\b[5-9]\+?\s*años)/i;
const BASIC = /(b[áa]sico|basic|junior|aprendiendo|curso|nociones)/i;
const WINDOW = 60;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extractor determinista por taxonomía (modo AI_PROVIDER=mock).
 * Propone skills con nivel estimado y evidencia; el candidato SIEMPRE confirma.
 * El adaptador Bedrock (v2) implementa el mismo puerto `SkillExtractor`.
 * El texto del CV se trata como dato no confiable: solo se buscan coincidencias, nunca se ejecuta.
 */
export function extractSkillsFromText(text: string, taxonomy: Skill[]): ExtractedSkill[] {
  const found: ExtractedSkill[] = [];
  for (const skill of taxonomy) {
    const names = [skill.name, ...skill.aliases].map(escape).join('|');
    const re = new RegExp(`(^|[^\\p{L}\\p{N}+#.])(${names})(?=$|[^\\p{L}\\p{N}+#])`, 'iu');
    const m = re.exec(text);
    if (!m) continue;
    const start = Math.max(0, m.index - WINDOW);
    const end = Math.min(text.length, m.index + m[0].length + WINDOW);
    const context = text.slice(start, end);
    const level = ADVANCED.test(context) ? 4 : BASIC.test(context) ? 2 : 3;
    found.push({ skillId: skill.id, level, evidence: context.replace(/\s+/g, ' ').trim() });
  }
  return found;
}
