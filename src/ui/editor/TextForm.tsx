import { useId } from "react";
import { MAX_TEXT_LENGTH, TEXT_FONTS, type TextFamily, type TextSpec } from "../../core/project";
import { isRightToLeft } from "../../render/pictures";

const FAMILIES = Object.keys(TEXT_FONTS) as TextFamily[];
const WEIGHT_NAMES: Record<number, string> = { 400: "Regular", 700: "Bold", 900: "Black" };

/** Fonts that have Arabic-script letters; the others fall back to a system font for Persian. */
const ARABIC_SCRIPT_FONTS: readonly TextFamily[] = ["Vazirmatn"];

/** Text to hide: message, font, weight and size. Persian text switches to Vazirmatn by itself. */
export function TextForm({
  spec,
  onChange,
}: {
  spec: TextSpec;
  onChange: (spec: TextSpec) => void;
}) {
  const id = useId();
  const weights: readonly number[] = TEXT_FONTS[spec.family];

  return (
    <div className="text-form">
      <label htmlFor={`${id}-text`}>Text</label>
      <textarea
        id={`${id}-text`}
        rows={2}
        dir="auto"
        maxLength={MAX_TEXT_LENGTH}
        value={spec.text}
        onChange={(event) => {
          const text = event.target.value;
          const persian = isRightToLeft(text) && !ARABIC_SCRIPT_FONTS.includes(spec.family);
          onChange(
            persian ? { ...spec, text, family: "Vazirmatn", weight: 900 } : { ...spec, text },
          );
        }}
      />
      <label htmlFor={`${id}-font`}>Font</label>
      <select
        id={`${id}-font`}
        value={spec.family}
        onChange={(event) => {
          const family = event.target.value as TextFamily;
          const available: readonly number[] = TEXT_FONTS[family];
          const weight = available.includes(spec.weight) ? spec.weight : (available.at(-1) ?? 400);
          onChange({ ...spec, family, weight });
        }}
      >
        {FAMILIES.map((family) => (
          <option key={family} value={family}>
            {family}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-weight`}>Weight</label>
      <select
        id={`${id}-weight`}
        value={spec.weight}
        onChange={(event) => {
          onChange({ ...spec, weight: Number(event.target.value) });
        }}
      >
        {weights.map((w) => (
          <option key={w} value={w}>
            {WEIGHT_NAMES[w] ?? String(w)}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-size`}>Size</label>
      <input
        id={`${id}-size`}
        type="range"
        min={0.3}
        max={1}
        step={0.05}
        value={spec.size}
        onChange={(event) => {
          onChange({ ...spec, size: Number(event.target.value) });
        }}
      />
    </div>
  );
}
