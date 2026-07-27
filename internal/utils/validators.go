package utils

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	kenyanPhoneRe = regexp.MustCompile(`^(?:\+?254|0)?(7\d{8}|1\d{8})$`)
	emailRe       = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
)

func NormalizeNationalID(id string) string {
	id = strings.TrimSpace(id)
	id = strings.ToUpper(id)
	id = strings.ReplaceAll(id, " ", "")
	id = strings.ReplaceAll(id, "-", "")
	return id
}

func ValidNationalID(id string) bool {
	id = NormalizeNationalID(id)
	if len(id) < 5 || len(id) > 15 {
		return false
	}
	for _, r := range id {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

func NormalizePhone(p string) string {
	p = strings.TrimSpace(p)
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")
	p = strings.ReplaceAll(p, "(", "")
	p = strings.ReplaceAll(p, ")", "")
	if strings.HasPrefix(p, "+254") {
		p = "0" + p[4:]
	} else if strings.HasPrefix(p, "254") {
		p = "0" + p[3:]
	}
	if kenyanPhoneRe.MatchString(p) {
		return p
	}
	return ""
}

func ValidEmail(e string) bool {
	return emailRe.MatchString(strings.TrimSpace(e))
}

func Truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}
