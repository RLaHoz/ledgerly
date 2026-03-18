import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import https from 'node:https';
import type { AgentOptions } from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CdrClient } from './cdr.client';
import { PkceService } from './pkce.service';

function resolveRequiredPath(pathValue: string, envName: string): string {
  const absolutePath = resolve(process.cwd(), pathValue);
  if (!existsSync(absolutePath)) {
    throw new Error(
      `${envName} points to "${absolutePath}" but the file does not exist.`,
    );
  }

  return absolutePath;
}

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const parEndpoint = config.getOrThrow<string>('CDR_PAR_ENDPOINT');
        const parHostname = new URL(parEndpoint).hostname;

        const configuredCaPath = config.get<string>('CDR_CA_BUNDLE_PATH');
        const caPath = resolveRequiredPath(
          configuredCaPath?.trim().length
            ? configuredCaPath
            : './certs/cdrsandbox/cdr-sandbox-ca.pem',
          'CDR_CA_BUNDLE_PATH',
        );

        const ca = readFileSync(caPath);
        const mtlsPfxPath = config.get<string>('CDR_MTLS_PFX_PATH')?.trim();
        const mtlsPfxPassphrase =
          config.get<string>('CDR_MTLS_PFX_PASSPHRASE') ?? undefined;
        const mtlsCertPath = config.get<string>('CDR_MTLS_CERT_PATH')?.trim();
        const mtlsKeyPath = config.get<string>('CDR_MTLS_KEY_PATH')?.trim();
        const mtlsKeyPassphrase =
          config.get<string>('CDR_MTLS_KEY_PASSPHRASE') ?? undefined;

        const httpsAgentOptions: AgentOptions = {
          ca,
          keepAlive: true,
          servername: parHostname,
        };

        if (mtlsPfxPath) {
          const pfxPath = resolveRequiredPath(mtlsPfxPath, 'CDR_MTLS_PFX_PATH');
          httpsAgentOptions.pfx = readFileSync(pfxPath);
          httpsAgentOptions.passphrase = mtlsPfxPassphrase;
        } else if (mtlsCertPath || mtlsKeyPath) {
          if (!mtlsCertPath || !mtlsKeyPath) {
            throw new Error(
              'Set both CDR_MTLS_CERT_PATH and CDR_MTLS_KEY_PATH for mTLS PEM authentication.',
            );
          }

          const certPath = resolveRequiredPath(
            mtlsCertPath,
            'CDR_MTLS_CERT_PATH',
          );
          const keyPath = resolveRequiredPath(mtlsKeyPath, 'CDR_MTLS_KEY_PATH');
          httpsAgentOptions.cert = readFileSync(certPath);
          httpsAgentOptions.key = readFileSync(keyPath);
          httpsAgentOptions.passphrase = mtlsKeyPassphrase;
        }

        const httpsAgent = new https.Agent(httpsAgentOptions);

        return {
          timeout: config.get<number>('CDR_TIMEOUT_MS') ?? 15000,
          maxRedirects: 0,
          httpsAgent,
        };
      },
    }),
  ],
  providers: [CdrClient, PkceService],
  exports: [CdrClient], // 👈 IMPORTANTÍSIMO para que AuthModule lo vea
})
export class CdrModule {}
