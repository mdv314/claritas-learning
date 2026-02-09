// services/apiService.ts
import { useState } from "react";
import { PreferenceProfile, UserInformation, LoginInfo, AuthResponse, GradeLevel, Subject, AssessmentSubmission, Question, CalibrationResult, Result, UserPreferences } from "../types";
import { API_BASE_URL } from "@/lib/apiConfig";

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

export const createUser = async (userCreation: UserInformation, userPreferences: UserPreferences): Promise<any> => {
    console.log(userCreation)
    const response = await fetch(`/api/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userCreation, userPreferences }),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
}

export const loginUser = async (loginAttempt: LoginInfo): Promise<AuthResponse> => {
    console.log(loginAttempt)
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
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

interface QuizAttempt {
    gradeLevel: GradeLevel;
    subject: Subject;
    results: Result[];
}

export const evaluateAssessment = async (grade: GradeLevel, subject: Subject, results: Result[]): Promise<any> => {
    const attempt: QuizAttempt = { gradeLevel: grade, subject: subject, results: results }

    const response = await fetch(`${API_BASE_URL}/evaluate_assessment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(attempt),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
}

export const generateCourseFromAssessment = async (
    topic: string,
    masteryLevel: string,
    grade: string,
    assessmentResults: {
        score: number;
        strengths: string[];
        weaknesses: string[];
        recommendation: string;
    }
): Promise<any> => {
    const formData = new FormData();
    formData.append('topic', topic);
    formData.append('skill_level', masteryLevel);
    formData.append('age_group', grade);
    formData.append(
        'additional_notes',
        `Assessment Results: Score ${Math.round(assessmentResults.score)}%. ` +
        `Mastery Level: ${masteryLevel}. ` +
        `Strengths: ${assessmentResults.strengths.join(', ')}. ` +
        `Weaknesses: ${assessmentResults.weaknesses.join(', ')}. ` +
        `Recommendation: ${assessmentResults.recommendation}`
    );
    formData.append('materials_text', `Areas needing focus: ${assessmentResults.weaknesses.join(', ')}`);

    const response = await fetch(`${API_BASE_URL}/generate_course`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
};

export const enrollInCourse = async (courseId: string): Promise<any> => {
    const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ course_id: courseId }),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
};

export const getUserCourses = async (): Promise<any> => {
    const response = await fetch('/api/courses', {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
};

export const updateCourseProgress = async (
    courseId: string,
    completedTopics: string[],
    lastVisited: string | null
): Promise<any> => {
    const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            course_id: courseId,
            completed_topics: completedTopics,
            last_visited: lastVisited,
        }),
    });

    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
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

export const sendQuizHelpMessage = async (
    courseId: string,
    unitNumber: number,
    questionIndex: number,
    questionType: string,
    conversationHistory: { role: string; text: string }[],
    studentMessage: string
): Promise<{ response: string }> => {
    const response = await fetch(`${API_BASE_URL}/quiz_help/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            courseId,
            unitNumber,
            questionIndex,
            questionType,
            conversationHistory,
            studentMessage
        }),
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

export const evaluateModuleQuizAuth = async (
    courseId: string,
    unitNumber: number,
    mcqAnswers: number[],
    frqAnswers: string[]
): Promise<any> => {
    const response = await fetch('/api/evaluate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, unitNumber, mcqAnswers, frqAnswers }),
    });
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }
    return response.json();
};

export const generateModuleQuizRetake = async (
    courseId: string,
    unitNumber: number
): Promise<any> => {
    const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, unitNumber, retake: true }),
    });
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }
    return response.json();
};

export const getQuizAttempts = async (
    courseId: string,
    unitNumber: number
): Promise<any> => {
    const response = await fetch(`/api/quiz-attempts?courseId=${courseId}&unitNumber=${unitNumber}`, {
        method: 'GET',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }
    return response.json();
};

export const getModuleQuizStatus = async (courseId: string): Promise<any> => {
    const response = await fetch(`/api/quiz-status?courseId=${courseId}`, {
        method: 'GET',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }
    return response.json();
};

export const updateUserPreferences = async (role: string, education: string, grade: string, state: string, traits: string, style: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/update_user_preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, education, grade, state, traits, style }),
    });
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }
    return response.json();
}
