import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Child from './pages/child/child.tsx';
import Team from './pages/team/team.tsx';
import Individual from './pages/individual/individual.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/child" element={<Child />} />
        <Route path="/team" element={<Team />} />
        <Route path="/individual" element={<Individual />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
