import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { CdrAuthModule } from '../cdr-auth/cdr-auth.module';
import { PrismaModule } from 'src/sourceDB/database/prisma.module';
import { AuthGuard } from './guards/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { RulesModule } from '../rules/rules.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    JwtModule.register({}),
    PrismaModule,
    CdrAuthModule,
    RulesModule,
    CategoriesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [SessionService],
})
export class AuthModule {}
