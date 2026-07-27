package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"gorm.io/gorm"
)

var (
	ErrCampaignNotFound       = errors.New("campaign not found")
	ErrInvalidStatus          = errors.New("invalid campaign status")
	ErrInvalidDateRange       = errors.New("end date must be after start date")
	ErrInvalidStatusTransition = errors.New("invalid campaign status transition")
)

const (
	CampaignStatusDraft     = "Draft"
	CampaignStatusActive    = "Active"
	CampaignStatusPaused    = "Paused"
	CampaignStatusCompleted = "Completed"
	CampaignStatusArchived  = "Archived"
)

var validTransitions = map[string][]string{
	CampaignStatusDraft:     {CampaignStatusActive, CampaignStatusArchived},
	CampaignStatusActive:    {CampaignStatusPaused, CampaignStatusCompleted, CampaignStatusArchived},
	CampaignStatusPaused:    {CampaignStatusActive, CampaignStatusCompleted, CampaignStatusArchived},
	CampaignStatusCompleted: {CampaignStatusArchived},
	CampaignStatusArchived:  {},
}

var validStatuses = map[string]bool{
	CampaignStatusDraft:     true,
	CampaignStatusActive:    true,
	CampaignStatusPaused:    true,
	CampaignStatusCompleted: true,
	CampaignStatusArchived:  true,
}

type CampaignService struct {
	db *gorm.DB
}

func NewCampaignService(db *gorm.DB) *CampaignService {
	return &CampaignService{db: db}
}

type CreateCampaignParams struct {
	Name            string
	Description     string
	StartDate       time.Time
	EndDate         time.Time
	InitialNIDCount int
	CreatedBy       uuid.UUID
}

func (s *CampaignService) Create(params *CreateCampaignParams) (*model.Campaign, error) {
	if !params.EndDate.After(params.StartDate) {
		return nil, ErrInvalidDateRange
	}

	campaign := &model.Campaign{
		ID:              uuid.New(),
		Name:            params.Name,
		Description:     params.Description,
		StartDate:       params.StartDate,
		EndDate:         params.EndDate,
		Status:          CampaignStatusDraft,
		InitialNIDCount: params.InitialNIDCount,
		CreatedBy:       &params.CreatedBy,
	}

	if err := s.db.Create(campaign).Error; err != nil {
		return nil, err
	}

	return s.GetByID(campaign.ID)
}

func (s *CampaignService) GetByID(id uuid.UUID) (*model.Campaign, error) {
	var campaign model.Campaign
	if err := s.db.First(&campaign, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCampaignNotFound
		}
		return nil, err
	}
	return &campaign, nil
}

type ListCampaignsFilter struct {
	Status     *string
	NameFilter string
	Page       int
	PageSize   int
}

func (s *CampaignService) List(f *ListCampaignsFilter) ([]model.Campaign, int64, error) {
	q := s.db.Model(&model.Campaign{})

	if f.Status != nil {
		q = q.Where("status = ?", *f.Status)
	}
	if f.NameFilter != "" {
		q = q.Where("name ILIKE ?", "%"+f.NameFilter+"%")
	}

	var total int64
	q.Count(&total)

	if f.PageSize > 100 {
		f.PageSize = 100
	}
	if f.Page < 1 {
		f.Page = 1
	}

	var campaigns []model.Campaign
	offset := (f.Page - 1) * f.PageSize
	if err := q.Limit(f.PageSize).Offset(offset).
		Order("created_at DESC").
		Find(&campaigns).Error; err != nil {
		return nil, 0, err
	}

	return campaigns, total, nil
}

type UpdateCampaignParams struct {
	Name            *string
	Description     *string
	StartDate       *time.Time
	EndDate         *time.Time
	InitialNIDCount *int
}

func (s *CampaignService) Update(id uuid.UUID, params *UpdateCampaignParams) (*model.Campaign, error) {
	campaign, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})

	if params.Name != nil {
		updates["name"] = *params.Name
	}
	if params.Description != nil {
		updates["description"] = *params.Description
	}
	if params.InitialNIDCount != nil {
		updates["initial_nid_count"] = *params.InitialNIDCount
	}

	startDate := campaign.StartDate
	endDate := campaign.EndDate

	if params.StartDate != nil {
		startDate = *params.StartDate
		updates["start_date"] = startDate
	}
	if params.EndDate != nil {
		endDate = *params.EndDate
		updates["end_date"] = endDate
	}

	if params.StartDate != nil || params.EndDate != nil {
		if !endDate.After(startDate) {
			return nil, ErrInvalidDateRange
		}
	}

	if len(updates) == 0 {
		return campaign, nil
	}

	result := s.db.Model(&model.Campaign{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}

	return s.GetByID(id)
}

func (s *CampaignService) ChangeStatus(id uuid.UUID, newStatus string) (*model.Campaign, error) {
	if !validStatuses[newStatus] {
		return nil, ErrInvalidStatus
	}

	campaign, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	allowed, exists := validTransitions[campaign.Status]
	if !exists {
		return nil, ErrInvalidStatusTransition
	}

	valid := false
	for _, s := range allowed {
		if s == newStatus {
			valid = true
			break
		}
	}
	if !valid {
		return nil, ErrInvalidStatusTransition
	}

	result := s.db.Model(campaign).Update("status", newStatus)
	if result.Error != nil {
		return nil, result.Error
	}

	return s.GetByID(id)
}

func (s *CampaignService) Delete(id uuid.UUID) error {
	var regCount int64
	s.db.Model(&model.RegistrationRecord{}).Where("campaign_id = ?", id).Count(&regCount)
	if regCount > 0 {
		return errors.New("cannot delete campaign with registration records; archive it instead")
	}

	result := s.db.Delete(&model.Campaign{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrCampaignNotFound
	}
	return nil
}

type CampaignStats struct {
	TotalRegistered    int64 `json:"total_registered"`
	InitialTarget      int   `json:"initial_target"`
	CompletionPercent  float64 `json:"completion_percent"`
}

func (s *CampaignService) GetStats(id uuid.UUID) (*CampaignStats, error) {
	campaign, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	var registered int64
	s.db.Model(&model.RegistrationRecord{}).
		Where("campaign_id = ?", id).Count(&registered)

	percent := 0.0
	if campaign.InitialNIDCount > 0 {
		percent = float64(registered) / float64(campaign.InitialNIDCount) * 100
	}

	return &CampaignStats{
		TotalRegistered:   registered,
		InitialTarget:     campaign.InitialNIDCount,
		CompletionPercent: percent,
	}, nil
}
