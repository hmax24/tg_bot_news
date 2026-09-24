export class TopicCallbackValidator {
  private static readonly maxTopicId: number = 2_147_483_647;
  static parseTopicId(callbackData: string, prefix: string): number | null {
    if (!callbackData.startsWith(prefix)) {
      return null;
    }

    const value: string = callbackData.slice(prefix.length);

    if (!/^[1-9]\d{0,9}$/.test(value)) {
      return null;
    }

    const topicId: number = Number(value);

    return Number.isInteger(topicId) && topicId <= this.maxTopicId
      ? topicId
      : null;
  }
}
