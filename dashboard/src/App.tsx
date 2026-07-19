import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<InboxPage />} />
        <Route path="/messages/:id" element={<MessageDetailPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
