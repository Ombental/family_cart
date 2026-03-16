import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/i18n/LanguageContext';

const DISMISSED_KEY = 'familycart_notif_prompt_dismissed';

export function NotificationPrompt() {
  const { permissionStatus, requestPermission } = useNotifications();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  // Don't render if: already granted, denied, unsupported, or dismissed
  if (permissionStatus !== 'default' || dismissed) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">{t('notifications.enableTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('notifications.enableDescription')}
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={requestPermission}>
                {t('notifications.enable')}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:underline"
                onClick={handleDismiss}
              >
                {t('notifications.notNow')}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
