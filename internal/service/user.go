package service

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound         = errors.New("user not found")
	ErrEmailExists          = errors.New("email already registered")
	ErrRoleNotFound         = errors.New("role not found")
	ErrAdminUnitRefNotFound = errors.New("administrative unit not found")
	ErrCannotDeactivateSelf = errors.New("cannot deactivate your own account")
	ErrPasswordTooShort     = errors.New("password must be at least 8 characters")
)

type UserService struct {
	db        *gorm.DB
	authSvc   *AuthService
	adminUnit *AdminUnitService
}

func NewUserService(db *gorm.DB, authSvc *AuthService, adminUnit *AdminUnitService) *UserService {
	return &UserService{db: db, authSvc: authSvc, adminUnit: adminUnit}
}

type CreateUserParams struct {
	FullName    string
	Email       string
	Password    string
	RoleID      uuid.UUID
	AdminUnitID uuid.UUID
}

func (s *UserService) Create(params *CreateUserParams) (*model.User, error) {
	if len(params.Password) < 8 {
		return nil, ErrPasswordTooShort
	}

	var existing int64
	s.db.Model(&model.User{}).Where("email = ?", params.Email).Count(&existing)
	if existing > 0 {
		return nil, ErrEmailExists
	}

	var role model.Role
	if err := s.db.First(&role, "id = ?", params.RoleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	if _, err := s.adminUnit.GetByID(params.AdminUnitID, false, false); err != nil {
		if errors.Is(err, ErrAdminUnitNotFound) {
			return nil, ErrAdminUnitRefNotFound
		}
		return nil, err
	}

	pwHash, err := HashPassword(params.Password)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		ID:           uuid.New(),
		FullName:     params.FullName,
		Email:        params.Email,
		PasswordHash: pwHash,
		RoleID:       params.RoleID,
		AdminUnitID:  params.AdminUnitID,
		IsActive:     true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	return s.GetByID(user.ID)
}

func (s *UserService) GetByID(id uuid.UUID) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Role").Preload("AdminUnit").
		First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetByEmail(email string) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Role").Preload("AdminUnit").
		Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

type ListUsersFilter struct {
	RoleID      *uuid.UUID
	AdminUnitID *uuid.UUID
	IsActive    *bool
	NameFilter  string
	Page        int
	PageSize    int
}

func (s *UserService) List(f *ListUsersFilter, scopedUnits []uuid.UUID) ([]model.User, int64, error) {
	q := s.db.Model(&model.User{})

	if f.RoleID != nil {
		q = q.Where("role_id = ?", *f.RoleID)
	}
	if f.AdminUnitID != nil {
		q = q.Where("admin_unit_id = ?", *f.AdminUnitID)
	}
	if f.IsActive != nil {
		q = q.Where("is_active = ?", *f.IsActive)
	}
	if f.NameFilter != "" {
		q = q.Where("full_name ILIKE ? OR email ILIKE ?",
			"%"+f.NameFilter+"%", "%"+f.NameFilter+"%")
	}
	if len(scopedUnits) > 0 {
		q = q.Where("admin_unit_id IN ?", scopedUnits)
	}

	var total int64
	q.Count(&total)

	if f.PageSize > 100 {
		f.PageSize = 100
	}
	if f.Page < 1 {
		f.Page = 1
	}

	var users []model.User
	offset := (f.Page - 1) * f.PageSize
	if err := q.Preload("Role").Preload("AdminUnit").
		Limit(f.PageSize).Offset(offset).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

type UpdateUserParams struct {
	FullName    *string
	Email       *string
	RoleID      *uuid.UUID
	AdminUnitID *uuid.UUID
}

func (s *UserService) Update(id uuid.UUID, params *UpdateUserParams) (*model.User, error) {
	updates := make(map[string]interface{})

	if params.FullName != nil {
		updates["full_name"] = *params.FullName
	}
	if params.Email != nil {
		var existing int64
		s.db.Model(&model.User{}).
			Where("email = ? AND id != ?", *params.Email, id).
			Count(&existing)
		if existing > 0 {
			return nil, ErrEmailExists
		}
		updates["email"] = *params.Email
	}
	if params.RoleID != nil {
		var role model.Role
		if err := s.db.First(&role, "id = ?", *params.RoleID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrRoleNotFound
			}
			return nil, err
		}
		updates["role_id"] = *params.RoleID
	}
	if params.AdminUnitID != nil {
		if _, err := s.adminUnit.GetByID(*params.AdminUnitID, false, false); err != nil {
			if errors.Is(err, ErrAdminUnitNotFound) {
				return nil, ErrAdminUnitRefNotFound
			}
			return nil, err
		}
		updates["admin_unit_id"] = *params.AdminUnitID
	}

	if len(updates) == 0 {
		return s.GetByID(id)
	}

	result := s.db.Model(&model.User{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrUserNotFound
	}

	return s.GetByID(id)
}

func (s *UserService) SetActive(id uuid.UUID, active bool, actorID uuid.UUID) (*model.User, error) {
	if id == actorID && !active {
		return nil, ErrCannotDeactivateSelf
	}

	result := s.db.Model(&model.User{}).Where("id = ?", id).Update("is_active", active)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrUserNotFound
	}

	if !active {
		if err := s.authSvc.RevokeAllTokens(id); err != nil {
			return nil, fmt.Errorf("user updated but failed to revoke tokens: %w", err)
		}
	}

	return s.GetByID(id)
}

func (s *UserService) ResetPassword(id uuid.UUID, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrPasswordTooShort
	}

	pwHash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	result := s.db.Model(&model.User{}).
		Where("id = ?", id).
		Update("password_hash", pwHash)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrUserNotFound
	}

	return s.authSvc.RevokeAllTokens(id)
}

func (s *UserService) ChangePassword(id uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.GetByID(id)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return ErrInvalidCredentials
	}

	if len(newPassword) < 8 {
		return ErrPasswordTooShort
	}

	pwHash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.db.Model(user).Update("password_hash", pwHash).Error
}

type RoleListFilter struct {
	NameFilter string
}

func (s *UserService) ListRoles(f *RoleListFilter) ([]model.Role, error) {
	q := s.db.Model(&model.Role{}).Preload("Permissions")
	if f.NameFilter != "" {
		q = q.Where("name ILIKE ?", "%"+f.NameFilter+"%")
	}

	var roles []model.Role
	if err := q.Order("name").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}
