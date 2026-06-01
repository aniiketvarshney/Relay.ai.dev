import type { Prisma } from '@prisma/client';

/** Build Prisma filter for registry list: ?q= (name + description) AND ?domain= */
export function buildRegistryWhere(
  q: string | null,
  domain: string | null
): Prisma.ManifestWhereInput {
  const where: Prisma.ManifestWhereInput = {};
  const query = q?.trim();
  const domainFilter = domain?.trim();

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (domainFilter) {
    where.domain = { equals: domainFilter, mode: 'insensitive' };
  }

  return where;
}
