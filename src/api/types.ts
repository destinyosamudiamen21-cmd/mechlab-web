import type { components } from "./schema";

type Schemas = components["schemas"];

// These names match your Pydantic classes exactly.
export type CourseSummary = Schemas["CourseSummary"];
export type CourseRead = Schemas["CourseRead"];
export type TopicRead = Schemas["TopicRead"];
export type QuestionSummary = Schemas["QuestionSummary"];
export type QuestionRead = Schemas["QuestionRead"];
export type DecodeResult = Schemas["DecodeResult"];
export type AnswerResult = Schemas["AnswerResult"];
export type QuestionSolution = Schemas["QuestionSolution"];
export type User = Schemas["UserRead"];
export type TokenResponse = Schemas["TokenResponse"];

// Community
export type ThreadKind = Schemas["ThreadKind"];
export type ThreadSummary = Schemas["ThreadSummary"];
export type ThreadList = Schemas["ThreadPage"];
export type ThreadRead = Schemas["ThreadRead"];
export type ReplyRead = Schemas["ReplyRead"];
export type ThreadCreate = Schemas["ThreadCreate"];
// What a student tried on a question: decoder choices and submitted answers.
export type AttemptContext = NonNullable<ThreadCreate["attempt_context"]>;

// Progress (GET /api/me/progress). Written by hand to match app/models/progress.py.
// Once you run `npm run gen:api` against the new backend, these can come from schema.d.ts
// like the types above.
export type QuestionProgress = {
  slug: string;
  title: string;
  parts_solved: number;
  parts_total: number;
  attempted: boolean;
};

export type TopicProgress = {
  slug: string;
  title: string;
  questions_total: number;
  questions_attempted: number;
  parts_solved: number;
  parts_total: number;
  decoded_first_time: number;
  decoded_total: number;
  needs_work: boolean;
  questions: QuestionProgress[];
};

export type CourseProgress = {
  code: string;
  title: string;
  topics: TopicProgress[];
};

export type ProgressRead = {
  summary: {
    questions_attempted: number;
    parts_solved: number;
    decoded_first_time: number;
    decoded_total: number;
    last_active: string | null;
  };
  courses: CourseProgress[];
};
