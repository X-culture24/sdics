package service

import (
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"gorm.io/gorm"
)

type AuditLogService struct {
	db *gorm.DB
}

func NewAuditLogService(db *gorm.DB) *AuditLogService {
	return &AuditLogService{db: db}
}

type ListAuditLogFilter struct {
	ActorID    *uuid.UUID
	Action     *string
	EntityType *string
	EntityID   *uuid.UUID
	Page       int
	PageSize   int
}

func (s *AuditLogService) List(f *ListAuditLogFilter, scopedUnits []uuid.UUID) ([]model.AuditLog, int64, error) {
	q := s.db.Model(&model.AuditLog{})

	if f.ActorID != nil {
		q = q.Where("actor_id = ?", *f.ActorID)
	}
	if f.Action != nil {
		q = q.Where("action = ?", *f.Action)
	}
	if f.EntityType != nil {
		q = q.Where("entity_type = ?", *f.EntityType)
	}
	if f.EntityID != nil {
		q = q.Where("entity_id = ?", *f.EntityID)
	}

	var total int64
	q.Count(&total)

	if f.PageSize > 200 {
		f.PageSize = 200
	}
	if f.Page < 1 {
		f.Page = 1
	}

	var logs []model.AuditLog
	offset := (f.Page - 1) * f.PageSize
	if err := q.Limit(f.PageSize).Offset(offset).
		Order("created_at DESC").
		Find(&logs).Error; err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func (s *AuditLogService) Log(actorID *uuid.UUID, action, entityType string, entityID *uuid.UUID, details interface{}, ip, userAgent string) error {
	var raw []byte
	if details != nil {
		b, err := json.Marshal(details)
		if err == nil {
			raw = b
		}
	}

	log := model.AuditLog{
		ID:         uuid.New(),
		ActorID:    actorID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Details:    raw,
		IPAddress:  ip,
		UserAgent:  userAgent,
	}
	result := s.db.Create(&log)
	return result.Error
}

func (s *AuditLogService) GetByID(id uuid.UUID) (*model.AuditLog, error) {
	var log model.AuditLog
	if err := s.db.First(&log, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("audit log not found")
		}
		return nil, err
	}
	return &log, nil
}
