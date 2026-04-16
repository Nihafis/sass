import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}
  private readonly logger = new Logger(AuthController.name);

  @Post("register")
  register(@Body() body: any) {
     return this.authService.register(body.email, body.password);
  }

  @Post("refresh")
  refresh(@Body() body: any) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post("login")
  async login(@Body() body: any, @Req() req: any) {
    // this.logger.debug(`Login request from IP: ${req.ip}`);
    const user = await this.authService.validateUser(body.email, body.password);

    return this.authService.login(user);
  }

  @Post("logout")
  async logout(@Body("refreshToken") refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@CurrentUser() user: any) {
    return user;
  }
}
