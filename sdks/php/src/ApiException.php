<?php

declare(strict_types=1);

namespace SMSPit;

/** Thrown when SMSPit responds with a non-2xx status, carrying its error envelope (code/message/details). */
class ApiException extends \RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly mixed $details = null,
    ) {
        parent::__construct($message);
    }
}
