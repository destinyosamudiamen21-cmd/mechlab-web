// How the home page is organised: level first, then department from 300 level.
// 100 and 200 level are the same for every engineering student (CCMAS common
// courses), so they go straight to the course list. From 300 level each
// department has its own courses.

export const LEVELS = [100, 200, 300, 400, 500] as const;

// Levels every department shares.
export const SHARED_LEVELS: readonly number[] = [100, 200];

export type Department = {
  slug: string;
  name: string;
  // Course code prefixes that belong to this department, e.g. "MEE" for "MEE351".
  prefixes: string[];
};

// The eight departments in the UNIBEN Faculty of Engineering handbook.
export const DEPARTMENTS: Department[] = [
  { slug: "chemical", name: "Chemical Engineering", prefixes: ["CHE"] },
  { slug: "civil", name: "Civil Engineering", prefixes: ["CVE", "CEE"] },
  { slug: "computer", name: "Computer Engineering", prefixes: ["CPE"] },
  { slug: "electrical", name: "Electrical/Electronic Engineering", prefixes: ["EEE"] },
  { slug: "mechanical", name: "Mechanical Engineering", prefixes: ["MEE"] },
  { slug: "materials", name: "Metallurgical and Materials Engineering", prefixes: ["MME"] },
  { slug: "petroleum", name: "Petroleum Engineering", prefixes: ["PEE"] },
  { slug: "production", name: "Production Engineering", prefixes: ["PRE"] },
];

export function isShared(level: number): boolean {
  return SHARED_LEVELS.includes(level);
}

export function isLevel(value: number): boolean {
  return (LEVELS as readonly number[]).includes(value);
}

export function findDepartment(slug: string): Department | undefined {
  return DEPARTMENTS.find((department) => department.slug === slug);
}

// "MEE351" or "MEE 351" -> the department whose prefix matches, if any.
export function departmentOf(code: string): Department | undefined {
  const prefix = code.replace(/\s+/g, "").replace(/\d.*$/, "").toUpperCase();
  return DEPARTMENTS.find((department) => department.prefixes.includes(prefix));
}

type HasCodeAndLevel = { code: string; level: number };

// The courses a student sees for a level (and a department, from 300 level).
export function coursesFor<T extends HasCodeAndLevel>(
  courses: T[],
  level: number,
  departmentSlug?: string
): T[] {
  return courses.filter(
    (course) =>
      course.level === level &&
      (isShared(level) || departmentOf(course.code)?.slug === departmentSlug)
  );
}

// Where the "back" link on a course page should go.
export function levelPath(course: HasCodeAndLevel): string {
  if (isShared(course.level)) return `/levels/${course.level}`;
  const department = departmentOf(course.code);
  return department
    ? `/levels/${course.level}/${department.slug}`
    : `/levels/${course.level}`;
}
