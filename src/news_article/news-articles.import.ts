import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NewsArticlesService } from './news-articles.service';

@Injectable()
export class NewsArticlesImport {
  private readonly logger: Logger = new Logger(NewsArticlesImport.name);

  constructor(private readonly newsArticlesService: NewsArticlesService) {}

  @Cron('0 */10 * * * *', {
    name: 'news-articles-import',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    const startedAt: number = Date.now();

    this.logger.log('News import started');

    try {
      const processedCount: number =
        await this.newsArticlesService.importLatestArticles();

      const durationMs: number = Date.now() - startedAt;

      this.logger.log(
        `News import completed: ` +
          `processed=${processedCount}, durationMs=${durationMs}`,
      );
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.message : 'Unknown import error';

      this.logger.error(`News import failed: ${message}`);
    }
  }
}
