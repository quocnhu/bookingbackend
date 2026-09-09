import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthProvider, RoleType } from '@prisma/client';
import { QueryAuthActivityDto } from './dto/query-auth-activity.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

export interface AuthActivityInput {
  userId?: string | null;
  eventType: string;
  authProvider?: AuthProvider;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuthActivityInput) {
    try {
      await this.prisma.authActivity.create({
        data: {
          userId: input.userId ?? null,
          eventType: input.eventType,
          authProvider: input.authProvider,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch {
      // Logging auth không làm fail business flow.
    }
  }

  async findAll(
    query: QueryAuthActivityDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<any>> {
    const { page, limit, eventType, userId, from, to } = query;
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (actor.role !== RoleType.ADMIN) {
      where.userId = actor.id;
    }

    const [items, total] = await Promise.all([
      this.prisma.authActivity.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.authActivity.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
