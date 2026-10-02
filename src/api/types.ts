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
