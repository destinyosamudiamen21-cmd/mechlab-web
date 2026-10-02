import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../api/auth";
import {
  KIND_LABELS,
  addReply,
  formatDate,
  resolveThread,
  useThread,
  verifyReply,
} from "../api/community";
import type { ReplyRead } from "../api/types";
import { ErrorView, Loading } from "../components/QueryStates";

export default function ThreadPage() {
  const { id = "" } = useParams();
  const threadId = Number(id);
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    data: thread,
    isPending,
    isError,
    error,
    refetch,
  } = useThread(threadId);
  const [reply, setReply] = useState("");

  // After any change, fetch the thread again so everyone sees the same thing.
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
    await queryClient.invalidateQueries({ queryKey: ["threads"] });
  };

  const replyMutation = useMutation({
    mutationFn: () => addReply(threadId, reply.trim()),
    onSuccess: async () => {
      setReply("");
      await refresh();
    },
  });
  const resolveMutation = useMutation({
    mutationFn: () => resolveThread(threadId),
    onSuccess: refresh,
  });

  if (!Number.isInteger(threadId) || threadId <= 0) {
    return (
      <div className='state'>
        <p>We couldn't find that discussion.</p>
        <Link to='/community'>Back to the community</Link>
      </div>
    );
  }
  if (isPending) return <Loading label='Loading discussion…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  const isStaff = user !== null && user.role !== "student";
  const myName = user?.full_name ?? null;
  // The backend makes the final decision; this only hides a button that would be refused.
  const canResolve =
    user !== null &&
    !thread.is_resolved &&
    (isStaff || myName === thread.author_name);
  const backTo = thread.question_slug
    ? `/questions/${thread.question_slug}`
    : `/topics/${thread.topic_slug}?tab=discuss`;
  const attempt = thread.attempt_context;

  function submitReply(event: { preventDefault: () => void }) {
    event.preventDefault();
    replyMutation.mutate();
  }

  return (
    <div className='thread'>
      <Link to={backTo} className='back'>
        ← Back to the {thread.question_slug ? "question" : "topic"}
      </Link>

      <div className='thread-tags'>
        <span className='badge'>{KIND_LABELS[thread.kind]}</span>
        {thread.is_resolved && <span className='badge verified'>Solved</span>}
      </div>
      <h1>{thread.title}</h1>
      <p className='card-meta'>
        {thread.author_name}, {formatDate(thread.created_at)}
      </p>

      <section className='panel post'>
        <p className='post-body'>{thread.body}</p>

        {attempt && (
          <div className='attempt'>
            <p className='attempt-title'>What they tried</p>
            <ul>
              {(attempt.decoder_choices ?? []).map((choice) => (
                <li key={`d${choice.position}`}>
                  Phrase {choice.position}: chose "{choice.choice}"
                </li>
              ))}
              {(attempt.answers ?? []).map((answer) => (
                <li key={`a${answer.label}`}>
                  Part {answer.label}: answered {answer.value}
                </li>
              ))}
              {attempt.stuck_at && <li>Stuck at: {attempt.stuck_at}</li>}
            </ul>
          </div>
        )}

        {canResolve && (
          <button
            className='button button-quiet'
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
          >
            Mark as solved
          </button>
        )}
        {resolveMutation.isError && (
          <p className='form-error'>{resolveMutation.error.message}</p>
        )}
      </section>

      <section className='question-section'>
        <h2 className='heading'>
          {thread.replies.length}{" "}
          {thread.replies.length === 1 ? "reply" : "replies"}
        </h2>
        {thread.replies.length === 0 ? (
          <div className='panel placeholder'>
            No replies yet. If you know the answer, explain it below.
          </div>
        ) : (
          <ol className='list'>
            {thread.replies.map((item) => (
              <ReplyCard
                key={item.id}
                reply={item}
                canVerify={
                  isStaff && !item.is_verified && myName !== item.author_name
                }
                onChanged={refresh}
              />
            ))}
          </ol>
        )}
      </section>

      <section className='question-section'>
        <h2 className='heading'>Your reply</h2>
        {user ? (
          <form className='panel form' onSubmit={submitReply}>
            <div className='field'>
              <label htmlFor='reply-body'>
                Explain the step, not only the answer
              </label>
              <textarea
                id='reply-body'
                className='text-input text-area'
                required
                minLength={2}
                maxLength={5000}
                rows={4}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
            </div>
            {replyMutation.isError && (
              <p className='form-error' role='alert'>
                {replyMutation.error.message}
              </p>
            )}
            <button
              className='button'
              type='submit'
              disabled={replyMutation.isPending}
            >
              {replyMutation.isPending ? "Posting…" : "Post reply"}
            </button>
          </form>
        ) : (
          <div className='panel'>
            <p className='hint'>
              Reading is open to everyone. Replying needs an account.
            </p>
            <Link
              className='button'
              to={`/login?next=${encodeURIComponent(
                `${location.pathname}${location.search}`
              )}`}
            >
              Log in to reply
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

type ReplyCardProps = {
  reply: ReplyRead;
  canVerify: boolean;
  onChanged: () => Promise<void>;
};

function ReplyCard({ reply, canVerify, onChanged }: ReplyCardProps) {
  const mutation = useMutation({
    mutationFn: () => verifyReply(reply.id),
    onSuccess: onChanged,
  });

  return (
    <li className={reply.is_verified ? "panel post is-verified" : "panel post"}>
      {reply.is_verified && (
        <p className='verified-line'>
          Verified
          {reply.verified_by_name ? ` by ${reply.verified_by_name}` : ""}
        </p>
      )}
      <p className='post-body'>{reply.body}</p>
      <p className='card-meta'>
        {reply.author_name}, {formatDate(reply.created_at)}
        {reply.author_role !== "student" && (
          <span className='role-chip'>{reply.author_role}</span>
        )}
      </p>
      {canVerify && (
        <button
          className='button button-quiet'
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          Mark as verified
        </button>
      )}
      {mutation.isError && (
        <p className='form-error'>{mutation.error.message}</p>
      )}
    </li>
  );
}
