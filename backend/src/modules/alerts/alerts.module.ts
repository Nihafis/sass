import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertsService, ALERTS_QUEUE } from './alerts.service';
import { AlertsProcessor } from './alerts.processor';

@Module({
  imports: [
    // register queue ชื่อ 'alerts' — ต้องใช้ BullModule.forRoot() ที่ AppModule ก่อน
    BullModule.registerQueue({ name: ALERTS_QUEUE }),
  ],
  providers: [AlertsService, AlertsProcessor],
  // export AlertsService เพื่อให้ MetricsModule ใช้ได้
  exports: [AlertsService],
})
export class AlertsModule {}
