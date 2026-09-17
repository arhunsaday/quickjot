import {
  DEFAULT_WRITING_PREFERENCES,
  type WritingPreferences,
} from "@/lib/writing-preferences";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function WritingPreferencesModal({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: WritingPreferences;
  onChange: (value: WritingPreferences) => void;
}) {
  const selectClass =
    "bg-background w-full rounded-md border px-3 py-2 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Writing preferences</DialogTitle>
          <DialogDescription>
            Saved on this device. Choose a comfortable space to write.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-2 text-sm">
            Page width
            <select
              className={selectClass}
              value={value.width}
              onChange={(e) =>
                onChange({
                  ...value,
                  width: e.target.value as WritingPreferences["width"],
                })
              }
            >
              <option value="narrow">Narrow</option>
              <option value="comfortable">Comfortable</option>
              <option value="wide">Wide</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            Font
            <select
              className={selectClass}
              value={value.font}
              onChange={(e) =>
                onChange({
                  ...value,
                  font: e.target.value as WritingPreferences["font"],
                })
              }
            >
              <option value="sans">Sans serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            Text size
            <select
              className={selectClass}
              value={value.fontSize}
              onChange={(e) =>
                onChange({ ...value, fontSize: Number(e.target.value) })
              }
            >
              {[15, 17, 19, 21].map((size) => (
                <option key={size} value={size}>
                  {size} px
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            Line spacing
            <select
              className={selectClass}
              value={value.lineHeight}
              onChange={(e) =>
                onChange({ ...value, lineHeight: Number(e.target.value) })
              }
            >
              <option value={1.5}>Compact</option>
              <option value={1.7}>Comfortable</option>
              <option value={2}>Roomy</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={value.typewriter}
            onChange={(e) =>
              onChange({ ...value, typewriter: e.target.checked })
            }
          />
          Keep the caret near the center while writing
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={value.dimInactive}
            onChange={(e) =>
              onChange({ ...value, dimInactive: e.target.checked })
            }
          />
          Dim inactive blocks
        </label>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onChange({ ...DEFAULT_WRITING_PREFERENCES })}
          >
            Reset defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
