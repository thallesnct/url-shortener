import { Route, Routes } from 'react-router';
import { AnalyticsPage } from './AnalyticsPage.tsx';

export function App() {
  return (
    <Routes>
      <Route path="/analytics/:code" element={<AnalyticsPage />} />
      <Route path="*" element={<h1>Not found</h1>} />
    </Routes>
  );
}
