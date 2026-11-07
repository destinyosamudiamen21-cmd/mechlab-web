import { Link, useLocation } from "react-router";
import { useAuth } from "../api/auth";
import { useProgress } from "../api/queries";
import type { ProgressRead, TopicProgress } from "../api/types";
import { ErrorView, Loading } from "../components/QueryStates";

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

export default function ProgressPage() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const progress = useProgress(user?.id ?? null);

  if (isLoading) return <Loading />;

  if (!user) {
    return (
      <div className='auth'>
        <h1>Your progress</h1>
        <p className='lead'>
          Log in and Mech Lab keeps track of the questions you try: which parts
          you solved, how often you decoded the wording right first time, and
          which topics need more work.
        </p>
        <Link
          className='button'
          to={`/login?next=${encodeURIComponent(location.pathname)}`}
        >
          Log in
        </Link>
      </div>
    );
  }

  if (progress.isPending) return <Loading label='Loading your progress…' />;
  if (progress.isError) {
    return (
      <ErrorView error={progress.error} onRetry={() => progress.refetch()} />
    );
  }

  return <ProgressView data={progress.data} />;
}

function ProgressView({ data }: { data: ProgressRead }) {
  const { summary } = data;

  if (summary.questions_attempted === 0) {
    return (
      <>
        <h1>Your progress</h1>
        <div className='panel placeholder'>
          <p className='card-title'>Nothing tracked yet</p>
          <p>
            Open a topic, go to Practise and try a question. Every phrase you
            decode and every answer you check shows up here.
          </p>
          <Link className='button' to='/'>
            Go to courses
          </Link>
        </div>
      </>
    );
  }

  const weak = data.courses.flatMap((course) =>
    course.topics.filter((topic) => topic.needs_work)
  );

  return (
    <>
      <h1>Your progress</h1>
      <p className='lead'>
        Counted from the questions you have tried while logged in.
      </p>

      <div className='stat-grid'>
        <Stat value={summary.questions_attempted} label='questions tried' />
        <Stat value={summary.parts_solved} label='parts solved' />
        <Stat
          value={`${percent(summary.decoded_first_time, summary.decoded_total)}%`}
          label={`of phrases decoded right first time (${summary.decoded_first_time} of ${summary.decoded_total})`}
        />
      </div>

      {weak.length > 0 && (
        <section className='question-section'>
          <h2 className='heading'>Needs work</h2>
          <p className='lead'>
            On the questions you tried here, you solved fewer than half the
            parts or decoded fewer than 60% of phrases first time. Revisit the
            visual, then try again.
          </p>
          <ul className='list'>
            {weak.map((topic) => (
              <li key={topic.slug}>
                <TopicRow topic={topic} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.courses.map((course) => (
        <section className='question-section' key={course.code}>
          <h2 className='heading'>
            {course.code} · {course.title}
          </h2>
          <ul className='list'>
            {course.topics
              .filter((topic) => topic.questions_total > 0)
              .map((topic) => (
                <li key={topic.slug}>
                  <TopicRow topic={topic} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className='panel stat'>
      <p className='stat-value'>{value}</p>
      <p className='card-meta'>{label}</p>
    </div>
  );
}

function TopicRow({ topic }: { topic: TopicProgress }) {
  const share = percent(topic.parts_solved, topic.parts_total);

  return (
    <Link to={`/topics/${topic.slug}?tab=practise`} className='card'>
      <div className='row'>
        <p className='card-title'>{topic.title}</p>
        {topic.needs_work && <span className='badge warn'>Needs work</span>}
      </div>
      <div
        className='meter'
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        aria-label={`${topic.title}: ${share}% of parts solved`}
      >
        <span style={{ width: `${share}%` }} />
      </div>
      <p className='card-meta'>
        {topic.parts_solved} of {topic.parts_total} parts solved ·{" "}
        {topic.questions_attempted} of {topic.questions_total}{" "}
        {topic.questions_total === 1 ? "question" : "questions"} tried
        {topic.decoded_total > 0 &&
          ` · decoded ${topic.decoded_first_time} of ${topic.decoded_total} phrases first time`}
      </p>
    </Link>
  );
}
