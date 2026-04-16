import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AlertJob } from "./alerts.processor";

export const ALERTS_QUEUE = "alerts";
export const ALERT_HIGH_LATENCY = "alert.high-latency"; // job name

@Injectable()
export class AlertsService {
  constructor(
    // @InjectQueue('alerts') → inject Queue instance ที่ชื่อ 'alerts'
    @InjectQueue(ALERTS_QUEUE) private readonly alertsQueue: Queue,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // triggerHighLatencyAlert — เพิ่ม job เข้า queue
  // BullMQ จะส่ง job ไปให้ AlertsProcessor.process() โดยอัตโนมัติ
  // ─────────────────────────────────────────────────────────────
  async triggerHighLatencyAlert(
    data: Omit<AlertJob, "timestamp">,
  ): Promise<void> {
    await this.alertsQueue.add(ALERT_HIGH_LATENCY, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
