"use client";
import React from 'react';
import LandingView from '../components/LandingView';

interface PageProps {
  onStart: () => void;
}

const HomePage: React.FC<PageProps> = ({ onStart }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 pt-32 pb-32">
      <LandingView onStart={onStart} />
    </div>
  );
};

export default HomePage;