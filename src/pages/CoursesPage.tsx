import { Link } from "react-router";
import { useCourses } from "../api/queries";
import { ErrorView, Loading } from "../components/QueryStates";

export default function CoursesPage() {
  const { data: courses, isPending, isError, error, refetch } = useCourses();

  if (isPending) return <Loading label='Loading courses…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  // About 27 courses now, so show them in level groups (100 level first).
  const levels = [...new Set(courses.map((course) => course.level))].sort((a, b) => a - b);

  return (
    <>
      <p className='eyebrow'>UNIBEN · Mechanical Engineering</p>
      <h1>Pick a course</h1>
      <p className='lead'>
        See the machine, decode the question, then solve it.
      </p>

      {levels.map((level) => (
        <section key={level} className='level-group'>
          <h2 className='heading'>{level} level</h2>
          <div className='grid'>
            {courses
              .filter((course) => course.level === level)
              .map((course) => (
                <Link
                  key={course.code}
                  to={`/courses/${encodeURIComponent(course.code)}`}
                  className='card'
                >
                  <span className='eyebrow'>{course.code}</span>
                  <p className='card-title'>{course.title}</p>
                  <p className='card-meta'>
                    {course.topic_count > 0 ? `${course.topic_count} topics` : "Topics coming soon"}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
