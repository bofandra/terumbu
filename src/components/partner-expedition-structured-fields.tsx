"use client";

import { Copy, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EditableListItem = {
  id: string;
  value: string;
};

type EditableItineraryDay = {
  id: string;
  day: string;
  title: string;
  meals: string;
  physicalLevel: string;
  activities: EditableListItem[];
};

type ExpeditionItineraryDay = {
  day: string;
  title: string;
  meals: string;
  physicalLevel: string;
  activities: string[];
};

const inputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2";

function createListItem(value: string, id: string): EditableListItem {
  return {
    id,
    value
  };
}

function listItems(values: string[], prefix: string) {
  const source = values.length > 0 ? values : [""];

  return source.map((value, index) => createListItem(value, `${prefix}-${index}`));
}

function createItineraryDay(day: ExpeditionItineraryDay, index: number): EditableItineraryDay {
  return {
    id: `day-${index}`,
    day: day.day || `Day ${index + 1}`,
    title: day.title,
    meals: day.meals,
    physicalLevel: day.physicalLevel || "Light",
    activities: listItems(day.activities, `day-${index}-activity`)
  };
}

function updateAt<T>(items: T[], index: number, updater: (item: T) => T) {
  return items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item));
}

function removeAt<T>(items: T[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function ExpeditionListField({
  label,
  name,
  items,
  addLabel,
  placeholder,
  className
}: {
  label: string;
  name: string;
  items: string[];
  addLabel: string;
  placeholder?: string;
  className?: string;
}) {
  const [rows, setRows] = useState(() => listItems(items, name));
  const nextRowIndex = useRef(rows.length);

  return (
    <section className={cn("grid min-w-0 gap-2", className)} aria-labelledby={`${name}-label`}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={`${name}-label`} className="text-sm font-bold text-ocean-900">{label}</h3>
        <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-bold text-ocean-700">
          {rows.filter((row) => row.value.trim()).length.toLocaleString("id-ID")}
        </span>
      </div>
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2">
            <input
              name={name}
              value={row.value}
              placeholder={placeholder}
              onChange={(event) => {
                const nextValue = event.target.value;
                setRows((current) => updateAt(current, index, (item) => ({ ...item, value: nextValue })));
              }}
              className={inputClassName}
            />
            <button
              type="button"
              aria-label={`Remove ${label} item`}
              className="grid min-h-11 place-items-center rounded-lg border border-ocean-900/10 bg-white text-ocean-900/62 transition hover:border-coral-500 hover:text-coral-700"
              onClick={() => setRows((current) => (current.length > 1 ? removeAt(current, index) : [{ ...current[0], value: "" }]))}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        tone="ghost"
        className="w-fit rounded-lg border border-ocean-900/10 bg-white"
        onClick={() =>
          setRows((current) => {
            const rowId = `${name}-${nextRowIndex.current}`;
            nextRowIndex.current += 1;

            return [...current, createListItem("", rowId)];
          })
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        {addLabel}
      </Button>
    </section>
  );
}

export function ExpeditionItineraryBuilder({
  rows,
  physicalOptions
}: {
  rows: ExpeditionItineraryDay[];
  physicalOptions: string[];
}) {
  const initialRows = rows.length > 0 ? rows : [{ day: "Day 1", title: "", meals: "", physicalLevel: "Light", activities: [] }];
  const [days, setDays] = useState(() => initialRows.map((day, index) => createItineraryDay(day, index)));
  const nextDayNumber = useRef(days.length + 1);
  const nextDayIndex = useRef(days.length);

  function updateDay(index: number, updater: (day: EditableItineraryDay) => EditableItineraryDay) {
    setDays((current) => updateAt(current, index, updater));
  }

  function addDay(source?: EditableItineraryDay) {
    setDays((current) => {
      const dayNumber = nextDayNumber.current;
      const dayIndex = nextDayIndex.current;
      nextDayNumber.current += 1;
      nextDayIndex.current += 1;
      const newDay = source
        ? {
            ...source,
            id: `day-${dayIndex}`,
            day: source.day ? `${source.day} copy` : `Day ${dayNumber}`,
            activities: listItems(
              source.activities.map((activity) => activity.value),
              `day-${dayIndex}-activity`
            )
          }
        : createItineraryDay({ day: `Day ${dayNumber}`, title: "", meals: "", physicalLevel: "Light", activities: [] }, dayIndex);

      return [...current, newDay];
    });
  }

  return (
    <section className="grid gap-3" aria-label="Itinerary days">
      {days.map((day, dayIndex) => (
        <details key={day.id} open={dayIndex === 0} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-sand-50">
          <summary className="cursor-pointer px-3 py-3 text-sm font-bold text-ocean-900">
            <span className="inline-flex flex-wrap items-center gap-2">
              <span>{day.day || `Day ${dayIndex + 1}`}</span>
              {day.title ? <span className="text-ocean-900/54">/ {day.title}</span> : null}
            </span>
          </summary>
          <div className="grid gap-3 border-t border-ocean-900/10 p-3">
            <div className="grid gap-2 md:grid-cols-4">
              <input
                name="itineraryDay"
                value={day.day}
                placeholder="Day"
                onChange={(event) => updateDay(dayIndex, (item) => ({ ...item, day: event.target.value }))}
                className={inputClassName}
              />
              <input
                name="itineraryDayTitle"
                value={day.title}
                placeholder="Title"
                onChange={(event) => updateDay(dayIndex, (item) => ({ ...item, title: event.target.value }))}
                className={inputClassName}
              />
              <input
                name="itineraryMeals"
                value={day.meals}
                placeholder="Meals"
                onChange={(event) => updateDay(dayIndex, (item) => ({ ...item, meals: event.target.value }))}
                className={inputClassName}
              />
              <select
                name="itineraryPhysicalLevel"
                value={day.physicalLevel}
                onChange={(event) => updateDay(dayIndex, (item) => ({ ...item, physicalLevel: event.target.value }))}
                className={inputClassName}
              >
                {physicalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <input type="hidden" name="itineraryActivities" value={day.activities.map((activity) => activity.value).filter(Boolean).join("\n")} />
            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-normal text-ocean-900/50">Activities</p>
              {day.activities.map((activity, activityIndex) => (
                <div key={activity.id} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2">
                  <input
                    value={activity.value}
                    placeholder="Activity"
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateDay(dayIndex, (item) => ({
                        ...item,
                        activities: updateAt(item.activities, activityIndex, (activityItem) => ({ ...activityItem, value: nextValue }))
                      }));
                    }}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    aria-label="Remove activity"
                    className="grid min-h-11 place-items-center rounded-lg border border-ocean-900/10 bg-white text-ocean-900/62 transition hover:border-coral-500 hover:text-coral-700"
                    onClick={() =>
                      updateDay(dayIndex, (item) => ({
                        ...item,
                        activities: item.activities.length > 1 ? removeAt(item.activities, activityIndex) : [createListItem("", `day-${dayIndex}-activity-empty-${crypto.randomUUID()}`)]
                      }))
                    }
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                tone="ghost"
                className="w-fit rounded-lg border border-ocean-900/10 bg-white"
                onClick={() =>
                  updateDay(dayIndex, (item) => ({
                    ...item,
                    activities: [...item.activities, createListItem("", `day-${dayIndex}-activity-${crypto.randomUUID()}`)]
                  }))
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Add activity
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" tone="ghost" className="rounded-lg border border-ocean-900/10 bg-white" onClick={() => addDay(day)}>
                <Copy className="size-4" aria-hidden="true" />
                Duplicate day
              </Button>
              {days.length > 1 ? (
                <Button type="button" tone="ghost" className="rounded-lg border border-ocean-900/10 bg-white" onClick={() => setDays((current) => removeAt(current, dayIndex))}>
                  <X className="size-4" aria-hidden="true" />
                  Remove day
                </Button>
              ) : null}
            </div>
          </div>
        </details>
      ))}
      <Button type="button" tone="ghost" className="w-fit rounded-lg border border-ocean-900/10 bg-white" onClick={() => addDay()}>
        <Plus className="size-4" aria-hidden="true" />
        Add itinerary day
      </Button>
    </section>
  );
}
