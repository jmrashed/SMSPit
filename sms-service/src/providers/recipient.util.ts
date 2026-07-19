import { BadRequestException } from '@nestjs/common';

// Provider adapters accept a comma-separated string, a single string, or
// an array of recipients (MessageBird supports all three); SMSPit's
// capture model is one message per call (see
// docs/api/provider-compatibility.md#unsupported), so only the first
// recipient is captured.
export function firstRecipient(recipients: string | string[] | undefined): string {
  if (Array.isArray(recipients)) {
    const first = recipients.find((r) => r && r.trim().length > 0);
    if (!first) {
      throw new BadRequestException('recipients must contain at least one non-empty value');
    }
    return first.trim();
  }

  if (typeof recipients === 'string') {
    const first = recipients
      .split(',')
      .map((r) => r.trim())
      .find((r) => r.length > 0);
    if (!first) {
      throw new BadRequestException('recipients must contain at least one non-empty value');
    }
    return first;
  }

  throw new BadRequestException('recipients is required');
}
