import { PreferenceProfile, RecommendationResponse } from "../types";

const API_BASE_URL = "http://localhost:8000";

export const getLearningRecommendations = async (
    profile: PreferenceProfile
): Promise<RecommendationResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/roadmap`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
    });

    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
};
