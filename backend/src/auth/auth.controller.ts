import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    register(@Body() body: any) {
        return this.authService.register(body.email, body.password);
    }


    @Post('refresh')
    refresh(@Body() body: any) {
        return this.authService.refresh(body.refreshToken);
    }

    @Post('login')
    async login(@Body() body: any, @Req() req: any) {
        const user = await this.authService.validateUser(
            body.email,
            body.password,
        );

        return this.authService.login(user);
    }


}