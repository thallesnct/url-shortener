import { Route, Routes, useParams } from 'react-router';

function AnalyticsPlaceholder() {
  const { code } = useParams();

  return (
    <main>
      <h1>Analytics</h1>
      <p>{code}</p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/analytics/:code" element={<AnalyticsPlaceholder />} />
      <Route path="*" element={<h1>Not found</h1>} />
    </Routes>
  );
}
