import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGoogle } from '@langchain/google/node';
import {
    HumanMessage,
    SystemMessage,
} from '@langchain/core/messages';

@Injectable()
export class GeminiClient {
    constructor(
        private readonly configService: ConfigService,
    ) {}

    async generateText(
        instruction: string,
        input: string,
    ): Promise<string> {
        const apiKey: string =
            this.configService.getOrThrow<string>('GOOGLE_API_KEY');

        const model: ChatGoogle = new ChatGoogle({
            apiKey,
            model: 'gemini-3.5-flash-lite',
            maxRetries: 0,
        });

        const messages: Array<SystemMessage | HumanMessage> = [
            new SystemMessage(instruction),
            new HumanMessage(input),
        ];

        const response: Awaited<ReturnType<ChatGoogle['invoke']>> =
            await model.invoke(messages, {
                signal: AbortSignal.timeout(60_000),
            });

        return response.text;
    }
}