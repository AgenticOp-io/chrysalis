<?php

declare(strict_types=1);

namespace Chrysalis\Oracle;

/**
 * Opt-in mail recording: PHP does not allow replacing the global {@see mail()}
 * from userland. Call {@see Mail::send()} instead of `mail()` when you want a
 * `mail.send` trace event (redaction rules: `mail.to`, `mail.subject`).
 */
final class Mail
{
    /**
     * @param string|array<int|string, string> $to
     */
    public static function send(
        $to,
        string $subject,
        string $message,
        ?string $additionalHeaders = null,
        ?string $additionalParams = null
    ): bool {
        $toStr = is_array($to) ? implode(', ', $to) : (string) $to;
        Recorder::onMailSend($toStr, $subject, strlen($message));

        return mail(
            $toStr,
            $subject,
            $message,
            $additionalHeaders ?? '',
            $additionalParams ?? ''
        );
    }
}
