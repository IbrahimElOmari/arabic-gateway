import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Option {
  label: string;
  value: string;
  isCorrect?: boolean;
}

interface CheckboxQuestionProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function CheckboxQuestion({
  options,
  value,
  onChange,
  disabled = false,
}: CheckboxQuestionProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <div
          key={option.value}
          className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <Checkbox
            id={option.value}
            checked={value.includes(option.value)}
            onCheckedChange={(checked) => handleChange(option.value, !!checked)}
            disabled={disabled}
          />
          <Label
            htmlFor={option.value}
            className="flex-1 cursor-pointer font-normal"
          >
            {option.label}
          </Label>
        </div>
      ))}
    </div>
  );
}
