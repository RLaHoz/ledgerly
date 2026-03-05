import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';

@Injectable()
export class PkceService {
  generateVerifier(): string {
    return this.base64Url(randomBytes(32));
  }

  challengeFromVerifier(verifier: string): string {
    const hash = createHash('sha256').update(verifier).digest();
    return this.base64Url(hash);
  }

  private base64Url(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
