<?php

declare(strict_types=1);

namespace SMSPit;

/** Read-only projection of a captured message, matching the REST response shape (docs/api/message-mapping.md). */
final class Message
{
    public function __construct(
        public readonly string $id,
        public readonly string $to,
        public readonly string $from,
        public readonly string $message,
        public readonly string $status,
        public readonly ?string $otp,
        public readonly ?string $category,
        public readonly ?bool $isSpam,
        public readonly ?string $replayedFrom,
        public readonly ?int $orgId,
        public readonly string $createdAt,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            to: $data['to'],
            from: $data['from'],
            message: $data['message'],
            status: $data['status'],
            otp: $data['otp'] ?? null,
            category: $data['category'] ?? null,
            isSpam: $data['is_spam'] ?? null,
            replayedFrom: $data['replayed_from'] ?? null,
            orgId: $data['org_id'] ?? null,
            createdAt: $data['created_at'],
        );
    }
}
