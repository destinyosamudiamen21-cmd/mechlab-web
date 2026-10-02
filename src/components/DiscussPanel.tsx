import { Link } from "react-router";
import { useThreads } from "../api/community";
import { ErrorView, Loading } from "./QueryStates";
import ThreadList from "./ThreadList";

// The Discuss tab of a topic: its threads, and the way in to ask a new one.
export default function DiscussPanel({ slug }: { slug: string }) {
  const { data, isPending, isError, error, refetch } = useThreads({
    topic: slug,
  });

  if (isPending) return <Loading label='Loading discussions…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <div className='discuss-head'>
        <p className='lead'>
          Questions and explanations from students on this topic.
        </p>
        <Link
          className='button'
          to={`/community/new?topic=${encodeURIComponent(slug)}`}
        >
          Ask a question
        </Link>
      </div>
      <ThreadList
        threads={data.items}
        empty='No discussion yet. Ask the first question on this topic.'
      />
    </>
  );
}
