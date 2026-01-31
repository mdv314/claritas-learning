// services/apiService.ts
import { useState } from "react";
import { PreferenceProfile, UserInformation, LoginInfo, AuthResponse, GradeLevel, Subject, AssessmentSubmission, Question } from "../types";

const API_BASE_URL = "http://127.0.0.1:5000";

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

export const createUser = async (userCreation: UserInformation): Promise<any> => {
    console.log(userCreation)
    const response = await fetch(`${API_BASE_URL}/create_user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userCreation),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
}

export const loginUser = async (loginAttempt: LoginInfo): Promise<AuthResponse> => {
    console.log(loginAttempt)
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginAttempt),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    console.log("Login response:", data);

    return data;
}

export const generateAssessmentQuestions = async (grade: GradeLevel, subject: Subject): Promise<Question[]> => {
    const submission: AssessmentSubmission = { subject: subject, gradeLevel: grade }
    const response = await fetch(`${API_BASE_URL}/generate_assessment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
}