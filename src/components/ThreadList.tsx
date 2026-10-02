import type { ReactNode } from "react";
import { Link } from "react-router";
import { KIND_LABELS, formatDate } from "../api/community";
import type { ThreadSummary } from "../api/types";

export default function ThreadList({
  threads,
  empty,
}: {
  threads: ThreadSummary[];
  empty: ReactNode;
}) {
  if (threads.length === 0) {
    return <div className='panel placeholder'>{empty}</div>;
  }

  return (
    <ul className='list'>
      {threads.map((thread) => (
        <li key={thread.id}>
          <Link to={`/community/threads/${thread.id}`} className='card'>
            <div className='thread-tags'>
              <span className='badge'>{KIND_LABELS[thread.kind]}</span>
              {thread.has_verified_answer && (
                <span className='badge verified'>Verified answer</span>
              )}
              {thread.is_resolved && (
                <span className='badge verified'>Solved</span>
              )}
            </div>
            <p className='card-title'>{thread.title}</p>
            <p className='card-meta'>
              {thread.author_name}, {formatDate(thread.created_at)}.{" "}
              {thread.reply_count}{" "}
              {thread.reply_count === 1 ? "reply" : "replies"}.
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
