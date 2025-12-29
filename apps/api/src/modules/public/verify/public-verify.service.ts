import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

function nowMs() {
  return Date.now();
}

function randomDigits(len: number) {
  let s = '';
  for (let i = 0; i < len; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

type VerifyEntry = { code: string; expireAt: number };

@Injectable()
export class PublicVerifyService {
  private readonly store = new Map<string, VerifyEntry>();
  private readonly ttlMs = 2 * 60 * 1000; // 2 minutes

  issueSvg(keyRaw: string) {
    const key = String(keyRaw || '').trim();
    if (!key) throw new BadRequestException('缺少 key');
    if (key.length > 128) throw new BadRequestException('key 过长');

    const code = randomDigits(4);
    const expireAt = nowMs() + this.ttlMs;
    this.store.set(key, { code, expireAt });

    const noise = crypto.randomBytes(8).toString('hex').slice(0, 8);
    const text = escapeXml(code);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
  <rect width="120" height="40" rx="8" ry="8" fill="#f5f5f5"/>
  <path d="M8 28 C 25 5, 45 45, 65 12 S 95 40, 112 18" stroke="#d0d0d0" stroke-width="2" fill="none" opacity="0.7"/>
  <text x="16" y="27" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#333" letter-spacing="6">${text}</text>
  <text x="92" y="14" font-family="Arial, sans-serif" font-size="10" fill="#999">${escapeXml(noise)}</text>
</svg>`;
  }

  verify(keyRaw: string, codeRaw: string) {
    const key = String(keyRaw || '').trim();
    const input = String(codeRaw || '').trim();
    if (!key || !input) return false;
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expireAt < nowMs()) {
      this.store.delete(key);
      return false;
    }
    const ok = entry.code.toLowerCase() === input.toLowerCase();
    if (ok) this.store.delete(key);
    return ok;
  }
}

