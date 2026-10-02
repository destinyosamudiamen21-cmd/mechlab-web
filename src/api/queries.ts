import { useQuery } from "@tanstack/react-query";
import { postJson, request } from "./client";
import type {
  AnswerResult,
  CourseRead,
  CourseSummary,
  DecodeResult,
  QuestionRead,
  QuestionSolution,
  QuestionSummary,
  TopicRead,
} from "./types";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => request<CourseSummary[]>("/courses"),
  });
}

export function useCourse(code: string) {
  return useQuery({
    queryKey: ["course", code],
    queryFn: () => request<CourseRead>(`/courses/${encodeURIComponent(code)}`),
    enabled: code !== "",
  });
}

export function useTopic(slug: string) {
  return useQuery({
    queryKey: ["topic", slug],
    queryFn: () => request<TopicRead>(`/topics/${encodeURIComponent(slug)}`),
    enabled: slug !== "",
  });
}

export function useTopicQuestions(slug: string) {
  return useQuery({
    queryKey: ["topic", slug, "questions"],
    queryFn: () =>
      request<QuestionSummary[]>(
        `/topics/${encodeURIComponent(slug)}/questions`
      ),
    enabled: slug !== "",
  });
}

export function useQuestion(slug: string) {
  return useQuery({
    queryKey: ["question", slug],
    queryFn: () =>
      request<QuestionRead>(`/questions/${encodeURIComponent(slug)}`),
    enabled: slug !== "",
  });
}

// The solution is only downloaded when the student asks for it ("enabled").
export function useSolution(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ["question", slug, "solution"],
    queryFn: () =>
      request<QuestionSolution>(
        `/questions/${encodeURIComponent(slug)}/solution`
      ),
    enabled,
  });
}

// These two send the student's attempt to the backend, which does the marking.
export function checkDecoder(slug: string, position: number, choice: string) {
  return postJson<DecodeResult>(
    `/questions/${encodeURIComponent(slug)}/decode`,
    { position, choice }
  );
}

export function checkAnswer(slug: string, label: string, value: number) {
  return postJson<AnswerResult>(
    `/questions/${encodeURIComponent(slug)}/check`,
    { label, value }
  );
}
