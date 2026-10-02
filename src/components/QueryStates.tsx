import { Link } from "react-router";
import { ApiError } from "../api/client";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className='state' aria-live='polite'>
      {label}
    </div>
  );
}

export function ErrorView({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  const notFound = error instanceof ApiError && error.status === 404;
  // fetch throws a TypeError when it can't reach the server at all
  // (no internet, backend down, or CORS blocking the request).
  const unreachable = error instanceof TypeError;

  const message = notFound
    ? "We couldn't find that."
    : unreachable
    ? "Can't reach the Mech Lab server. Check your connection and try again."
    : error.message;

  return (
    <div className='state' role='alert'>
      <p>{message}</p>
      {notFound ? (
        <Link to='/'>Back to courses</Link>
      ) : (
        onRetry && (
          <button className='button' onClick={onRetry}>
            Try again
          </button>
        )
      )}
    </div>
  );
}
