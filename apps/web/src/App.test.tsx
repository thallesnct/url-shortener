import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="clicks-bar-chart" data-point-count={data.length}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const statsPayload = {
  shortCode: 'abc1234',
  originalUrl: 'https://example.com/a-long-path',
  totalClicks: 42,
  clicksByDay: Array.from({ length: 30 }, (_, index) => ({
    day: `2026-08-${String(index + 1).padStart(2, '0')}`,
    clicks: index,
  })),
  topReferrers: [
    { referrer: 'https://search.example', clicks: 17 },
    { referrer: null, clicks: 9 },
  ],
};

function renderAnalytics() {
  return render(
    <MemoryRouter initialEntries={['/analytics/abc1234']}>
      <App />
    </MemoryRouter>,
  );
}

function stubStatsResponse(payload = statsPayload) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('AC1: renders the link and click total returned by the stats endpoint', async () => {
    const fetchMock = stubStatsResponse();

    renderAnalytics();

    expect(screen.getByText('Loading analytics…')).toBeInTheDocument();
    expect(await screen.findByText(statsPayload.originalUrl)).toBeInTheDocument();
    expect(screen.getByText('http://localhost:3000/abc1234')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/stats/abc1234');
  });

  it('AC2: charts all 30 days and renders referrers with direct traffic labeled', async () => {
    stubStatsResponse();

    renderAnalytics();

    const chart = await screen.findByTestId('clicks-bar-chart');
    expect(chart).toHaveAttribute('data-point-count', '30');

    const table = screen.getByRole('table', { name: 'Top referrers' });
    expect(within(table).getByText('https://search.example')).toBeInTheDocument();
    expect(within(table).getByText('direct')).toBeInTheDocument();
    expect(within(table).getByText('17')).toBeInTheDocument();
    expect(within(table).getByText('9')).toBeInTheDocument();
  });

  it('AC3: renders a link-not-found state with the requested code for a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    renderAnalytics();

    expect(await screen.findByRole('heading', { name: 'Link not found' })).toBeInTheDocument();
    expect(screen.getByText(/abc1234/)).toBeInTheDocument();
  });

  it('AC3: renders a network error and retries the request', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(statsPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    renderAnalytics();

    expect(
      await screen.findByRole('heading', { name: 'Unable to load analytics' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText(statsPayload.originalUrl)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('AC4: copies the short URL and confirms it was copied', async () => {
    stubStatsResponse();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    renderAnalytics();

    fireEvent.click(await screen.findByRole('button', { name: 'Copy short URL' }));

    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/abc1234');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('AC5: loads a fresh analytics URL without reading browser storage', async () => {
    const storageRead = vi.spyOn(Storage.prototype, 'getItem');
    stubStatsResponse();

    renderAnalytics();

    expect(await screen.findByText(statsPayload.originalUrl)).toBeInTheDocument();
    expect(storageRead).not.toHaveBeenCalled();
  });

  it('renders not found for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});
