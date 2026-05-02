import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import {
  Building2,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  DoorOpen,
  FileText,
  Gauge,
  LayoutDashboard,
  LogIn,
  LogOut,
  LucideAngularModule,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-angular';
import { authTokenInterceptor } from './core/http/auth-token.interceptor';
import { apiUrlInterceptor } from './core/http/api-url.interceptor';
import { TranslocoHttpLoader } from './core/i18n/transloco-http-loader';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    importProvidersFrom(
      LucideAngularModule.pick({
        Building2,
        Bell,
        CheckCircle2,
        ChevronRight,
        CircleAlert,
        ClipboardList,
        DoorOpen,
        FileText,
        Gauge,
        LayoutDashboard,
        LogIn,
        LogOut,
        Pencil,
        Plus,
        Power,
        RefreshCw,
        RotateCcw,
        Save,
        Search,
        ShieldCheck,
        Trash2,
        UserCheck,
        Users,
        X,
      }),
    ),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiUrlInterceptor, authTokenInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['pt', 'en', 'es'],
        defaultLang: 'pt',
        fallbackLang: 'pt',
        prodMode: true,
        reRenderOnLangChange: true,
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
