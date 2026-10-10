import { Module } from '@nestjs/common';

import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { AdminAudioSettingsController } from './admin-audio-settings.controller.js';
import { AudioSettingsController } from './audio-settings.controller.js';
import { AudioSettingsService } from './application/audio-settings.service.js';

@Module({
  controllers: [AudioSettingsController, AdminAudioSettingsController],
  exports: [AudioSettingsService],
  imports: [AiGatewayModule],
  providers: [AudioSettingsService],
})
export class AudioSettingsModule {}
