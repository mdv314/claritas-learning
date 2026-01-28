// services/apiService.ts
import { PreferenceProfile } from "../types";

const API_BASE_URL = "http://127.0.0.5000";

export const generateCourse = async (profile: PreferenceProfile): Promise<any> => {
    const formData = new FormData();
    
    // Mapping PreferenceProfile to the Form fields FastAPI expects
    formData.append('topic', profile.customGoals || "General Study Plan");
    formData.append('skill_level', profile.educationLevel);
    formData.append('age_group', profile.grade);
    formData.append('additional_notes', `Learning Style: ${profile.learningStyle}. Traits: ${profile.traits.join(', ')}`);
    formData.append('materials_text', `Weaknesses: ${profile.weaknesses.join(', ')}`);
    
    const response = await fetch(`${API_BASE_URL}/generate_course`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
};