import { useState } from "react";
import type { Lesson, LessonBlock, Reference } from "../api/types";

// Renders a lesson file: big idea, sections built from blocks, summary table,
// self-check questions with hidden answers, and where to read more.
export default function LessonView({ lesson }: { lesson: Lesson }) {
  const checked = Boolean(lesson.review.checked_by);

  return (
    <article className='lesson'>
      <div className='panel lesson-idea'>
        <p className='eyebrow'>The big idea</p>
        <p>{lesson.big_idea}</p>
      </div>

      <section className='lesson-section'>
        <h2 className='heading'>What you will learn</h2>
        <ul className='lesson-list'>
          {lesson.you_will_learn.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {lesson.sections.map((section, index) => (
        <section className='lesson-section' key={section.heading}>
          <h2 className='heading'>
            {index + 1}. {section.heading}
          </h2>
          {section.blocks.map((block, blockIndex) => (
            <Block key={blockIndex} block={block} />
          ))}
        </section>
      ))}

      {lesson.summary.length > 0 && (
        <section className='lesson-section'>
          <h2 className='heading'>The whole lesson on one page</h2>
          <div className='table-wrap'>
            <table className='lesson-table'>
              <thead>
                <tr>
                  <th>Term</th>
                  <th>In plain words</th>
                </tr>
              </thead>
              <tbody>
                {lesson.summary.map((row) => (
                  <tr key={row.term}>
                    <td>{row.term}</td>
                    <td>{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {lesson.check_yourself.length > 0 && (
        <section className='lesson-section'>
          <h2 className='heading'>Check yourself</h2>
          <p className='lead'>
            Answer in your head or on paper first, then open the answer.
          </p>
          <ol className='list'>
            {lesson.check_yourself.map((item) => (
              <CheckItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </ol>
        </section>
      )}

      {lesson.references.length > 0 && <ReadMore references={lesson.references} />}

      <p className={checked ? "review good" : "review"}>
        {checked
          ? `Checked by ${lesson.review.checked_by}.`
          : "Written for Mech Lab and still waiting for a scholar's check. If something looks wrong, ask in Discuss."}
      </p>
    </article>
  );
}

function Block({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case "text":
      return <p className='lesson-text'>{block.text}</p>;
    case "list":
      return (
        <ul className='lesson-list'>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "formula":
      return (
        <div className='formula'>
          {block.label && <p className='formula-label'>{block.label}</p>}
          <p className='formula-body'>{block.formula}</p>
          {block.where.length > 0 && (
            <ul className='formula-where'>
              {block.where.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {block.source && <p className='formula-source'>{block.source}</p>}
        </div>
      );
    case "note":
      return (
        <div className={block.tone === "warning" ? "lesson-note warning" : "lesson-note"}>
          <strong>{block.title}</strong> {block.text}
        </div>
      );
    case "table":
      return (
        <div className='table-wrap'>
          <table className='lesson-table'>
            <thead>
              <tr>
                {block.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "example":
      return <Example block={block} />;
  }
}

// A worked example: the problem first, steps revealed one at a time so the
// student can try the next step before seeing it.
function Example({ block }: { block: Extract<LessonBlock, { kind: "example" }> }) {
  const [shown, setShown] = useState(0);
  const finished = shown >= block.steps.length;

  return (
    <div className='panel example'>
      <p className='eyebrow'>Worked example</p>
      <p className='card-title'>{block.title}</p>
      <p className='lesson-text'>{block.problem}</p>
      {shown > 0 && (
        <ol className='steps'>
          {block.steps.slice(0, shown).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {finished ? (
        <p className='answer-line'>
          <b>Answer:</b> {block.answer}
        </p>
      ) : (
        <div className='example-buttons'>
          <button
            className='button button-quiet'
            onClick={() => setShown((count) => count + 1)}
          >
            {shown === 0 ? "Show the first step" : `Next step (${shown} of ${block.steps.length})`}
          </button>
          <button
            className='button button-quiet'
            onClick={() => setShown(block.steps.length)}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  );
}

function CheckItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className='panel'>
      <p className='part-prompt'>{question}</p>
      {open ? (
        <p className='feedback good'>{answer}</p>
      ) : (
        <button className='button button-quiet' onClick={() => setOpen(true)}>
          Show the answer
        </button>
      )}
    </li>
  );
}

export function ReadMore({ references }: { references: Reference[] }) {
  return (
    <section className='lesson-section'>
      <h2 className='heading'>Read more in your textbooks</h2>
      <ul className='list'>
        {references.map((reference) => (
          <li key={reference.book + reference.where} className='panel reference'>
            <p className='card-title'>{reference.book}</p>
            <p className='card-meta'>{reference.where}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
