import { useThreads } from "../api/community";
import { ErrorView, Loading } from "../components/QueryStates";
import ThreadList from "../components/ThreadList";

export default function CommunityPage() {
  const { data, isPending, isError, error, refetch } = useThreads({});

  if (isPending) return <Loading label='Loading discussions…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <h1>Community</h1>
      <p className='lead'>
        The newest questions from every topic. To ask your own, open a topic or
        a past question and ask from there, so helpers can see exactly what you
        are working on.
      </p>
      <ThreadList
        threads={data.items}
        empty='No discussions yet. Open a topic, go to Discuss, and ask the first question.'
      />
      {data.total > data.items.length && (
        <p className='card-meta'>
          Showing the newest {data.items.length} of {data.total}.
        </p>
      )}
    </>
  );
}
