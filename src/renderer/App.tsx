import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountsPage } from './pages/AccountsPage';
import { ContentPage } from './pages/ContentPage';
import { HelpPage } from './pages/HelpPage';
import { HomePage } from './pages/HomePage';
import { QueuePage } from './pages/QueuePage';
import { RunsPage } from './pages/RunsPage';
import { SettingsPage } from './pages/SettingsPage';

type View = 'home' | 'content' | 'distribution' | 'accounts' | 'runs' | 'settings' | 'help';

const views: Array<{ id: View; labelKey: string }> = [
  { id: 'home', labelKey: 'nav.home' },
  { id: 'content', labelKey: 'nav.content' },
  { id: 'distribution', labelKey: 'nav.distribution' },
  { id: 'accounts', labelKey: 'nav.accounts' },
  { id: 'runs', labelKey: 'nav.runs' },
  { id: 'settings', labelKey: 'nav.settings' },
  { id: 'help', labelKey: 'nav.help' },
];

export function App() {
  const [view, setView] = useState<View>('home');
  const { t } = useTranslation();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">{t('app.eyebrow')}</p>
          <h1>{t('app.title')}</h1>
          <p className="runtime-badge">{window.weiboPublisher ? 'Electron bridge' : 'Local API bridge'}</p>
        </div>
        <nav>
          {views.map((item) => (
            <button
              className={item.id === view ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        {view === 'home' && <HomePage />}
        {view === 'content' && <ContentPage />}
        {view === 'distribution' && <QueuePage />}
        {view === 'accounts' && <AccountsPage />}
        {view === 'runs' && <RunsPage />}
        {view === 'settings' && <SettingsPage />}
        {view === 'help' && <HelpPage />}
      </section>
    </main>
  );
}
