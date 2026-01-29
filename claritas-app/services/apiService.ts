// services/apiService.ts
import { PreferenceProfile } from "../types";

const API_BASE_URL = "http://127.0.0.5000"; // Updated to match your FastAPI port

export const generateCourse = async (profile: PreferenceProfile): Promise<any> => {
    const formData = new FormData();
    
    // Mapping PreferenceProfile to the Form fields FastAPI expects
    formData.append('topic', profile.customGoals || "General Study Plan");
    formData.append('skill_level', profile.educationLevel);
    formData.append('age_group', profile.grade);
    formData.append('additional_notes', `Learning Style: ${profile.learningStyle}. Traits: ${profile.traits.join(', ')}`);
    formData.append('materials_text', `Weaknesses: ${profile.weaknesses.join(', ')}`);
    
    // 'file' is optional in your FastAPI route, so we can omit it here

    const response = await fetch(`${API_BASE_URL}/generate_course`, {
        method: "POST",
        body: formData, // No headers needed; Fetch sets multipart/form-data automatically
    });

    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
};

export const generateModuleQuiz = async (courseId: string, unitNumber: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/generate_module_quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, unitNumber }),
    });
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }
    return response.json();
};

export const evaluateModuleQuiz = async (
    courseId: string,
    unitNumber: number,
    mcqAnswers: number[],
    frqAnswers: string[]
): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/evaluate_module_quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, unitNumber, mcqAnswers, frqAnswers }),
    });
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }
    return response.json();
};