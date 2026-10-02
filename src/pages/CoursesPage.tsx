import { Link } from "react-router";
import { useCourses } from "../api/queries";
import { ErrorView, Loading } from "../components/QueryStates";

export default function CoursesPage() {
  const { data: courses, isPending, isError, error, refetch } = useCourses();

  if (isPending) return <Loading label='Loading courses…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <p className='eyebrow'>UNIBEN · Mechanical Engineering</p>
      <h1>Pick a course</h1>
      <p className='lead'>
        See the machine, decode the question, then solve it.
      </p>

      <div className='grid'>
        {courses.map((course) => (
          <Link
            key={course.code}
            to={`/courses/${encodeURIComponent(course.code)}`}
            className='card'
          >
            <span className='eyebrow'>{course.code}</span>
            <p className='card-title'>{course.title}</p>
            <p className='card-meta'>{course.topic_count} topics</p>
          </Link>
        ))}
      </div>
    </>
  );
}
