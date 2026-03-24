import { Module } from '@nestjs/common';

import { AutomationController } from './automation.controller';
import { AutomationRepository } from './automation.repository';
import { AutomationService } from './automation.service';

@Module({
  controllers: [AutomationController],
  providers: [AutomationRepository, AutomationService],
})
export class AutomationModule {}
