import { Textarea } from "@/components/ui/textarea";

interface OpenTextQuestionProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

export function OpenTextQuestion({
  value,
  onChange,
  placeholder = "Type your answer here...",
  disabled = false,
  rows = 4,
}: OpenTextQuestionProps) {
  return (
    <Textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="resize-none"
    />
  );
}
