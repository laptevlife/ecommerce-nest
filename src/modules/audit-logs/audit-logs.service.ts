import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    actorUserId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    description: string;
    metadata?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }

  async findAll(query: QueryAuditLogsDto) {
    const { page = 1, limit = 20, action, actorUserId, entityType } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (actorUserId) where.actorUserId = actorUserId;
    if (entityType) where.entityType = entityType;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        metadata: item.metadataJson ? JSON.parse(item.metadataJson) : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

