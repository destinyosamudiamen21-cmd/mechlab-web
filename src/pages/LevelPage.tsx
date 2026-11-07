import { Link, useParams } from "react-router";
import { useCourses } from "../api/queries";
import CourseGrid, { ComingSoon } from "../components/CourseGrid";
import { ErrorView, Loading } from "../components/QueryStates";
import { DEPARTMENTS, coursesFor, isLevel, isShared } from "../levels";
import NotFoundPage from "./NotFoundPage";

// 100 and 200 level: the shared course list.
// 300 level and above: the list of departments.
export default function LevelPage() {
  const level = Number(useParams().level);
  const { data: courses, isPending, isError, error, refetch } = useCourses();

  if (!isLevel(level)) return <NotFoundPage />;
  if (isPending) return <Loading label='Loading courses…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Link to='/' className='back'>
        ← All levels
      </Link>
      <p className='eyebrow'>UNIBEN · Faculty of Engineering</p>
      <h1>{level} level</h1>

      {isShared(level) ? (
        <>
          <p className='lead'>Every engineering department takes these courses.</p>
          {coursesFor(courses, level).length > 0 ? (
            <CourseGrid courses={coursesFor(courses, level)} />
          ) : (
            <ComingSoon what={`${level} level courses`} />
          )}
        </>
      ) : (
        <>
          <p className='lead'>Pick your department.</p>
          <div className='grid'>
            {DEPARTMENTS.map((department) => {
              const count = coursesFor(courses, level, department.slug).length;
              return (
                <Link
                  key={department.slug}
                  to={`/levels/${level}/${department.slug}`}
                  className={count > 0 ? "card" : "card card-muted"}
                >
                  <p className='card-title'>{department.name}</p>
                  <p className='card-meta'>
                    {count > 0 ? `${count} ${count === 1 ? "course" : "courses"}` : "Coming soon"}
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
