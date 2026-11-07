import { useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError, postJson, request } from "./client";
import type {
  AnswerResult,
  CourseRead,
  CourseSummary,
  DecodeResult,
  Lesson,
  ProgressRead,
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

// The topic's lesson, or null when none is written yet (the API answers 404).
export function useLesson(slug: string) {
  return useQuery({
    queryKey: ["topic", slug, "lesson"],
    queryFn: async () => {
      try {
        return await request<Lesson>(`/topics/${encodeURIComponent(slug)}/lesson`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
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

// The logged-in student's own record, or nothing for visitors (userId null).
// The user id is part of the key, so one student's progress is never shown to the next
// person who logs in on the same phone.
export function useProgress(userId: number | null) {
  return useQuery({
    queryKey: ["progress", userId],
    queryFn: () => request<ProgressRead>("/me/progress"),
    enabled: userId !== null,
  });
}

// After a check, the stored progress is out of date: refetch it next time it is shown.
export function refreshProgress(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["progress"] });
}
