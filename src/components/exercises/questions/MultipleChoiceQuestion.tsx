import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Option {
  label: string;
  value: string;
  isCorrect?: boolean;
}

interface MultipleChoiceQuestionProps {
  options: Option[];
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({
  options,
  value,
  onChange,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <RadioGroupItem value={option.value} id={option.value} />
            <Label
              htmlFor={option.value}
              className="flex-1 cursor-pointer font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}
