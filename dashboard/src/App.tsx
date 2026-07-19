import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { ComposePage } from './pages/ComposePage';
import { ToastProvider } from './components/Toast';
import { OrgProvider } from './context/OrgContext';

function App() {
  return (
    <ToastProvider>
      <OrgProvider>
        <Routes>
          <Route path="/" element={<InboxPage />} />
          <Route path="/messages/:id" element={<MessageDetailPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/compose" element={<ComposePage />} />
        </Routes>
      </OrgProvider>
    </ToastProvider>
  );
}

export default App;
