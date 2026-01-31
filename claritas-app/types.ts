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

export type GradeLevel = 
  | '1st Grade' | '2nd Grade' | '3rd Grade' | '4th Grade' | '5th Grade' 
  | '6th Grade' | '7th Grade' | '8th Grade' | 'High School' | 'College';

export type Subject = 
  | 'Mathematics' | 'Geometry' | 'Algebra' | 'Science' | 'Biology' 
  | 'Physics' | 'History' | 'Literature' | 'Computer Science';

export interface AssessmentSubmission {
    subject: Subject;
    gradeLevel: GradeLevel;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface AssessmentData {
  grade: GradeLevel;
  subject: Subject;
  questions: Question[];
}

export interface UserAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
}

export interface CalibrationResult {
  score: number;
  masteryLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}
