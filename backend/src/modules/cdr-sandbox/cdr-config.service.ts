import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CdrConfigService {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scope: string;
  readonly authorizeEndpoint: string;
  readonly parEndpoint: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.must('CDR_CLIENT_ID');
    this.redirectUri = this.must('CDR_REDIRECT_URI');
    this.scope = this.must('CDR_SCOPE');
    this.authorizeEndpoint = this.must('CDR_AUTHORIZE_ENDPOINT');
    this.parEndpoint = this.must('CDR_PAR_ENDPOINT');
  }

  private must(key: string): string {
    const v = this.config.get<string>(key);
    if (!v) throw new Error(`Missing env var: ${key}`);
    return v;
  }
}
