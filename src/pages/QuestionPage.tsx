import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../api/auth";
import { useThreads } from "../api/community";
import {
  checkAnswer,
  checkDecoder,
  useQuestion,
  useSolution,
} from "../api/queries";
import type {
  AttemptContext,
  QuestionRead,
  QuestionSolution,
} from "../api/types";
import { ErrorView, Loading } from "../components/QueryStates";
import ThreadList from "../components/ThreadList";

type DecoderPrompt = QuestionRead["decoder"][number];
type PartPrompt = QuestionRead["parts"][number];
type PartSolution = QuestionSolution["parts"][number];

// Marks the decoder phrases inside the question text, so the student sees
// exactly which words carry the physics.
function highlightPhrases(statement: string, phrases: string[]): ReactNode[] {
  const lower = statement.toLowerCase();
  const hits = phrases
    .map((phrase) => ({
      start: lower.indexOf(phrase.toLowerCase()),
      length: phrase.length,
    }))
    .filter((hit) => hit.start >= 0)
    .sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue; // overlaps the previous phrase: leave it plain
    nodes.push(statement.slice(cursor, hit.start));
    nodes.push(
      <mark key={hit.start}>
        {statement.slice(hit.start, hit.start + hit.length)}
      </mark>
    );
    cursor = hit.start + hit.length;
  }
  nodes.push(statement.slice(cursor));
  return nodes;
}

// Turns what the student typed into a number, or null if it isn't one.
// Accepts a comma as the decimal point and the long minus sign phones sometimes insert.
function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace("−", "-").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function reviewNote(question: QuestionRead): {
  text: string;
  checked: boolean;
} {
  if (question.status === "checked" || question.status === "live") {
    return {
      text: question.checked_by
        ? `Checked by ${question.checked_by}.`
        : "Checked by a scholar.",
      checked: true,
    };
  }
  return {
    text: "Solved once and still waiting for a scholar's independent check. Treat the answers as provisional.",
    checked: false,
  };
}

export default function QuestionPage() {
  const { slug = "" } = useParams();
  const {
    data: question,
    isPending,
    isError,
    error,
    refetch,
  } = useQuestion(slug);
  // What the student has tried so far. It is attached if they ask the community for help.
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (isPending) return <Loading label='Loading question…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  const total = question.decoder.length;
  const decodedCount = Object.keys(choices).length;
  const unlocked = decodedCount >= total;
  const review = reviewNote(question);

  const attempt: AttemptContext = {
    decoder_choices: Object.entries(choices).map(([position, choice]) => ({
      position: Number(position),
      choice,
    })),
    answers: Object.entries(answers).map(([label, value]) => ({
      label,
      value,
    })),
  };

  return (
    <>
      <Link to={`/topics/${question.topic_slug}?tab=practise`} className='back'>
        ← Back to questions
      </Link>
      <h1>{question.title}</h1>
      <div className='question-meta'>
        <span className='badge'>{question.source}</span>
        {question.difficulty === "twisted" && (
          <span className='badge live'>Twisted</span>
        )}
      </div>

      <section className='panel statement'>
        <p>
          {highlightPhrases(
            question.statement,
            question.decoder.map((item) => item.phrase)
          )}
        </p>
        <p className={review.checked ? "review good" : "review"}>
          {review.text}
        </p>
      </section>

      {total > 0 && (
        <section className='question-section'>
          <h2 className='heading'>Decode the question</h2>
          <p className='lead'>
            Before any maths: what does each highlighted phrase mean physically?{" "}
            {decodedCount} of {total} decoded.
          </p>
          <ol className='list'>
            {question.decoder.map((prompt) => (
              <DecoderItem
                key={prompt.position}
                slug={question.slug}
                prompt={prompt}
                onDone={(position, choice) =>
                  setChoices((current) => ({ ...current, [position]: choice }))
                }
              />
            ))}
          </ol>
        </section>
      )}

      <section className='question-section'>
        <h2 className='heading'>Your answers</h2>
        {unlocked ? (
          <ol className='list'>
            {question.parts.map((part) => (
              <PartAnswer
                key={part.label}
                slug={question.slug}
                part={part}
                onAttempt={(label, value) =>
                  setAnswers((current) => ({ ...current, [label]: value }))
                }
              />
            ))}
          </ol>
        ) : (
          <div className='panel placeholder'>
            <p>
              Decode the {total === 1 ? "phrase" : `${total} phrases`} above to
              unlock the answer boxes.
            </p>
          </div>
        )}
      </section>

      <section className='question-section'>
        <h2 className='heading'>Solution</h2>
        <Solution slug={question.slug} />
      </section>

      <section className='question-section'>
        <h2 className='heading'>Ask the community</h2>
        <Community slug={question.slug} attempt={attempt} />
      </section>
    </>
  );
}

type DecoderItemProps = {
  slug: string;
  prompt: DecoderPrompt;
  onDone: (position: number, choice: string) => void;
};

function DecoderItem({ slug, prompt, onDone }: DecoderItemProps) {
  const mutation = useMutation({
    mutationFn: (choice: string) => checkDecoder(slug, prompt.position, choice),
    onSuccess: (_result, choice) => onDone(prompt.position, choice),
  });
  const result = mutation.data;

  function optionClass(option: string) {
    if (!result) return "choice";
    if (option === result.meaning) return "choice is-right";
    if (option === mutation.variables) return "choice is-wrong";
    return "choice";
  }

  return (
    <li className='panel'>
      <p className='decode-phrase'>“{prompt.phrase}”</p>
      <div className='predict-options'>
        {prompt.options.map((option) => (
          <button
            key={option}
            className={optionClass(option)}
            disabled={mutation.isPending || result !== undefined}
            onClick={() => mutation.mutate(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {result && (
        <p className={result.correct ? "feedback good" : "feedback"}>
          <strong>{result.correct ? "Correct." : "Not quite."}</strong>{" "}
          {result.correct
            ? "That is what the examiner means."
            : `It means: ${result.meaning}`}
        </p>
      )}
      {mutation.isError && (
        <p className='feedback'>Couldn't check that. Tap your choice again.</p>
      )}
    </li>
  );
}

type PartAnswerProps = {
  slug: string;
  part: PartPrompt;
  onAttempt: (label: string, value: number) => void;
};

function PartAnswer({ slug, part, onAttempt }: PartAnswerProps) {
  const [text, setText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [wrongTries, setWrongTries] = useState(0);
  const mutation = useMutation({
    mutationFn: (value: number) => checkAnswer(slug, part.label, value),
    onSuccess: (result, value) => {
      onAttempt(part.label, value);
      if (!result.correct) setWrongTries((count) => count + 1);
    },
  });
  const result = mutation.data;
  const solved = result?.correct === true;
  const inputId = `answer-${part.label}`;

  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    const value = parseNumber(text);
    if (value === null) {
      setInputError("Enter a number, for example 87.08");
      return;
    }
    setInputError(null);
    mutation.mutate(value);
  }

  function flipSign() {
    setText((current) => {
      const cleaned = current.trim().replace("−", "-");
      return cleaned.startsWith("-") ? cleaned.slice(1) : `-${cleaned}`;
    });
  }

  if (!part.checkable) {
    return (
      <li className='panel'>
        <p className='part-prompt'>{part.prompt}</p>
        <p className='hint'>
          This part is a sketch or explanation, so it isn't marked here. Compare
          with the solution.
        </p>
      </li>
    );
  }

  return (
    <li className='panel'>
      <form onSubmit={submit}>
        <label className='part-prompt' htmlFor={inputId}>
          {part.prompt}
        </label>
        <div className='answer-row'>
          <button
            type='button'
            className='sign'
            onClick={flipSign}
            disabled={solved}
            aria-label='Change sign'
            title='Change sign'
          >
            ±
          </button>
          <input
            id={inputId}
            className='answer-input'
            inputMode='decimal'
            autoComplete='off'
            placeholder='Your answer'
            value={text}
            disabled={solved}
            onChange={(event) => setText(event.target.value)}
          />
          {part.unit && <span className='unit'>{part.unit}</span>}
          <button
            className='button'
            type='submit'
            disabled={solved || mutation.isPending}
          >
            {mutation.isPending ? "Checking…" : "Check"}
          </button>
        </div>
      </form>

      {inputError && <p className='feedback'>{inputError}</p>}
      {mutation.isError && (
        <p className='feedback'>Couldn't reach the server. Try again.</p>
      )}
      {result && !inputError && (
        <p className={solved ? "feedback good" : "feedback"}>
          {solved ? (
            <>
              <strong>Correct.</strong> Accepted answer: {result.expected}
              {result.unit ? ` ${result.unit}` : ""} (within{" "}
              {Number(result.tolerance_percent.toFixed(2))}%).
            </>
          ) : (
            <>
              <strong>Not yet.</strong> Check your decoding and units, then try
              again.
              {wrongTries >= 2 &&
                " Still stuck? Open the solution below one step at a time."}
            </>
          )}
        </p>
      )}
    </li>
  );
}

function Solution({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const {
    data: solution,
    isPending,
    isError,
    error,
    refetch,
  } = useSolution(slug, open);

  if (!open) {
    return (
      <div className='panel'>
        <p className='hint'>
          Try every part first. A solution teaches more after you have made an
          attempt.
        </p>
        <button className='button button-quiet' onClick={() => setOpen(true)}>
          Show the solution
        </button>
      </div>
    );
  }
  if (isPending) return <Loading label='Loading solution…' />;
  if (isError) return <ErrorView error={error} onRetry={() => refetch()} />;

  return (
    <ol className='list'>
      {solution.parts.map((part) => (
        <SolutionPart key={part.label} part={part} />
      ))}
    </ol>
  );
}

function SolutionPart({ part }: { part: PartSolution }) {
  // Steps are revealed one at a time: a hint first, the full working only if needed.
  const [shown, setShown] = useState(1);
  const finished = shown >= part.steps.length;

  return (
    <li className='panel'>
      <p className='part-prompt'>{part.prompt}</p>
      <ol className='steps'>
        {part.steps.slice(0, shown).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {finished ? (
        part.answer_value !== null && (
          <p className='answer-line'>
            Answer:{" "}
            <b>
              {part.answer_value}
              {part.answer_unit ? ` ${part.answer_unit}` : ""}
            </b>
          </p>
        )
      ) : (
        <button
          className='button button-quiet'
          onClick={() => setShown((count) => count + 1)}
        >
          Next step ({shown} of {part.steps.length})
        </button>
      )}
    </li>
  );
}

// Discussions about this question, and the way in to ask a new one.
function Community({
  slug,
  attempt,
}: {
  slug: string;
  attempt: AttemptContext;
}) {
  const { user } = useAuth();
  const { data } = useThreads({ question: slug });
  const askUrl = `/community/new?question=${encodeURIComponent(slug)}`;

  return (
    <>
      <div className='panel ask-box'>
        <p className='hint'>
          Still stuck after the solution? Ask, and your decoder choices and
          answers are attached automatically, so helpers can see exactly where
          you went wrong.
        </p>
        {user ? (
          <Link className='button' to={askUrl} state={{ attempt }}>
            Ask about this question
          </Link>
        ) : (
          <Link
            className='button button-quiet'
            to={`/login?next=${encodeURIComponent(`/questions/${slug}`)}`}
          >
            Log in to ask
          </Link>
        )}
      </div>
      {data && data.items.length > 0 && (
        <ThreadList threads={data.items} empty={null} />
      )}
    </>
  );
}
