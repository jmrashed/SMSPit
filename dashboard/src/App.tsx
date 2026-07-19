import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<InboxPage />} />
        <Route path="/messages/:id" element={<MessageDetailPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
