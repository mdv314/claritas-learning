'use client';

import React, { useState } from 'react';
import PreferenceForm from '../../components/PreferenceView';
import ResultsView from '../../components/ResultsView';
import { RecommendationResponse } from '../../types';

const PreferencesPage: React.FC = () => {
    const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (recommendations) {
        return (
            <ResultsView
                recommendations={recommendations}
                onBack={() => setRecommendations(null)}
            />
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
            <PreferenceForm
                onComplete={(data) => setRecommendations(data)}
                onProcessingChange={setIsProcessing}
            />

            {isProcessing && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-white">Synthesizing DNA...</h3>
                        <p className="text-slate-400 font-medium">Cross-referencing state standards with your profile.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreferencesPage;
