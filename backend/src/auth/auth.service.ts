import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infra/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { hashToken } from 'src/common/utils/hash.util';
import { Keyv } from '@keyv/redis';


@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        @Inject(Keyv) private readonly redis: Keyv,
    ) { }

    async register(email: string, password: string) {
        const hash = await bcrypt.hash(password, 10);

        return this.prisma.user.create({
            data: { email, password: hash },
        });
    }

    async login(user: any) {
        const accessToken = this.jwt.sign({ sub: user.id });

        const refreshToken = this.jwt.sign(
            { sub: user.id },
            { expiresIn: '7d' }
        );

        const hashed = hashToken(refreshToken);

        // save session DB
        await this.prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: hashed,
            },
        });

        // save Redis
        await this.redis.set(
            `session:${hashed}`,
            user.id,
            60 * 60 * 24 * 7
        );

        return { accessToken, refreshToken };
    }

    async refresh(refreshToken: string) {
        try {
            // 1. verify token
            const payload = this.jwt.verify(refreshToken);

            // 2. hash token
            const hashed = hashToken(refreshToken);

            // 3. check session ใน DB
            const session = await this.prisma.session.findUnique({
                where: { tokenHash: hashed },
            });

            if (!session) {
                throw new UnauthorizedException('Invalid session');
            }

            // 4. generate new access token
            const newAccessToken = this.jwt.sign(
                { sub: payload.sub },
                { expiresIn: '15m' }
            );

            return {
                accessToken: newAccessToken,
            };
        } catch (err) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        return user;
    }
}
