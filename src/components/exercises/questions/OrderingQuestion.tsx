import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface OrderItem {
  label: string;
  value: string;
  order: number;
  image_url?: string;
}

interface OrderingQuestionProps {
  options: OrderItem[];
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  attemptId?: string | null;
}

function SortableItem({ id, label, imageUrl }: { id: string; label: string; imageUrl?: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm select-none ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : "hover:shadow-md"
      } transition-shadow`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
      {imageUrl && (
        <img src={imageUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
      )}
      <span className="font-medium text-foreground text-lg">{label}</span>
    </div>
  );
}

function shuffleWithSeed(arr: OrderItem[], seed: string): OrderItem[] {
  const shuffled = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = Math.abs(hash) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function OrderingQuestion({ options, value, onChange, attemptId }: OrderingQuestionProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const shuffledOptions = useMemo(() => {
    const sorted = [...options].sort((a, b) => a.order - b.order);
    return shuffleWithSeed(sorted, attemptId || "default");
  }, [options, attemptId]);

  const [items, setItems] = useState<OrderItem[]>(() => {
    if (value && value.length > 0) {
      return value.map((v) => options.find((o) => o.value === v)!).filter(Boolean);
    }
    return shuffledOptions;
  });

  useEffect(() => {
    if (!value || value.length === 0) {
      setItems(shuffledOptions);
    }
  }, [shuffledOptions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.value === active.id);
      const newIndex = prev.findIndex((i) => i.value === over.id);
      const newItems = arrayMove(prev, oldIndex, newIndex);
      onChange(newItems.map((i) => i.value));
      return newItems;
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("exercises.orderingHint", "Drag and drop the items into the correct order.")}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.value)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem
                key={item.value}
                id={item.value}
                label={item.label}
                imageUrl={item.image_url}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
