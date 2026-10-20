"use client";

import { useState, type InputHTMLAttributes } from "react";
import { MIN_DATE_INPUT, isCompleteDateInput } from "@/lib/checklist/dates";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "onBlur"> & {
  value: string;
  /** Called with the new date ("" when cleared) once it's worth saving. */
  onCommit: (value: string) => void;
};

/** A date field that saves once the date is whole, not on every keystroke. Typed in by
 * hand, Chrome reports a date as soon as the first year digit goes in ("2" → 0002), and
 * saving that refetches the project and redraws the field mid-typing, wiping the year. So
 * the field keeps its own draft while focused and saves once the year has four digits (as
 * the date picker gives straight away) or the field is cleared. Leaving a year half-typed
 * puts the saved date back. */
export function DateInput({ value, onCommit, ...rest }: Props) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [lastCommitted, setLastCommitted] = useState(value);

  // Follow the saved value while the user isn't in the field.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLastCommitted(value);
    if (!focused) setDraft(value);
  }

  function commit(next: string) {
    if (next === lastCommitted) return;
    setLastCommitted(next);
    onCommit(next);
  }

  return (
    <input
      min={MIN_DATE_INPUT}
      {...rest}
      type="date"
      value={draft}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        // "" is a cleared field (Delete, or the picker's Clear): safe to save at once, as the
        // field isn't redrawn from the saved value while focused.
        if (e.target.value === "" || isCompleteDateInput(e.target.value)) commit(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        // A year left short of four digits puts the saved date back.
        if (draft !== "" && !isCompleteDateInput(draft)) setDraft(value);
      }}
    />
  );
}
