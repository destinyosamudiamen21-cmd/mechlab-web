import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../api/auth";
import { KIND_LABELS, createThread, useThreads } from "../api/community";
import type { AttemptContext, ThreadKind } from "../api/types";
import { Loading } from "../components/QueryStates";
import ThreadList from "../components/ThreadList";

const KIND_HELP: Record<ThreadKind, string> = {
  ask: "I don't understand this",
  explain: "I have the answer but not the why",
  discuss: "Talk about this question",
  got_wrong: "Here is my attempt. Where did I go wrong?",
};

export default function AskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();

  const topic = searchParams.get("topic") ?? undefined;
  const question = searchParams.get("question") ?? undefined;

  // The question page hands over what the student tried, so they don't retype it.
  const passed = (location.state as { attempt?: AttemptContext } | null)
    ?.attempt;
  const hasAttempt =
    passed !== undefined &&
    ((passed.decoder_choices?.length ?? 0) > 0 ||
      (passed.answers?.length ?? 0) > 0);
  const attempt = question && hasAttempt ? passed : undefined;

  // Each kind is only offered when the backend will accept it.
  const kinds: ThreadKind[] = question
    ? attempt
      ? ["got_wrong", "ask", "explain", "discuss"]
      : ["ask", "explain", "discuss"]
    : ["ask", "explain"];

  const [kind, setKind] = useState<ThreadKind>(kinds[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const existing = useThreads({ topic, question });

  const mutation = useMutation({
    mutationFn: () =>
      createThread({
        // With a question, the backend works out the topic itself.
        topic_slug: question ? undefined : topic,
        question_slug: question,
        kind,
        title: title.trim(),
        body: body.trim(),
        attempt_context: attempt,
      }),
    onSuccess: async (thread) => {
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate(`/community/threads/${thread.id}`, { replace: true });
    },
  });

  const backTo = question
    ? `/questions/${question}`
    : topic
    ? `/topics/${topic}?tab=discuss`
    : "/";

  if (!topic && !question) {
    return (
      <div className='state'>
        <p>
          Every question here belongs to a topic. Open a topic or a past
          question, then ask from there.
        </p>
        <Link to='/'>Go to courses</Link>
      </div>
    );
  }

  if (isLoading) return <Loading />;

  if (!user) {
    const here = `${location.pathname}${location.search}`;
    return (
      <div className='auth'>
        <h1>Log in to ask</h1>
        <p className='lead'>
          Reading is open to everyone. Asking and replying need an account.
        </p>
        <Link className='button' to={`/login?next=${encodeURIComponent(here)}`}>
          Log in
        </Link>
      </div>
    );
  }

  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    mutation.mutate();
  }

  const errorText =
    mutation.error instanceof TypeError
      ? "Can't reach the Mech Lab server. Check your connection and try again."
      : mutation.error?.message;
  const similar = existing.data?.items.slice(0, 3) ?? [];

  return (
    <div className='ask'>
      <Link to={backTo} className='back'>
        ← Back
      </Link>
      <h1>Ask the community</h1>

      {similar.length > 0 && (
        <section className='question-section'>
          <h2 className='heading'>Already asked here</h2>
          <p className='lead'>Check these first. Your answer may be waiting.</p>
          <ThreadList threads={similar} empty={null} />
        </section>
      )}

      <form className='panel form question-section' onSubmit={submit}>
        <div className='field'>
          <span className='field-label'>What kind of help do you need?</span>
          <div className='kind-options'>
            {kinds.map((option) => (
              <button
                key={option}
                type='button'
                className='segment'
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
              >
                <strong>{KIND_LABELS[option]}</strong>
                <span>{KIND_HELP[option]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className='field'>
          <label htmlFor='ask-title'>
            Summarise your confusion in one line
          </label>
          <input
            id='ask-title'
            className='text-input'
            required
            minLength={5}
            maxLength={150}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className='field'>
          <label htmlFor='ask-body'>
            What did you try? Which step confuses you?
          </label>
          <textarea
            id='ask-body'
            className='text-input text-area'
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <p className='hint'>
            Show your working. People answer faster when they can see where you
            got to.
          </p>
        </div>

        {attempt && (
          <p className='attached'>
            Your attempt will be attached:{" "}
            {attempt.decoder_choices?.length ?? 0} decoder{" "}
            {(attempt.decoder_choices?.length ?? 0) === 1
              ? "choice"
              : "choices"}{" "}
            and {attempt.answers?.length ?? 0}{" "}
            {(attempt.answers?.length ?? 0) === 1 ? "answer" : "answers"}.
          </p>
        )}

        {errorText && (
          <p className='form-error' role='alert'>
            {errorText}
          </p>
        )}

        <button className='button' type='submit' disabled={mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post your question"}
        </button>
      </form>
    </div>
  );
}
