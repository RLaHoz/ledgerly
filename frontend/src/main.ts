import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { inject, provideAppInitializer } from '@angular/core';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { buildIonicConfig } from './app/core/config/ionic-config';
import { RuntimeConfigService } from './app/core/config/runtime-config.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIonicAngular(buildIonicConfig(Capacitor.isNativePlatform())),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAppInitializer(() => inject(RuntimeConfigService).load()),
  ],
});
