import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminStoryBriefForm from './pages/AdminStoryBriefForm';
import GenerateDraftPage from './pages/GenerateDraftPage';
import SpecialistDraftReview from './pages/SpecialistDraftReview';
import SpecialistDraftList from './pages/SpecialistDraftList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/specialist/create-brief" replace />} />
        <Route path="/specialist/create-brief" element={<AdminStoryBriefForm />} />
        <Route path="/specialist/generate-draft" element={<GenerateDraftPage />} />
        <Route path="/specialist/drafts" element={<SpecialistDraftList />} />
        <Route path="/specialist/drafts/:draftId" element={<SpecialistDraftReview />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
