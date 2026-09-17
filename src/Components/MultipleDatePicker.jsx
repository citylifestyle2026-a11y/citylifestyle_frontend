import { useEffect, useRef, useState } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import "../assets/CSS/MultipleDatePicker.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, isSameDay } from "date-fns";
const MultipleDatePicker = ({
    value = [],
    onChange,
    placeholder = "Select Allow Dates",
    // Optional native range constraint (react-day-picker Date objects).
    // Left undefined, the picker behaves exactly as before.
    minDate = null,
    maxDate = null,
    // When true, the picker cannot be opened at all (e.g. while the bounds
    // it needs haven't loaded yet).
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);

    const wrapperRef = useRef(null);
    const [tempDates, setTempDates] = useState(value);

    useEffect(() => {
        setTempDates(value);
    }, [value]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, []);

    // react-day-picker's own `disabled` matcher — dates before minDate or
    // after maxDate become genuinely unclickable in the grid, not just
    // rejected after the fact.
    //
    // BUT: a date already saved on this Ticket Type (passed in via `value`
    // when the picker opened) must stay clickable even if it now falls
    // outside the Event's current min/max range — e.g. the Event's dates
    // were edited after this Ticket Type was created. Otherwise
    // react-day-picker's disabled matcher blocks ALL interaction with that
    // day, including deselecting it, and the user gets permanently stuck
    // with a date they can see selected but can never remove or change.
    // Only brand-new out-of-range picks should be blocked — existing ones
    // must remain fully editable.
    const isOriginallySelected = (date) =>
        value.some((d) => isSameDay(d, date));

    const isOutsideRange = (date) =>
        (minDate && date < minDate) || (maxDate && date > maxDate);

    const dateDisabledMatcher = (date) =>
        isOutsideRange(date) && !isOriginallySelected(date);

    const hasRangeBounds = Boolean(minDate || maxDate);

    return (
        <div
            className="multipleDatePicker"
            ref={wrapperRef}
        >
            <div
                className={`multipleDatePicker-input${disabled ? " multipleDatePicker-input--disabled" : ""}`}
                onClick={() => {
                    if (disabled) return;
                    setOpen(true);
                }}
            >
                <input
                    type="text"
                    readOnly
                    disabled={disabled}
                    value={
                        value.length
                            ? value.map((date) => format(date, "dd/MM/yyyy")).join(", ")
                            : ""
                    }
                    placeholder={placeholder}
                />

                <FaRegCalendarAlt className="calendarIcon" />
            </div>

            {open && !disabled && (
                <div className="multipleDatePicker-popup">

                    <DayPicker
                        mode="multiple"
                        selected={tempDates}
                        onSelect={(dates) => setTempDates(dates || [])}
                        showOutsideDays
                        disabled={hasRangeBounds ? dateDisabledMatcher : undefined}
                    />
                    <div className="multipleDatePicker-footer">
                        <button
                            type="button"
                            className="multipleDatePicker-cancel"
                            onClick={() => {
                                setTempDates(value);
                                setOpen(false);
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="multipleDatePicker-apply"
                            onClick={() => {
                                onChange(tempDates);
                                setOpen(false);
                            }}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MultipleDatePicker;