import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/infra/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt/dist/jwt.service";
import { hashToken } from "src/common/utils/hash.util";
import { Keyv } from "@keyv/redis";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(Keyv) private readonly redis: Keyv,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async register(email: string, password: string) {
    this.logger.log(`Register attempt: ${maskEmail(email)}`);

    const hash = await bcrypt.hash(password, 10);
    console.log(`sdasdasd`, typeof hash);
    const user = await this.prisma.user.create({
      data: { email, password: hash },
    });
    this.logger.log(`User registered: id=${user.id} email=${maskEmail(email)}`);

    return user;
  }

  async login(user: any) {
    // ✅ log business event
    this.logger.log(`User logged in: id=${user.id}`);

    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: "1d" },
    );

    const refreshToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: "7d" },
    );

    const hashed = hashToken(refreshToken);

    // save session DB
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashed,
      },
    });

    // save Redis (TTL 7 วัน)
    await this.redis.set(`session:${hashed}`, user.id, 60 * 60 * 24 * 7 * 1000);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      this.logger.debug(`Token refresh for userId=${payload.sub}`);

      const hashed = hashToken(refreshToken);

      // 1. check Redis ก่อน (เร็วกว่า DB)
      const cachedUserId = await this.redis.get(`session:${hashed}`);

      if (!cachedUserId) {
        // 2. ถ้าไม่มีใน Redis → check DB
        const session = await this.prisma.session.findUnique({
          where: { tokenHash: hashed },
        });

        if (!session) {
          throw new UnauthorizedException("Invalid session");
        }

        // 3. เจอใน DB → เอากลับขึ้น Redis
        await this.redis.set(
          `session:${hashed}`,
          session.userId,
          60 * 60 * 24 * 7 * 1000,
        );
      }

      const newAccessToken = this.jwt.sign(
        { sub: payload.sub, email: payload.email },
        { expiresIn: "15m" },
      );

      return { accessToken: newAccessToken };
    } catch (err) {
      this.logger.warn(`Token refresh failed: ${(err as Error).message}`);

      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(refreshToken: string) {
    const hashed = hashToken(refreshToken);
    this.logger.log(`Logout: tokenHash=${hashed.substring(0, 8)}...`);

    // ลบจาก Redis + DB พร้อมกัน
    await Promise.all([
      this.redis.delete(`session:${hashed}`),
      this.prisma.session.deleteMany({
        where: { tokenHash: hashed },
      }),
    ]);

    return { message: "Logged out successfully" };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Login failed (user not found): ${maskEmail(email)}`);
      throw new UnauthorizedException("Invalid credentials");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      this.logger.warn(`Login failed (invalid password): ${maskEmail(email)}`);
      throw new UnauthorizedException("Invalid credentials");
    }
    this.logger.log(`User validated: id=${user.id}`);

    return user;
  }
}
// helper: ซ่อน email บางส่วนเพื่อ privacy
// user@example.com → u***@example.com
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}
