import { io } from "socket.io-client";

const BASE = "http://localhost:3000";
const EMAIL = `test_${Date.now()}@example.com`;

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) { console.error("❌", path, data); process.exit(1); }
  return data;
}

async function main() {
  // 1. Register
  console.log("\n▶ 1. Register");
  await post("/auth/register", { email: EMAIL, password: "Password123" });
  console.log("✅ registered:", EMAIL);

  // 2. Login → JWT
  console.log("\n▶ 2. Login");
  const { accessToken } = await post("/auth/login", {
    email: EMAIL,
    password: "Password123",
  });
  console.log("✅ accessToken:", accessToken.slice(0, 40) + "...");

  // 3. Create Org
  console.log("\n▶ 3. Create Org");
  const org = await post("/organizations", { name: "Alert Test Org" }, accessToken);
  console.log("✅ orgId:", org.id);

  // 4. ต้องการ serviceId — insert ผ่าน prisma studio หรือใส่ SERVICE_ID env
  const serviceId = process.env.SERVICE_ID;
  if (!serviceId) {
    console.error("\n❌ ต้องตั้งค่า SERVICE_ID ก่อน:");
    console.error("   1. เปิด Prisma Studio: npx prisma studio");
    console.error(`   2. เพิ่ม Service: organizationId=${org.id}, name=api-server`);
    console.error("   3. copy service.id มาใส่:");
    console.error("      SERVICE_ID=<uuid> node test-alert.mjs");
    process.exit(1);
  }

  // 5. WebSocket test
  console.log("\n▶ 5. Connect WebSocket /metrics");
  await testWS(accessToken, org.id, serviceId);
}

function testWS(token, orgId, serviceId) {
  return new Promise((resolve, reject) => {
    const socket = io(`${BASE}/metrics`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", async () => {
      console.log("✅ Connected:", socket.id);

      socket.emit("join-org", { orgId });
      console.log("\n▶ 6. join-org emitted");
      await sleep(300);

      socket.emit("submit-metric", { serviceId, latency: 200, status: "ok" });
      console.log("\n▶ 7a. submit-metric latency=200ms emitted");
      await sleep(500);

      socket.emit("submit-metric", { serviceId, latency: 1500, status: "slow" });
      console.log("\n▶ 7b. submit-metric latency=1500ms emitted");
      await sleep(1000);

      console.log("\n🎉 ดู backend terminal:");
      console.log("   [AlertsProcessor] WARN [Alert] serviceId=... latency=1500ms > threshold=1000ms");

      socket.disconnect();
      resolve();
    });

    socket.on("metric-update", (m) => console.log("\n📡 metric-update:", m));
    socket.on("connect_error", (e) => { console.error("❌ WS error:", e.message); reject(e); });
    setTimeout(() => reject(new Error("timeout")), 15_000);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch(console.error);