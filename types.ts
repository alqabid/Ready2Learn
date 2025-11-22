
export interface Topic {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isLocked: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  topics: Topic[];
}

export interface CourseStructure {
  title: string;
  summary: string;
  chapters: Chapter[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface LessonContent {
  script: string;
  visualPrompt: string;
  keyPoints: string[];
}

export enum AppState {
  UPLOAD,
  ANALYZING,
  DASHBOARD,
  LESSON,
  QUIZ
}

export interface LessonState {
  audioUrl: string | null;
  imageUrl: string | null;
  content: LessonContent | null;
  isLoading: boolean;
}

export type Region = 'African' | 'European' | 'Asian' | 'American';
export type Gender = 'Male' | 'Female';

export interface TutorProfile {
  region: Region;
  gender: Gender;
  name: string;
}

export interface Feedback {
  id: string;
  topicId: string;
  topicTitle: string;
  type: 'lesson' | 'quiz';
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  avatar: string; // emoji or url
  createdAt: string;
}
