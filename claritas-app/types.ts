export enum UserRole {
    STUDENT = 'Student',
    PARENT = 'Parent',
}

export enum EducationLevel {
    K12 = 'K-12',
    COLLEGE = 'College/University',
}

export interface UserInformation {
    name: string;
    email: string;
    password: string;
}

export interface LoginInfo {
    email: string;
    password: string;
}

export interface AuthResponse {
    user_id: string;
    access_token: string;
    refresh_token: string;
}

export interface PreferenceProfile {
    role: UserRole;
    state: string;
    educationLevel: EducationLevel;
    grade: string;
    isVerified: boolean;
    learningStyle: string;
    traits: string[];
    weaknesses: string[];
    customGoals: string;
}

export interface RecommendationResponse {
    summary: string;
    suggestedFocusAreas: string[];
    stateStandardNote: string;
}
