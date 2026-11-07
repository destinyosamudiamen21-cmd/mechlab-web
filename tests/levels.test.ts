import assert from "node:assert/strict";
import { test } from "node:test";
import { coursesFor, departmentOf, levelPath } from "../src/levels.ts";

const courses = [
  { code: "MTH101", level: 100 },
  { code: "PRE212", level: 200 },
  { code: "MEE351", level: 300 },
  { code: "MEE332", level: 300 },
  { code: "CPE301", level: 300 },
];

test("a course code maps to its department, with or without a space", () => {
  assert.equal(departmentOf("MEE351")?.slug, "mechanical");
  assert.equal(departmentOf("MEE 351")?.slug, "mechanical");
  assert.equal(departmentOf("CEE301")?.slug, "civil");
  assert.equal(departmentOf("GET208"), undefined);
});

test("100 and 200 level show every course, whatever the code", () => {
  assert.deepEqual(coursesFor(courses, 200).map((c) => c.code), ["PRE212"]);
});

test("300 level and above only show the chosen department", () => {
  assert.deepEqual(coursesFor(courses, 300, "mechanical").map((c) => c.code), ["MEE351", "MEE332"]);
  assert.deepEqual(coursesFor(courses, 300, "civil"), []);
  assert.deepEqual(coursesFor(courses, 500, "mechanical"), []);
});

test("the back link goes to the level, or to the department from 300 level", () => {
  assert.equal(levelPath({ code: "MTH101", level: 100 }), "/levels/100");
  assert.equal(levelPath({ code: "MEE351", level: 300 }), "/levels/300/mechanical");
});
