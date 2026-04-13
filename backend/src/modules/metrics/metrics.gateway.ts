import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/infra/prisma/prisma.service";
import { RedisService } from "src/infra/redis/redis.service";

// namespace: '/metrics'
// client เชื่อมที่  ws://localhost:3000/metrics
@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/metrics",
})
export class MetricsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  // server คือ Socket.IO server instance
  // ใช้สำหรับ broadcast ไปหา client
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Subscribe Redis ตอน Gateway เริ่มทำงาน
  // ทุก server instance จะ subscribe channel เดียวกัน
  // ─────────────────────────────────────────────────────────────
  afterInit() {
    // subscribe channel "metric-update"
    this.redis.subscriber.subscribe("metric-update", (err) => {
      if (err) console.error("[Redis] Subscribe error:", err);
      else console.log("[Redis] Subscribed to metric-update channel");
    });

    // เมื่อได้รับ message จาก Redis → broadcast ไป WebSocket clients
    this.redis.subscriber.on("message", (channel, message) => {
      if (channel === "metric-update") {
        // parse JSON กลับมาเป็น object
        const payload = JSON.parse(message);
        // broadcast ไปทุก client ใน org room
        this.server
          .to(`org:${payload.orgId}`)
          .emit("metric-update", payload.metric);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ทุกครั้งที่ client connect เข้ามา จะ run method นี้ก่อนเสมอ
  // ─────────────────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      // client ต้องส่ง token มาตอน connect
      // วิธี 1: socket.io auth  →  io('/metrics', { auth: { token: '...' } })
      // วิธี 2: header          →  Authorization: Bearer ...
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.split(" ")[1];

      if (!token) throw new Error("No token provided");
      console.log(token);
      // verify token — ถ้า expired หรือ invalid จะ throw error
      const payload = this.jwt.verify<{ sub: string; email: string }>(token);

      // เก็บ user data ไว้ใน client object (ใช้ได้ตลอด session)
      client.data.userId = payload.sub;
      client.data.email = payload.email;

      console.log(`[WS] Connected: ${client.id} (${payload.email})`);
    } catch {
      // reject connection ทันที — client จะได้ error กลับไป
      console.warn(`[WS] Rejected: ${client.id} — invalid token`);
      client.disconnect();
    }
  }

  // ทุกครั้งที่ client disconnect
  handleDisconnect(client: Socket) {
    console.log(`[WS] Disconnected: ${client.id}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Event: 'join-org'
  // client ส่ง orgId มา → server จึงรู้ว่า client นี้อยู่ org ไหน
  // ─────────────────────────────────────────────────────────────
  @SubscribeMessage("join-org")
  handleJoinOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orgId: string },
  ) {
    // เข้า room ชื่อ "org:<orgId>"
    // room = กลุ่ม socket — broadcast ไปทุกคนใน room ได้
    // console.log(data);

    client.join(`org:${data.orgId}`);
    client.data.orgId = data.orgId;

    console.log(`[WS] ${client.data.email} joined org:${data.orgId}`);
    console.log("data.orgId", data.orgId);

    // return กลับไปหา client ที่ส่งมา (ack)
    return { event: "joined", data: { orgId: data.orgId } };
  }

  // ─────────────────────────────────────────────────────────────
  // Event: 'submit-metric'
  // client ส่ง metric → save DB → broadcast ทุกคนใน org เดียวกัน
  // ─────────────────────────────────────────────────────────────
  @SubscribeMessage("submit-metric")
  async handleSubmitMetric(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serviceId: string; latency: number; status: string },
  ) {
    console.log("raw data:", data, typeof data);
    // save metric ลง database
    const metric = await this.prisma.metric.create({
      data: {
        serviceId: data.serviceId,
        latency: data.latency,
        status: data.status,
      },
    });

    // broadcast ไปทุก client ใน org room
    // this.server.to(room).emit(event, data)
    const orgId = client.data.orgId;

    await this.redis.publisher.publish(
      "metric-update",
      JSON.stringify({ orgId, metric }),
    );

    // ส่ง ack กลับไปหา client ที่ submit
    return { success: true, metric };
  }
}
