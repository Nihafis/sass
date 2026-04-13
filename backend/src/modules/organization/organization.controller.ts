import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { OrganizationService } from "./organization.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { Role } from "src/generated/prisma";
import { RolesGuard } from "src/common/guards/roles.guard";
import { OrgId } from "src/common/decorators/org-id.decorator";
import { Roles } from "src/common/decorators/roles.decorator";

@UseGuards(JwtAuthGuard) // ทุก route ต้อง login
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  create(@Body("name") name: string, @CurrentUser() user: any) {
    return this.orgService.createOrganization(name, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @Post(":id/members")
  invite(
    @OrgId() orgId: string,
    @CurrentUser() user: any,
    @Body("email") email: string,
    @Body("role") role: Role,
  ) {
    return this.orgService.inviteMember(orgId, user.userId, email, role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @Get(":id/members")
  getMembers(@OrgId() orgId: string, @CurrentUser() user: any) {
    return this.orgService.getMembers(orgId, user.userId);
  }
}
