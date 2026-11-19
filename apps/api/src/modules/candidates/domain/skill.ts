export interface Skill {
  id: string;
  name: string;
  /** Eje del radar: Lenguajes, Frameworks, Cloud, Datos, Herramientas, Soft skills, Idiomas, Dominio. */
  category: string;
  aliases: string[];
}

export interface ExtractedSkill {
  skillId: string;
  level: number;
  evidence: string;
}
