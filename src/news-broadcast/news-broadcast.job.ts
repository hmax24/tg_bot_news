import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { NewsBroadcastProcessor } from './news-broadcast-processor.service';

@Injectable()
export class NewsBroadcastJob {
  constructor(private readonly processor: NewsBroadcastProcessor) {}

  @Cron('*/5 * * * * *', {
    name: 'news-broadcast',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    await this.processor.processNext();
  }
}
