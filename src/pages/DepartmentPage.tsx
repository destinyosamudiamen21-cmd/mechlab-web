import { Link, useParams } from "react-router";
import { useCourses } from "../api/queries";
import CourseGrid, { ComingSoon } from "../components/CourseGrid";
import { ErrorView, Loading } from "../components/QueryStates";
import { coursesFor, findDepartment, isLevel, isShared } from "../levels";
import NotFoundPage from "./NotFoundPage";

// One department's courses at one level (300 level and above).
export default function DepartmentPage() {
  const params = useParams();
  const level = Number(params.level);
  const department = findDepartment(params.department ?? "");
  const { data: courses, isPending, isError, error, refetch } = useCourses();

  if (!isLevel(level) || isShared(level) || !department) return <NotFoundPage />;
  if (isPending) return <Loading label='Loading courses…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  const list = coursesFor(courses, level, department.slug);

  return (
    <>
      <Link to={`/levels/${level}`} className='back'>
        ← {level} level departments
      </Link>
      <p className='eyebrow'>{level} level</p>
      <h1>{department.name}</h1>
      {list.length > 0 ? (
        <>
          <p className='lead'>Pick a course.</p>
          <CourseGrid courses={list} />
        </>
      ) : (
        <ComingSoon what={`${level} level ${department.name} courses`} />
      )}
    </>
  );
}
