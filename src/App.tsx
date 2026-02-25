import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ActivitiesDashboard from './pages/ActivitiesDashboard';
import UserManagement from './pages/UserManagement';
import ActivityEditor from './pages/ActivityEditor';
import UserEditor from './pages/UserEditor';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ActivitiesDashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/activities/:id" element={<ActivityEditor />} />
          <Route path="/users/:id" element={<UserEditor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
