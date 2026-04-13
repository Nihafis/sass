import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import { Role } from 'src/generated/prisma';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. ดึง roles ที่กำหนดไว้บน route
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ถ้าไม่ได้กำหนด @Roles → ผ่านได้เลย
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-org-id']; // รับ orgId จาก header

    if (!orgId) throw new ForbiddenException('x-org-id header is required');

    // 2. ดึง membership ของ user ใน org นี้
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) throw new ForbiddenException('Not a member of this organization');

    // 3. เช็คว่า role ตรงไหม
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `Required role: ${requiredRoles.join(' or ')}`
      );
    }

    // 4. inject orgId + role เข้า request เพื่อใช้ต่อ
    request.orgId = orgId;
    request.userRole = membership.role;

    return true;
  }
}