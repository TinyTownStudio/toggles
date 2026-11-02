const GLOB_WILDCARD = /[*?]/;

function escapeLikeLiteral(fragment: string): string {
  return fragment.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Convert a user pattern to a SQLite LIKE pattern.
 * With * or ?: glob semantics (* -> %, ? -> _, literals escaped for LIKE).
 * Without wildcards: legacy substring match (wrap in %, treat - _ space as %).
 */
export function globPatternToLike(pattern: string): { like: string; escape: string | undefined } {
  if (!GLOB_WILDCARD.test(pattern)) {
    return {
      like: `%${String(pattern).replace(/[-_ ]/g, "%")}%`,
      escape: undefined,
    };
  }

  let like = "";
  for (const ch of pattern) {
    if (ch === "*") like += "%";
    else if (ch === "?") like += "_";
    else like += escapeLikeLiteral(ch);
  }
  return { like, escape: "\\" };
}
