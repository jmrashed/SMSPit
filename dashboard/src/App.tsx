import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<InboxPage />} />
      <Route path="/messages/:id" element={<MessageDetailPage />} />
    </Routes>
  );
}

export default App;
