import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<InboxPage />} />
        <Route path="/messages/:id" element={<MessageDetailPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
