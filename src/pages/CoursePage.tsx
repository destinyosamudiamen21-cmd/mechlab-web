import { Link, useParams } from "react-router";
import { useCourse } from "../api/queries";
import { ErrorView, Loading } from "../components/QueryStates";
import { getWidget } from "../widgets/registry";
import { levelPath } from "../levels";

const VISUAL_LABELS: Record<string, string> = {
  "3d": "3D",
  "2d": "2D",
  worked: "Worked",
};

export default function CoursePage() {
  const { code = "" } = useParams();
  const { data: course, isPending, isError, error, refetch } = useCourse(code);

  if (isPending) return <Loading label='Loading course…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Link to={levelPath(course)} className='back'>
        ← {course.level} level
      </Link>
      <p className='eyebrow'>{course.code}</p>
      <h1>{course.title}</h1>
      <p className='lead'>
        {course.topics.length} topics, in the order your lecturers teach them.
      </p>

      <ol className='list'>
        {course.topics.map((topic, index) => (
          <li key={topic.slug}>
            <Link to={`/topics/${topic.slug}`} className='card row'>
              <span>
                <span className='eyebrow'>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className='card-title'>{topic.title}</span>
              </span>
              <span className='badges'>
                <span className='badge'>
                  {VISUAL_LABELS[topic.visual_type.toLowerCase()] ??
                    topic.visual_type}
                </span>
                {getWidget(topic.widget) && (
                  <span className='badge live'>Interactive</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
