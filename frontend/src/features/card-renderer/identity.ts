const adjectives = ["Terminal", "Coastal", "Midnight", "Curious", "Electric"];
const nouns = ["Wanderer", "Architect", "Tinkerer", "Navigator", "Builder"];

export function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function deriveBuilderIdentity(name: string, stackRole: string): {
  readonly builderTitle: string;
  readonly builderId: string;
} {
  const hash = stableHash(`${name}\u0000${stackRole}`);
  const adjective = adjectives[hash % adjectives.length] ?? "Coastal";
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length] ?? "Builder";
  return {
    builderTitle: `${adjective} ${noun}`,
    builderId: `#HH-GOA-${String(hash % 100_000).padStart(5, "0")}`,
  };
}
