import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// AI enrichment must never block or fail a capture -- ai-service being
// down, slow, or absent (Day 66+ is optional infra, not a hard
// dependency) should degrade to "not detected/classified", not a 5xx here.
const REQUEST_TIMEOUT_MS = 2000;

export type MessageCategory = 'otp' | 'transactional' | 'marketing' | 'other';

@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name);

  constructor(private readonly config: ConfigService) {}

  async detectOtp(message: string): Promise<string | null> {
    const body = await this.post<{ otp: string | null }>('/detect-otp', message);
    return body?.otp ?? null;
  }

  async classify(message: string): Promise<MessageCategory | null> {
    const body = await this.post<{ category: MessageCategory }>('/classify', message);
    return body?.category ?? null;
  }

  async detectSpam(message: string): Promise<boolean | null> {
    const body = await this.post<{ is_spam: boolean }>('/detect-spam', message);
    return body?.is_spam ?? null;
  }

  private async post<T>(path: string, message: string): Promise<T | null> {
    const baseUrl = this.config.get<string>('AI_SERVICE_URL');
    if (!baseUrl) {
      return null;
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`ai-service returned ${response.status} for ${path}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`ai-service unreachable for ${path}: ${(error as Error).message}`);
      return null;
    }
  }
}
