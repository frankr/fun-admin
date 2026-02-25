import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ActivitiesDashboard from './pages/ActivitiesDashboard';
import UserManagement from './pages/UserManagement';
import ActivityEditor from './pages/ActivityEditor';
import UserEditor from './pages/UserEditor';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ActivitiesDashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/activities/:id" element={<ActivityEditor />} />
          <Route path="/users/:id" element={<UserEditor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
