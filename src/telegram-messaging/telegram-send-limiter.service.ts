import { Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

@Injectable()
export class TelegramSendLimiter {
  private readonly globalIntervalMs: number = 50;
  private readonly chatIntervalMs: number = 1000;

  private nextGlobalSendAt: number = 0;

  private readonly nextChatSendAt: Map<string, number> = new Map<
    string,
    number
  >();

  private queue: Promise<void> = Promise.resolve();

  execute<T>(telegramId: string, operation: () => Promise<T>): Promise<T> {
    const result: Promise<T> = this.queue.then(async (): Promise<T> => {
      await this.waitForSlot(telegramId);

      return operation();
    });

    // Ошибка остаётся в result, но не блокирует будущие вызовы.
    this.queue = result.then(
      (): void => {},
      (): void => {},
    );

    return result;
  }

  private async waitForSlot(telegramId: string): Promise<void> {
    const nextChatSendAt: number = this.nextChatSendAt.get(telegramId) ?? 0;

    const allowedAt: number = Math.max(this.nextGlobalSendAt, nextChatSendAt);

    let waitMs: number = allowedAt - performance.now();

    while (waitMs > 0) {
      await delay(Math.ceil(waitMs));

      waitMs = allowedAt - performance.now();
    }

    const startedAt: number = performance.now();

    this.removeExpiredChats(startedAt);

    this.nextGlobalSendAt = startedAt + this.globalIntervalMs;

    this.nextChatSendAt.set(telegramId, startedAt + this.chatIntervalMs);
  }

  private removeExpiredChats(now: number): void {
    this.nextChatSendAt.forEach(
      (allowedAt: number, telegramId: string): void => {
        if (allowedAt <= now) {
          this.nextChatSendAt.delete(telegramId);
        }
      },
    );
  }
}
