import { useQuery } from "@tanstack/react-query";
import { postJson, request } from "./client";
import type {
  ReplyRead,
  ThreadCreate,
  ThreadKind,
  ThreadList,
  ThreadRead,
} from "./types";

export const KIND_LABELS: Record<ThreadKind, string> = {
  ask: "Ask",
  explain: "Explain",
  discuss: "Discuss",
  got_wrong: "Got it wrong",
};

// Dates arrive from the backend in UTC; the browser shows them in the student's own time zone.
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Threads for one topic, one question, or (with no filter) the whole community.
export function useThreads(filter: { topic?: string; question?: string }) {
  const params = new URLSearchParams({ limit: "50" });
  if (filter.topic) params.set("topic", filter.topic);
  if (filter.question) params.set("question", filter.question);

  return useQuery({
    queryKey: ["threads", filter.topic ?? null, filter.question ?? null],
    queryFn: () =>
      request<ThreadList>(`/community/threads?${params.toString()}`),
    staleTime: 30 * 1000, // discussions change more often than course content
  });
}

export function useThread(id: number) {
  return useQuery({
    queryKey: ["thread", id],
    queryFn: () => request<ThreadRead>(`/community/threads/${id}`),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 0, // always check for new replies when a thread is opened
  });
}

export function createThread(data: ThreadCreate) {
  return postJson<ThreadRead>("/community/threads", data);
}

export function addReply(threadId: number, body: string) {
  return postJson<ReplyRead>(`/community/threads/${threadId}/replies`, {
    body,
  });
}

export function resolveThread(threadId: number) {
  return postJson<ThreadRead>(`/community/threads/${threadId}/resolve`, {});
}

export function verifyReply(replyId: number) {
  return postJson<ReplyRead>(`/community/replies/${replyId}/verify`, {});
}
