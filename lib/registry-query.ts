import type { Prisma } from '@prisma/client';

export function buildRegistryWhere(
  q: string | null,
  domain: string | null
): Prisma.manifestWhereInput {
  const where: Prisma.manifestWhereInput = {};
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