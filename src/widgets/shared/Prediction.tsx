export type PredictionData = {
  prompt: string;
  options: string[];
  correct: number; // index of the right option
  explain: string; // shown after any answer, right or wrong
};

type Props = {
  data: PredictionData;
  predicted: number | null;
  onPredict: (index: number) => void;
};

// "Predict first": the student commits to an answer before the controls unlock.
// A wrong answer still unlocks them. The point is to think first, not to be blocked.
export default function Prediction({ data, predicted, onPredict }: Props) {
  return (
    <div className='predict'>
      <p className='predict-prompt'>{data.prompt}</p>
      {predicted === null ? (
        <div className='predict-options'>
          {data.options.map((option, index) => (
            <button
              key={option}
              className='choice'
              onClick={() => onPredict(index)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <p
          className={predicted === data.correct ? "feedback good" : "feedback"}
        >
          <strong>
            {predicted === data.correct ? "Correct." : "Not yet."}
          </strong>{" "}
          {data.explain}
        </p>
      )}
    </div>
  );
}
