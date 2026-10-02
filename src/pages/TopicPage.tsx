import { Suspense } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useTopic, useTopicQuestions } from "../api/queries";
import type { TopicRead } from "../api/types";
import { ErrorView, Loading } from "../components/QueryStates";
import { getWidget } from "../widgets/registry";
import DiscussPanel from "../components/DiscussPanel";

const TABS = [
  { id: "see", label: "See" },
  { id: "understand", label: "Understand" },
  { id: "practise", label: "Practise" },
  { id: "discuss", label: "Discuss" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export default function TopicPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab: TabId = isTabId(requested) ? requested : "see";

  const { data: topic, isPending, isError, error, refetch } = useTopic(slug);

  if (isPending) return <Loading label='Loading topic…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Link to='/' className='back'>
        ← All courses
      </Link>
      <h1>{topic.title}</h1>

      <div className='tabs' role='tablist'>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role='tab'
            className='tab'
            aria-selected={activeTab === tab.id}
            onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role='tabpanel'>
        {activeTab === "see" && <SeePanel topic={topic} />}
        {activeTab === "understand" && <UnderstandPanel topic={topic} />}
        {activeTab === "practise" && <PractisePanel slug={topic.slug} />}
        {activeTab === "discuss" && <DiscussPanel slug={topic.slug} />}
      </div>
    </>
  );
}

function SeePanel({ topic }: { topic: TopicRead }) {
  const Widget = getWidget(topic.widget);

  if (!Widget) {
    // Never crash on an unbuilt widget: the topic is still useful without it.
    return (
      <div className='panel placeholder'>
        <p className='card-title'>Visual coming soon</p>
        <p>
          Meanwhile, read what you need to know in Understand, or try the
          questions in Practise.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<Loading label='Loading visual…' />}>
      <Widget topicSlug={topic.slug} />
    </Suspense>
  );
}

function UnderstandPanel({ topic }: { topic: TopicRead }) {
  return (
    <div className='panel'>
      <p>{topic.summary}</p>
      <h2 className='section-title'>By the end you should be able to</h2>
      <ul className='objectives'>
        {topic.objectives.map((objective) => (
          <li key={objective.position}>{objective.text}</li>
        ))}
      </ul>
    </div>
  );
}

function PractisePanel({ slug }: { slug: string }) {
  const {
    data: questions,
    isPending,
    isError,
    error,
    refetch,
  } = useTopicQuestions(slug);

  if (isPending) return <Loading label='Loading questions…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  if (questions.length === 0) {
    return (
      <div className='panel placeholder'>
        <p className='card-title'>No checked questions yet</p>
        <p>
          Our scholars are solving and checking them. Only checked answers go
          live.
        </p>
      </div>
    );
  }

  return (
    <ul className='list'>
      {questions.map((question) => (
        <li key={question.slug}>
          <Link to={`/questions/${question.slug}`} className='card'>
            <div className='row'>
              <p className='card-title'>{question.title}</p>
              <span className='badge'>{question.difficulty}</span>
            </div>
            <p className='card-meta'>
              {question.source} · {question.part_count}{" "}
              {question.part_count === 1 ? "part" : "parts"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
