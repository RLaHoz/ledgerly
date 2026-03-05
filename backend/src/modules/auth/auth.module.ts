import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { CdrAuthModule } from '../cdr-auth/cdr-auth.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [CdrAuthModule],
})
export class AuthModule {}
