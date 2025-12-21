import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminStoryBriefForm from './pages/AdminStoryBriefForm';
import GenerateDraftPage from './pages/GenerateDraftPage';
import SpecialistDraftReview from './pages/SpecialistDraftReview';
import SpecialistDraftList from './pages/SpecialistDraftList';
import SpecialistStoryPromptPreview from './pages/SpecialistStoryPromptPreview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/specialist/create-brief" replace />} />
        <Route path="/specialist/create-brief" element={<AdminStoryBriefForm />} />
        <Route path="/specialist/generate-draft" element={<GenerateDraftPage />} />
        <Route path="/specialist/drafts" element={<SpecialistDraftList />} />
        <Route path="/specialist/drafts/:draftId" element={<SpecialistDraftReview />} />
        <Route path="/specialist/story-briefs/:briefId/prompt-preview" element={<SpecialistStoryPromptPreview />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
