<?php

declare(strict_types=1);

namespace SMSPit;

/** Thrown when the underlying HTTP request itself fails (network error, non-JSON response). */
class TransportException extends \RuntimeException
{
}
