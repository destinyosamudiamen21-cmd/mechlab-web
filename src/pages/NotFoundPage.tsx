import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className='state'>
      <h1>Page not found</h1>
      <Link to='/'>Back to courses</Link>
    </div>
  );
}
