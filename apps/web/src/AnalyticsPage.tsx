import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ClicksChart } from './ClicksChart.tsx';
import { ReferrersTable } from './ReferrersTable.tsx';

export type ClicksByDay = {
  day: string;
  clicks: number;
};

export type Referrer = {
  referrer: string | null;
  clicks: number;
};

type Stats = {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  clicksByDay: ClicksByDay[];
  topReferrers: Referrer[];
};

type PageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'success'; stats: Stats };

export function AnalyticsPage() {
  const { code = '' } = useParams();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const loadStats = useCallback(async () => {
    setState({ status: 'loading' });
    setCopyStatus('idle');

    try {
      const response = await fetch(`/api/stats/${code}`);
      if (response.status === 404) {
        setState({ status: 'not-found' });
        return;
      }
      if (!response.ok) throw new Error('Could not load analytics');

      const stats = (await response.json()) as Stats;
      setState({ status: 'success', stats });
    } catch {
      setState({ status: 'error' });
    }
  }, [code]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (state.status === 'loading') {
    return (
      <main className="state-page" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading analytics…</p>
      </main>
    );
  }

  if (state.status === 'not-found') {
    return (
      <main className="state-page">
        <p className="eyebrow">Short link analytics</p>
        <h1>Link not found</h1>
        <p>
          No analytics are available for <code>{code}</code>.
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="state-page">
        <p className="eyebrow">Short link analytics</p>
        <h1>Unable to load analytics</h1>
        <p>Check your connection and try again.</p>
        <button className="primary-button" type="button" onClick={loadStats}>
          Retry
        </button>
      </main>
    );
  }

  const { stats } = state;
  const shortUrl = new URL(`/${stats.shortCode}`, window.location.origin).toString();

  async function copyShortUrl() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <main className="analytics-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Short link analytics</p>
          <h1>Analytics</h1>
        </div>
        <div className="code-badge">/{stats.shortCode}</div>
      </header>

      <section className="link-card" aria-label="Link details">
        <div className="link-detail">
          <span>Destination</span>
          <a href={stats.originalUrl}>{stats.originalUrl}</a>
        </div>
        <div className="link-detail">
          <span>Short URL</span>
          <a href={shortUrl}>{shortUrl}</a>
        </div>
        <button
          className="copy-button"
          type="button"
          aria-label="Copy short URL"
          onClick={copyShortUrl}
        >
          {copyStatus === 'copied' ? 'Copied' : 'Copy link'}
        </button>
        {copyStatus === 'failed' && (
          <span className="copy-error" role="status">
            Could not copy
          </span>
        )}
      </section>

      <section className="metric-card" aria-label="Total clicks">
        <span>Total clicks</span>
        <strong>{stats.totalClicks}</strong>
      </section>

      <div className="analytics-grid">
        <ClicksChart data={stats.clicksByDay} />
        <ReferrersTable referrers={stats.topReferrers} />
      </div>
    </main>
  );
}
