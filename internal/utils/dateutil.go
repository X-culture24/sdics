package utils

import "time"

const dateOnlyFormat = "2006-01-02"

func DateOnly(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func ParseDateOnly(s string) (time.Time, error) {
	return time.Parse(dateOnlyFormat, s)
}

func FormatDateOnly(t time.Time) string {
	return t.Format(dateOnlyFormat)
}

func IsWeekend(t time.Time) bool {
	d := t.Weekday()
	return d == time.Saturday || d == time.Sunday
}

type WorkingDayCalendar struct {
	holidays map[string]struct{}
}

func NewWorkingDayCalendar(publicHolidayDates []time.Time) *WorkingDayCalendar {
	m := make(map[string]struct{}, len(publicHolidayDates))
	for _, d := range publicHolidayDates {
		m[FormatDateOnly(DateOnly(d))] = struct{}{}
	}
	return &WorkingDayCalendar{holidays: m}
}

func (c *WorkingDayCalendar) IsHoliday(t time.Time) bool {
	_, ok := c.holidays[FormatDateOnly(DateOnly(t))]
	return ok
}

func (c *WorkingDayCalendar) IsWorkingDay(t time.Time) bool {
	return !IsWeekend(t) && !c.IsHoliday(t)
}

func (c *WorkingDayCalendar) CountWorkingDaysInclusive(start, end time.Time) int {
	start = DateOnly(start)
	end = DateOnly(end)
	if end.Before(start) {
		return 0
	}
	count := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		if c.IsWorkingDay(d) {
			count++
		}
	}
	return count
}

func (c *WorkingDayCalendar) RemainingWorkingDays(today, end time.Time) int {
	today = DateOnly(today)
	end = DateOnly(end)
	if today.After(end) {
		return 0
	}
	return c.CountWorkingDaysInclusive(today, end)
}
