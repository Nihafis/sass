import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import { Role } from 'src/generated/prisma';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  // สร้าง org + เพิ่ม user เป็น OWNER อัตโนมัติ
  async createOrganization(name: string, userId: string) {
    return this.prisma.organization.create({
      data: {
        name,
        memberships: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
      include: {
        memberships: true,
      },
    });
  }

  // invite user เข้า org (เฉพาะ OWNER/ADMIN)
  async inviteMember(orgId: string, inviterId: string, email: string, role: Role) {
    // 1. เช็คว่า inviter มีสิทธิ์ไหม
    const inviter = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: inviterId,
          organizationId: orgId,
        },
      },
    });

    if (!inviter || inviter.role === Role.MEMBER) {
      throw new ForbiddenException('Only OWNER or ADMIN can invite members');
    }

    // 2. หา user จาก email
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    // 3. เพิ่ม membership
    return this.prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role,
      },
    });
  }

  // list members ใน org
  async getMembers(orgId: string, requesterId: string) {
    // เช็คว่า requester อยู่ใน org ไหม
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: requesterId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) throw new ForbiddenException('Not a member of this organization');

    return this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, email: true, createdAt: true },
        },
      },
    });
  }
}