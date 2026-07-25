import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ComposePage } from './pages/ComposePage';
import { ToastProvider } from './components/Toast';
import { OrgProvider } from './context/OrgContext';
import { Layout } from './components/Layout';

function App() {
  return (
    <ToastProvider>
      <OrgProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<InboxPage />} />
            <Route path="/messages/:id" element={<MessageDetailPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/compose" element={<ComposePage />} />
          </Routes>
        </Layout>
      </OrgProvider>
    </ToastProvider>
  );
}

export default App;
