package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"gorm.io/gorm"
)

var (
	ErrAdminUnitNotFound         = errors.New("administrative unit not found")
	ErrInvalidParent             = errors.New("invalid parent administrative unit")
	ErrInvalidLevel              = errors.New("invalid administrative level")
	ErrHasDependents             = errors.New("cannot delete: unit has child units or associated citizens")
	ErrParentLevelMismatch       = errors.New("parent must be exactly one level above")
	ErrNationalUnitNeedsNoParent = errors.New("national-level unit cannot have a parent")
)

type AdminUnitService struct {
	db *gorm.DB
}

func NewAdminUnitService(db *gorm.DB) *AdminUnitService {
	return &AdminUnitService{db: db}
}

// Create creates a new administrative unit with validation
func (s *AdminUnitService) Create(unit *model.AdminUnit) error {
	// Level 1 (National) must have no parent
	if unit.Level == 1 {
		if unit.ParentID != nil {
			return ErrNationalUnitNeedsNoParent
		}
	} else {
		// All other levels must have a parent
		if unit.ParentID == nil {
			return ErrInvalidParent
		}

		var parent model.AdminUnit
		if err := s.db.First(&parent, "id = ?", unit.ParentID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrInvalidParent
			}
			return err
		}

		// Parent must be exactly one level above
		if parent.Level != unit.Level-1 {
			return ErrParentLevelMismatch
		}
	}

	// Enforce level bounds (1 = National, 8 = Village)
	if unit.Level < 1 || unit.Level > 8 {
		return ErrInvalidLevel
	}

	if unit.ID == uuid.Nil {
		unit.ID = uuid.New()
	}

	return s.db.Create(unit).Error
}

// GetByID retrieves a unit by ID with optional preloads
func (s *AdminUnitService) GetByID(id uuid.UUID, preloadParent, preloadChildren bool) (*model.AdminUnit, error) {
	var unit model.AdminUnit
	q := s.db

	if preloadParent {
		q = q.Preload("Parent")
	}
	if preloadChildren {
		q = q.Preload("Children")
	}

	if err := q.First(&unit, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminUnitNotFound
		}
		return nil, err
	}

	return &unit, nil
}

// List returns a paginated list of administrative units with optional filters
func (s *AdminUnitService) List(level *int16, parentID *uuid.UUID, nameFilter string, page, pageSize int) ([]model.AdminUnit, int64, error) {
	q := s.db.Model(&model.AdminUnit{})

	if level != nil {
		q = q.Where("level = ?", *level)
	}
	if parentID != nil {
		q = q.Where("parent_id = ?", *parentID)
	}
	if nameFilter != "" {
		q = q.Where("name ILIKE ?", "%"+nameFilter+"%")
	}

	var total int64
	q.Count(&total)

	if pageSize > 100 {
		pageSize = 100
	}
	if page < 1 {
		page = 1
	}

	var units []model.AdminUnit
	offset := (page - 1) * pageSize
	if err := q.Limit(pageSize).Offset(offset).Order("level, name").Find(&units).Error; err != nil {
		return nil, 0, err
	}

	return units, total, nil
}

// Update updates an existing administrative unit
func (s *AdminUnitService) Update(id uuid.UUID, updates map[string]interface{}) error {
	// Prevent changing ID, level, or parent after creation for data integrity
	delete(updates, "id")
	delete(updates, "level")
	delete(updates, "parent_id")

	result := s.db.Model(&model.AdminUnit{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAdminUnitNotFound
	}

	return nil
}

// Delete removes a unit only if it has no children or citizens
func (s *AdminUnitService) Delete(id uuid.UUID) error {
	// Check for child units
	var childCount int64
	s.db.Model(&model.AdminUnit{}).Where("parent_id = ?", id).Count(&childCount)
	if childCount > 0 {
		return ErrHasDependents
	}

	// Check for citizens
	var citizenCount int64
	s.db.Model(&model.Citizen{}).
		Where("county_id = ? OR district_id = ? OR division_id = ? OR location_id = ? OR sub_location_id = ? OR village_id = ?",
			id, id, id, id, id, id).
		Count(&citizenCount)
	if citizenCount > 0 {
		return ErrHasDependents
	}

	result := s.db.Delete(&model.AdminUnit{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAdminUnitNotFound
	}

	return nil
}

// GetDescendants returns all descendant unit IDs for a given unit (for RBAC scoping)
func (s *AdminUnitService) GetDescendants(unitID uuid.UUID) ([]uuid.UUID, error) {
	// Recursive CTE to fetch all descendants
	var ids []uuid.UUID
	err := s.db.Raw(`
		WITH RECURSIVE descendants AS (
			SELECT id FROM admin_units WHERE id = ?
			UNION
			SELECT a.id FROM admin_units a
			INNER JOIN descendants d ON a.parent_id = d.id
		)
		SELECT id FROM descendants
	`, unitID).Scan(&ids).Error

	return ids, err
}
