package middleware

import (
	"reflect"
	"testing"

	"github.com/google/uuid"
)

func TestIntersectAllowedUnitsUsesSelectedScopeForSystemAdmins(t *testing.T) {
	selected := []uuid.UUID{uuid.New(), uuid.New()}
	got := intersectAllowedUnits("System Administrator", nil, selected)
	if !reflect.DeepEqual(got, selected) {
		t.Fatalf("expected selected scope to be used for system admin, got %v", got)
	}
}

func TestIntersectAllowedUnitsIntersectsScopedUsers(t *testing.T) {
	userScope := []uuid.UUID{uuid.MustParse("11111111-1111-1111-1111-111111111111")}
	selectedScope := []uuid.UUID{uuid.MustParse("11111111-1111-1111-1111-111111111111"), uuid.MustParse("22222222-2222-2222-2222-222222222222")}

	got := intersectAllowedUnits("County Officer", userScope, selectedScope)
	want := []uuid.UUID{userScope[0]}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected intersection %v, got %v", want, got)
	}
}
