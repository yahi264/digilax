<?php
/**
 * Digilax — AI assistant endpoint (optional, for cPanel hosting).
 *
 * Without this file the website assistant answers from its built-in knowledge
 * (js/assistant.js). With it, answers come from Claude, Anthropic's AI model.
 *
 * Setup (once the site is on your own hosting):
 *   1. In cPanel → Terminal (or locally), inside this folder run:
 *        composer require "anthropic-ai/sdk"
 *   2. Create an API key at https://console.anthropic.com and store it OUTSIDE
 *      public_html, in a file named  digilax-ai-key.txt  in your home folder
 *      (one line, the key only). Never put the key in the website files.
 *   3. Upload this folder as public_html/ai/ and set in js/config.js:
 *        aiEndpoint: "ai/assistant.php"
 * Each answer costs a fraction of a cent; MAX_PER_HOUR limits abuse.
 */

use Anthropic\Client;

const MODEL         = 'claude-opus-5-5';
const ALLOWED_HOSTS = ['digilax.com', 'www.digilax.com'];   // PLACEHOLDER: your domain
const MAX_PER_HOUR  = 30;                                    // questions per visitor

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['error' => 'Method not allowed']);
$origin = parse_url($_SERVER['HTTP_ORIGIN'] ?? '', PHP_URL_HOST);
if ($origin && !in_array($origin, ALLOWED_HOSTS, true)) reply(403, ['error' => 'Forbidden']);

$in = json_decode(file_get_contents('php://input', false, null, 0, 40000) ?: '', true);
if (!is_array($in) || !is_array($in['messages'] ?? null)) reply(400, ['error' => 'Invalid request']);

// Keep the last 10 turns, plain text only, user/assistant alternating, starting with the user.
$messages = [];
foreach (array_slice($in['messages'], -10) as $m) {
    $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $text = mb_substr(trim((string) ($m['content'] ?? '')), 0, 1500);
    if ($text === '') continue;
    if ($messages && end($messages)['role'] === $role) { $messages[count($messages) - 1]['content'] .= "\n" . $text; continue; }
    $messages[] = ['role' => $role, 'content' => $text];
}
while ($messages && $messages[0]['role'] !== 'user') array_shift($messages);
if (!$messages || end($messages)['role'] !== 'user') reply(400, ['error' => 'No question']);

// Simple rate limit per IP.
$ipKey = sys_get_temp_dir() . '/dlx_ai_' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
$hits = array_filter(json_decode(@file_get_contents($ipKey) ?: '[]', true) ?: [], fn($t) => $t > time() - 3600);
if (count($hits) >= MAX_PER_HOUR) reply(429, ['error' => 'Too many questions']);
$hits[] = time();
@file_put_contents($ipKey, json_encode(array_values($hits)));

$keyFile = dirname($_SERVER['DOCUMENT_ROOT']) . '/digilax-ai-key.txt';
$apiKey = is_readable($keyFile) ? trim(file_get_contents($keyFile)) : getenv('ANTHROPIC_API_KEY');
if (!$apiKey) reply(503, ['error' => 'Assistant not configured']);

require __DIR__ . '/vendor/autoload.php';

$lang = in_array($in['lang'] ?? '', ['en', 'fr', 'tr', 'ar'], true) ? $in['lang'] : 'en';
$system = <<<TXT
You are the website assistant of Digilax, a web agency that builds websites for small and medium-sized businesses.
Answer visitors' questions briefly (2-5 short sentences), warmly and concretely, in the visitor's language (the page language is "$lang"; if the visitor writes in another language, answer in theirs). Plain text only, no markdown headings.

What Digilax does: business websites; product catalogs; quote/request forms that email the owner and confirm to the client; WhatsApp, Instagram and LinkedIn buttons; multilingual sites (English, French, Turkish, Russian, Arabic with full right-to-left layout); dark/light mode and premium animations; AI assistants for websites; QR codes and business cards; cPanel hosting, domain, SSL and professional email; Google/SEO basics.
Process: free 20-minute call and plan (day 1), design and content (week 1), build and connect (weeks 2-3), launch and support. A one-page site takes about 1 week; a complete site 2-3 weeks.
Prices: there are no fixed prices. After a free call about the client's needs, Digilax sends a clear written quote; nothing starts before the client agrees. Packages: Starter (one page), Business (up to 6 pages, quote form, 2 languages), Pro & Catalog (catalog, up to 5 languages, AI assistant, hosting). Never invent a price.
Portfolio (client names are confidential, never name or guess them): a 1,448-page textile export site in 5 languages; an ENT doctor's practice; an ENT and facial aesthetics clinic; an industrial sourcing and inspection company; a medium-voltage switchgear manufacturer; a bearings distributor; an executive search and HR consultancy; a café QR menu with WhatsApp ordering; a perfume brand; a recruitment request system.
For a quote or anything you can't answer, invite the visitor to use the contact form on the page or WhatsApp. Don't make promises about deadlines or results beyond the information above. Stay on topic: Digilax and websites for businesses.
TXT;

try {
    $client = new Client(apiKey: $apiKey);
    $message = $client->messages->create(
        model: MODEL,
        maxTokens: 2048,
        system: [['type' => 'text', 'text' => $system, 'cacheControl' => ['type' => 'ephemeral']]],
        outputConfig: ['effort' => 'low'],
        messages: $messages,
    );
} catch (\Throwable $e) {
    reply(502, ['error' => 'Assistant unavailable']);   // the website falls back to its built-in answers
}

if ($message->stopReason === 'refusal') reply(200, ['reply' => null]);
$text = '';
foreach ($message->content as $block) {
    if ($block->type === 'text') $text .= $block->text;
}
reply(200, ['reply' => trim($text) ?: null]);
