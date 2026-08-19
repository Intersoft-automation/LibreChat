import { createHash } from 'crypto';
import type { TSubagentDisplayNamesConfig } from 'librechat-data-provider';

export type SubagentAliasResolver = (subagentRunId: string) => string | undefined;

function normalizeNames(config?: TSubagentDisplayNamesConfig): string[] {
  if (config?.enabled !== true) {
    return [];
  }

  const seen = new Set<string>();
  return config.names.reduce<string[]>((names, value) => {
    const name = value.trim();
    const key = name.toLocaleLowerCase();
    if (!name || seen.has(key)) {
      return names;
    }
    seen.add(key);
    names.push(name);
    return names;
  }, []);
}

function getStartIndex(subagentRunId: string, poolSize: number): number {
  const hash = createHash('sha256').update(subagentRunId).digest();
  return hash.readUInt32BE(0) % poolSize;
}

/** Creates a request-scoped allocator of stable, unique aliases for child runs. */
export function createSubagentAliasResolver(
  config?: TSubagentDisplayNamesConfig,
): SubagentAliasResolver {
  const names = normalizeNames(config);
  const assignments = new Map<string, string>();
  const used = new Set<string>();

  return (subagentRunId: string): string | undefined => {
    if (names.length === 0 || !subagentRunId) {
      return undefined;
    }

    const existing = assignments.get(subagentRunId);
    if (existing) {
      return existing;
    }

    const startIndex = getStartIndex(subagentRunId, names.length);
    for (let offset = 0; offset < names.length; offset++) {
      const candidate = names[(startIndex + offset) % names.length];
      if (used.has(candidate)) {
        continue;
      }
      assignments.set(subagentRunId, candidate);
      used.add(candidate);
      return candidate;
    }

    const base = names[startIndex];
    let suffix = 2;
    let candidate = `${base} ${suffix}`;
    while (used.has(candidate)) {
      suffix++;
      candidate = `${base} ${suffix}`;
    }
    assignments.set(subagentRunId, candidate);
    used.add(candidate);
    return candidate;
  };
}
