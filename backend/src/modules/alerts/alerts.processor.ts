import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

// ─────────────────────────────────────────────────────────────
// AlertJob คือ shape ของ data ที่อยู่ใน job
// ─────────────────────────────────────────────────────────────
export interface AlertJob {
  serviceId: string;
  latency: number;
  threshold: number;
  orgId: string;
  timestamp: string;
}

// @Processor('alerts') → บอกว่า class นี้คือ Worker ของ queue ชื่อ 'alerts'
// WorkerHost → base class ของ @nestjs/bullmq ที่ต้อง override method process()
@Processor('alerts')
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  // process() จะถูกเรียกอัตโนมัติเมื่อมี job เข้ามาใน queue
  async process(job: Job<AlertJob>): Promise<void> {
    const { serviceId, latency, threshold, orgId, timestamp } = job.data;

    this.logger.warn(
      `[Alert] serviceId=${serviceId} | latency=${latency}ms > threshold=${threshold}ms | org=${orgId} | at=${timestamp}`,
    );

    // ─────────────────────────────────────────────────────────────
    // ตัวอย่าง: เพิ่มช่องทางแจ้งเตือนได้ที่นี่
    //   - ส่ง email (nodemailer / sendgrid)
    //   - ส่ง Slack webhook
    //   - บันทึก Alert ลง DB
    // ─────────────────────────────────────────────────────────────
    // await this.emailService.sendAlert(...)
    // await this.slackService.notify(...)
  }
}
