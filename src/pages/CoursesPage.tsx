import { Link } from "react-router";
import { useCourses } from "../api/queries";
import { ErrorView, Loading } from "../components/QueryStates";
import { LEVELS, isShared } from "../levels";

// Home page: pick your level first.
export default function CoursesPage() {
  const { data: courses, isPending, isError, error, refetch } = useCourses();

  if (isPending) return <Loading label='Loading courses…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <p className='eyebrow'>UNIBEN · Faculty of Engineering</p>
      <h1>Pick your level</h1>
      <p className='lead'>
        See the machine, decode the question, then solve it.
      </p>

      <div className='grid'>
        {LEVELS.map((level) => {
          const count = courses.filter((course) => course.level === level).length;
          return (
            <Link key={level} to={`/levels/${level}`} className='card'>
              <span className='eyebrow'>{isShared(level) ? "All departments" : "Pick your department"}</span>
              <p className='card-title'>{level} level</p>
              <p className='card-meta'>
                {count > 0 ? `${count} ${count === 1 ? "course" : "courses"}` : "Coming soon"}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
