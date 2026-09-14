import type { Referrer } from './AnalyticsPage.tsx';

type ReferrersTableProps = {
  referrers: Referrer[];
};

export function ReferrersTable({ referrers }: ReferrersTableProps) {
  return (
    <section className="panel referrers-panel" aria-labelledby="referrers-heading">
      <h2 id="referrers-heading">Top referrers</h2>
      <table aria-label="Top referrers">
        <thead>
          <tr>
            <th scope="col">Referrer</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {referrers.map(({ referrer, clicks }) => (
            <tr key={referrer ?? 'direct'}>
              <td title={referrer ?? 'direct'}>{referrer ?? 'direct'}</td>
              <td>{clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {referrers.length === 0 && <p>No referrers yet.</p>}
    </section>
  );
}
