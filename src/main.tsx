import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import App from './App.tsx';

// Формы подачи заявок
import ChildForm from './pages/forms/child.tsx';
import TeamForm from './pages/forms/team.tsx';
import IndividualForm from './pages/forms/individual.tsx';

// Голосование
import ChildVoting from './pages/voting/child.tsx';
import TeamVoting from './pages/voting/team.tsx';
import IndividualVoting from './pages/voting/individual.tsx';

// Админка
import Admin from './pages/admin/admin.tsx';
import Results from './pages/results/results.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        {/* Формы подачи заявок */}
        <Route path="/child-form" element={<ChildForm />} />
        <Route path="/team-form" element={<TeamForm />} />
        <Route path="/individual-form" element={<IndividualForm />} />

        {/* Голосование */}
        <Route path="/vote/child" element={<ChildVoting />} />
        <Route path="/vote/team" element={<TeamVoting />} />
        <Route path="/vote/individual" element={<IndividualVoting />} />

        {/* Админка */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
