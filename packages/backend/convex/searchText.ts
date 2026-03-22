export function normalizeSearchQuery(query: string): string {
  return normalizeSearchValue(query);
}

export function buildUserSearchText(fields: {
  name: string;
  bio?: string;
  county?: string;
  city?: string;
  interests?: string[];
}): string {
  return joinSearchParts([
    fields.name,
    fields.bio,
    fields.county,
    fields.city,
    ...(fields.interests ?? []),
  ]);
}

export function buildGroupSearchText(fields: {
  name: string;
  description?: string;
  county?: string;
  city?: string;
  topic?: string;
  interests?: string[];
}): string {
  return joinSearchParts([
    fields.name,
    fields.description,
    fields.county,
    fields.city,
    fields.topic,
    ...(fields.interests ?? []),
  ]);
}

function joinSearchParts(parts: Array<string | undefined>): string {
  return parts
    .map((part) => normalizeSearchValue(part ?? ""))
    .filter(Boolean)
    .join(" ");
}

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
