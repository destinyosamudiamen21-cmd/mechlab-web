import { Suspense } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useAuth } from "../api/auth";
import {
  useLesson,
  useProgress,
  useTopic,
  useTopicQuestions,
} from "../api/queries";
import type { QuestionProgress, TopicRead } from "../api/types";
import { ErrorView, Loading } from "../components/QueryStates";
import { getWidget } from "../widgets/registry";
import DiscussPanel from "../components/DiscussPanel";
import LessonView from "../components/LessonView";

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

  if (!Widget && topic.visual_type === "worked") {
    // A deliberate choice, not a gap: some topics are about reading tables or
    // converting units, where a moving picture adds nothing. They are learned by doing.
    return (
      <div className='panel placeholder'>
        <p className='card-title'>Learned through worked examples</p>
        <p>
          This topic is about method more than a moving picture. Read what you
          need in Understand, then decode and solve the questions in Practise.
        </p>
        <Link className='button' to={`/topics/${topic.slug}?tab=practise`}>
          Go to Practise
        </Link>
      </div>
    );
  }

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
  const lesson = useLesson(topic.slug);

  return (
    <>
      <div className='panel'>
        <p>{topic.summary}</p>
        <h2 className='section-title'>By the end you should be able to</h2>
        <ul className='objectives'>
          {topic.objectives.map((objective) => (
            <li key={objective.position}>{objective.text}</li>
          ))}
        </ul>
      </div>
      {lesson.isPending && <Loading label='Loading the lesson…' />}
      {lesson.isError && (
        <ErrorView error={lesson.error} onRetry={() => lesson.refetch()} />
      )}
      {lesson.data && <LessonView lesson={lesson.data} />}
      {lesson.data === null && (
        <div className='panel placeholder lesson-missing'>
          <p className='card-title'>Full lesson coming soon</p>
          <p>
            The step-by-step explanation for this topic is still being written.
            Meanwhile, try the questions in Practise.
          </p>
        </div>
      )}
    </>
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
  const { user } = useAuth();
  const progress = useProgress(user?.id ?? null);

  // The logged-in student's record for this topic, by question slug (empty for visitors).
  const done = new Map(
    (progress.data?.courses ?? [])
      .flatMap((course) => course.topics)
      .filter((topic) => topic.slug === slug)
      .flatMap((topic) => topic.questions)
      .map((question) => [question.slug, question] as const)
  );

  if (isPending) return <Loading label='Loading questions…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  if (questions.length === 0) {
    return (
      <div className='panel placeholder'>
        <p className='card-title'>No questions for this topic yet</p>
        <p>
          Scholars are writing and solving them. Each one goes live with its
          review status shown, so you always know if a scholar has checked it.
        </p>
      </div>
    );
  }

  return (
    <ul className='list'>
      {questions.map((question) => {
        const checked =
          question.status === "checked" || question.status === "live";
        const mine = done.get(question.slug);
        return (
          <li key={question.slug}>
            <Link to={`/questions/${question.slug}`} className='card'>
              <div className='row'>
                <p className='card-title'>{question.title}</p>
                <span className='badges'>
                  {question.difficulty === "twisted" && (
                    <span className='badge live'>Twisted</span>
                  )}
                  <span className={checked ? "badge verified" : "badge"}>
                    {checked ? "Checked" : "Awaiting check"}
                  </span>
                </span>
              </div>
              <p className='card-meta'>
                {question.source} · {question.part_count}{" "}
                {question.part_count === 1 ? "part" : "parts"}
                {mine && <SolvedNote progress={mine} />}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// What the logged-in student has done on one question, shown on its card.
function SolvedNote({ progress }: { progress: QuestionProgress }) {
  if (!progress.attempted) return null;
  if (progress.parts_total > 0 && progress.parts_solved === progress.parts_total) {
    return <> · <strong className='good-text'>All parts solved</strong></>;
  }
  return (
    <>
      {" "}
      · You solved {progress.parts_solved} of {progress.parts_total}
    </>
  );
}
