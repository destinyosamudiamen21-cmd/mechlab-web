import { Link } from "react-router";
import type { CourseSummary } from "../api/types";

// A grid of course cards, used by the level page and the department page.
export default function CourseGrid({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className='grid'>
      {courses.map((course) => (
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
  );
}

export function ComingSoon({ what }: { what: string }) {
  return (
    <div className='panel coming-soon'>
      <p className='card-title'>Coming soon</p>
      <p className='card-meta'>
        We haven't added {what} yet. If you are in this department and want to help, ask in Discuss.
      </p>
    </div>
  );
}
