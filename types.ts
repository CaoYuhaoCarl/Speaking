export interface LessonSegment {
  id: number;
  english: string;
  chinese: string;
}

export interface FeedbackResult {
  accuracy: number;
  transcription: string;
  corrections: string[];
  encouragement: string;
  audioDuration?: number;
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  FEEDBACK = 'FEEDBACK',
  COMPLETED = 'COMPLETED'
}
