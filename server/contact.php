<?php
/**
 * Digilax — quote request endpoint for cPanel hosting.
 *
 * How to use it (once the site is on your own hosting):
 *   1. Upload this file next to index.html (the website root).
 *   2. Change RECIPIENT and SENDER below to your real address on your domain.
 *   3. In js/config.js set:  formEndpoint: "contact.php"
 * The form then emails each request to you and sends the client a short confirmation.
 * (GitHub Pages cannot run PHP; there the form uses WhatsApp / email instead.)
 */

const RECIPIENT    = 'hello@digilax.com';   // PLACEHOLDER: where requests are delivered
const SENDER       = 'hello@digilax.com';   // PLACEHOLDER: must be an address on your own domain
const SENDER_NAME  = 'Digilax Website';
const MAX_PER_HOUR = 8;                     // per visitor, against spam

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['error' => 'Method not allowed']);

$in = json_decode(file_get_contents('php://input', false, null, 0, 100000) ?: '', true);
if (!is_array($in)) reply(400, ['error' => 'Invalid request']);

// Bots fill the hidden "website" field: pretend success, send nothing.
if (!empty($in['website'])) reply(200, ['ok' => true]);

function field(array $in, string $key, int $max): string {
    $v = isset($in[$key]) && is_scalar($in[$key]) ? trim((string) $in[$key]) : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
$name    = field($in, 'name', 120);
$company = field($in, 'company', 160);
$email   = field($in, 'email', 160);
$phone   = field($in, 'phone', 40);
$needs   = field($in, 'needs', 300);
$plan    = field($in, 'plan', 60);
$message = field($in, 'message', 4000);
$locale  = in_array($in['locale'] ?? '', ['en', 'fr', 'tr', 'ar'], true) ? $in['locale'] : 'en';

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';
if ($name === '' || $message === '' || ($email === '' && strlen(preg_replace('/\D/', '', $phone)) < 7)) {
    reply(422, ['error' => 'Missing fields']);
}

// Simple rate limit per IP, stored in the system temp folder.
$ipKey = sys_get_temp_dir() . '/dlx_' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
$hits = array_filter(json_decode(@file_get_contents($ipKey) ?: '[]', true) ?: [], fn($t) => $t > time() - 3600);
if (count($hits) >= MAX_PER_HOUR) reply(429, ['error' => 'Too many requests']);
$hits[] = time();
@file_put_contents($ipKey, json_encode(array_values($hits)));

$enc = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . $enc(SENDER_NAME) . ' <' . SENDER . '>',
];

// 1) Email to you
$body = "New project request from the Digilax website\n\n"
      . "Name:     $name\n"
      . ($company ? "Business: $company\n" : '')
      . ($email ? "Email:    $email\n" : '')
      . ($phone ? "Phone:    $phone\n" : '')
      . ($needs ? "Needs:    $needs\n" : '')
      . ($plan ? "Package:  $plan\n" : '')
      . "Language: $locale\n\nMessage:\n$message\n";
$toOwner = $headers;
if ($email) $toOwner[] = 'Reply-To: ' . $email;
$sent = mail(RECIPIENT, $enc("New request — $name"), $body, implode("\r\n", $toOwner), '-f' . SENDER);
if (!$sent) reply(500, ['error' => 'Mail failed']);

// 2) Confirmation to the client, in their language
if ($email) {
    $copy = [
        'en' => ["We received your request", "Hello $name,\n\nThank you for contacting Digilax. We received your request and will reply within one working day.\n\n— Digilax"],
        'fr' => ["Nous avons bien reçu votre demande", "Bonjour $name,\n\nMerci d'avoir contacté Digilax. Nous avons bien reçu votre demande et vous répondrons sous un jour ouvré.\n\n— Digilax"],
        'tr' => ["Talebinizi aldık", "Merhaba $name,\n\nDigilax ile iletişime geçtiğiniz için teşekkürler. Talebinizi aldık, bir iş günü içinde dönüş yapacağız.\n\n— Digilax"],
        'ar' => ["تلقّينا طلبك", "مرحباً $name،\n\nشكراً لتواصلك مع Digilax. لقد تلقّينا طلبك وسنرد عليك خلال يوم عمل واحد.\n\n— Digilax"],
    ][$locale];
    @mail($email, $enc($copy[0]), $copy[1], implode("\r\n", $headers), '-f' . SENDER);
}

reply(200, ['ok' => true]);
