import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { databaseConnectionError, databaseSetupError, isDatabaseConfigured } from '@/lib/api-response';
import { getBaseUrl } from '@/lib/base-url';
import { validateManifest, validationErrorResponse } from '@/lib/manifest-validator';
import { prisma } from '@/lib/prisma';
import { generateDoc, countTokens } from '@/lib/doc-generator';
import {
  checkRateLimit,
  getClientIp,
  PUBLISH_RATE_LIMIT,
} from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return databaseSetupError();
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`publish:${ip}`, PUBLISH_RATE_LIMIT);

  if (!rate.allowed) {
    const retryAfterSec = Math.ceil((rate.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Maximum ${PUBLISH_RATE_LIMIT.limit} publishes per hour per IP. Try again later.`,
        limit: rate.limit,
        resetAt: new Date(rate.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rate.resetAt / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        fieldErrors: [{ field: 'body', message: 'Request body must be valid JSON' }],
      },
      { status: 400 }
    );
  }

  const validation = validateManifest(body);
  if (!validation.valid) {
    return NextResponse.json(validationErrorResponse(validation.fieldErrors), { status: 400 });
  }

  try {
    const manifest = validation.data;
    const baseUrl = getBaseUrl(req);

    const existing = await prisma.manifest.findFirst({
      where: { name: manifest.name, version: manifest.version },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: 'Conflict',
          fieldErrors: [
            {
              field: 'version',
              message: `Tool "${manifest.name}" v${manifest.version} already exists. Bump the version to republish.`,
            },
          ],
        },
        { status: 409 }
      );
    }

    const created = await prisma.manifest.create({
      data: {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        serverUrl: manifest.serverUrl,
        authType: manifest.authType,
        authHeader: manifest.authHeader,
        domain: manifest.domain,
        tools: manifest.tools as Prisma.InputJsonValue,
      },
    });

    const mcpEndpoint = `${baseUrl}/api/mcp/${created.id}`;
    const docString = generateDoc(manifest, mcpEndpoint);
    const tokenCount = countTokens(docString);

    await prisma.manifest.update({
      where: { id: created.id },
      data: { docString, tokenCount },
    });

    await prisma.mcpConfig.create({
      data: {
        manifestId: created.id,
        mcpEndpoint,
        active: true,
        rateLimit: 1000,
        timeout: 30000,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Tool "${manifest.name}" published successfully.`,
        id: created.id,
        mcpEndpoint,
        tokenCount,
        publishedAt: created.publishedAt,
      },
      {
        headers: {
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': String(Math.floor(rate.resetAt / 1000)),
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist') || msg.includes('P2021')) {
      return databaseConnectionError('Tables missing — run: npx prisma db push');
    }
    return databaseConnectionError(msg);
  }
}
