package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"gorm.io/gorm"
)

var (
	ErrCitizenNotFound   = errors.New("citizen not found")
	ErrNationalIDExists  = errors.New("national ID already exists")
	ErrInvalidGender     = errors.New("invalid gender, must be Male or Female")
	ErrInvalidRegStatus  = errors.New("invalid registration status")
	ErrCountyRequired    = errors.New("county is required")
	ErrDistrictRequired  = errors.New("district is required")
	ErrCampaignNotActive = errors.New("campaign is not active")
	ErrAlreadyRegistered = errors.New("citizen already registered in this campaign")
)

const (
	RegStatusUnregistered = "Unregistered"
	RegStatusRegistered   = "Registered"
	RegStatusPending      = "Pending"
	RegStatusIneligible   = "Ineligible"
	GenderMale            = "Male"
	GenderFemale          = "Female"
)

var validRegStatuses = map[string]bool{
	RegStatusUnregistered: true,
	RegStatusRegistered:   true,
	RegStatusPending:      true,
	RegStatusIneligible:   true,
}

var validGenders = map[string]bool{
	GenderMale:   true,
	GenderFemale: true,
}

type CitizenService struct {
	db          *gorm.DB
	adminUnit   *AdminUnitService
	campaignSvc *CampaignService
}

func NewCitizenService(db *gorm.DB, adminUnit *AdminUnitService, campaignSvc *CampaignService) *CitizenService {
	return &CitizenService{db: db, adminUnit: adminUnit, campaignSvc: campaignSvc}
}

type CreateCitizenParams struct {
	NationalID     string
	FullName       string
	Gender         string
	PhoneNumber    string
	CountyID       uuid.UUID
	DistrictID     uuid.UUID
	DivisionID     *uuid.UUID
	LocationID     *uuid.UUID
	SubLocationID  *uuid.UUID
	VillageID      *uuid.UUID
	PollingStation string
	CreatedBy      uuid.UUID
}

func (s *CitizenService) validateAdminUnits(countyID, districtID uuid.UUID, divisionID, locationID, subLocationID, villageID *uuid.UUID) error {
	if countyID == uuid.Nil {
		return ErrCountyRequired
	}
	if districtID == uuid.Nil {
		return ErrDistrictRequired
	}

	if _, err := s.adminUnit.GetByID(countyID, false, false); err != nil {
		return ErrAdminUnitNotFound
	}
	if _, err := s.adminUnit.GetByID(districtID, false, false); err != nil {
		return ErrAdminUnitNotFound
	}

	if divisionID != nil && *divisionID != uuid.Nil {
		if _, err := s.adminUnit.GetByID(*divisionID, false, false); err != nil {
			return ErrAdminUnitNotFound
		}
	}
	if locationID != nil && *locationID != uuid.Nil {
		if _, err := s.adminUnit.GetByID(*locationID, false, false); err != nil {
			return ErrAdminUnitNotFound
		}
	}
	if subLocationID != nil && *subLocationID != uuid.Nil {
		if _, err := s.adminUnit.GetByID(*subLocationID, false, false); err != nil {
			return ErrAdminUnitNotFound
		}
	}
	if villageID != nil && *villageID != uuid.Nil {
		if _, err := s.adminUnit.GetByID(*villageID, false, false); err != nil {
			return ErrAdminUnitNotFound
		}
	}

	return nil
}

func (s *CitizenService) Create(params *CreateCitizenParams) (*model.Citizen, error) {
	if !validGenders[params.Gender] {
		return nil, ErrInvalidGender
	}

	var existing int64
	s.db.Model(&model.Citizen{}).Where("national_id = ?", params.NationalID).Count(&existing)
	if existing > 0 {
		return nil, ErrNationalIDExists
	}

	if err := s.validateAdminUnits(params.CountyID, params.DistrictID,
		params.DivisionID, params.LocationID, params.SubLocationID, params.VillageID); err != nil {
		return nil, err
	}

	citizen := &model.Citizen{
		ID:                 uuid.New(),
		NationalID:         params.NationalID,
		FullName:           params.FullName,
		Gender:             params.Gender,
		PhoneNumber:        params.PhoneNumber,
		CountyID:           params.CountyID,
		DistrictID:         params.DistrictID,
		DivisionID:         params.DivisionID,
		LocationID:         params.LocationID,
		SubLocationID:      params.SubLocationID,
		VillageID:          params.VillageID,
		PollingStation:     params.PollingStation,
		RegistrationStatus: RegStatusUnregistered,
		UpdatedBy:          &params.CreatedBy,
	}

	if err := s.db.Create(citizen).Error; err != nil {
		return nil, err
	}

	return s.GetByID(citizen.ID)
}

func (s *CitizenService) GetByID(id uuid.UUID) (*model.Citizen, error) {
	var citizen model.Citizen
	if err := s.db.Preload("County").Preload("District").
		First(&citizen, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCitizenNotFound
		}
		return nil, err
	}
	return &citizen, nil
}

func (s *CitizenService) GetByNationalID(nationalID string) (*model.Citizen, error) {
	var citizen model.Citizen
	if err := s.db.Preload("County").Preload("District").
		Where("national_id = ?", nationalID).First(&citizen).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCitizenNotFound
		}
		return nil, err
	}
	return &citizen, nil
}

type ListCitizensFilter struct {
	CountyID           *uuid.UUID
	DistrictID         *uuid.UUID
	RegistrationStatus *string
	Gender             *string
	NameFilter         string
	NationalIDFilter   string
	Page               int
	PageSize           int
}

func (s *CitizenService) List(f *ListCitizensFilter, scopedUnits []uuid.UUID) ([]model.Citizen, int64, error) {
	q := s.db.Model(&model.Citizen{})

	if f.CountyID != nil {
		q = q.Where("county_id = ?", *f.CountyID)
	}
	if f.DistrictID != nil {
		q = q.Where("district_id = ?", *f.DistrictID)
	}
	if f.RegistrationStatus != nil {
		q = q.Where("registration_status = ?", *f.RegistrationStatus)
	}
	if f.Gender != nil {
		q = q.Where("gender = ?", *f.Gender)
	}
	if f.NameFilter != "" {
		q = q.Where("full_name ILIKE ? OR national_id ILIKE ?", "%"+f.NameFilter+"%", "%"+f.NameFilter+"%")
	}
	if f.NationalIDFilter != "" {
		q = q.Where("national_id ILIKE ?", "%"+f.NationalIDFilter+"%")
	}
	if len(scopedUnits) > 0 {
		q = q.Where(`county_id IN ? OR district_id IN ? OR 
			division_id IN ? OR location_id IN ? OR 
			sub_location_id IN ? OR village_id IN ?`,
			scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits)
	}

	var total int64
	q.Count(&total)

	if f.PageSize > 100 {
		f.PageSize = 100
	}
	if f.Page < 1 {
		f.Page = 1
	}

	var citizens []model.Citizen
	offset := (f.Page - 1) * f.PageSize
	if err := q.Preload("County").Preload("District").
		Limit(f.PageSize).Offset(offset).
		Order("created_at DESC").
		Find(&citizens).Error; err != nil {
		return nil, 0, err
	}

	return citizens, total, nil
}

type UpdateCitizenParams struct {
	FullName           *string
	Gender             *string
	PhoneNumber        *string
	CountyID           *uuid.UUID
	DistrictID         *uuid.UUID
	DivisionID         *uuid.UUID
	LocationID         *uuid.UUID
	SubLocationID      *uuid.UUID
	VillageID          *uuid.UUID
	PollingStation     *string
	RegistrationStatus *string
}

func (s *CitizenService) Update(id uuid.UUID, params *UpdateCitizenParams, actorID uuid.UUID) (*model.Citizen, error) {
	citizen, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})

	if params.FullName != nil {
		updates["full_name"] = *params.FullName
	}
	if params.Gender != nil {
		if !validGenders[*params.Gender] {
			return nil, ErrInvalidGender
		}
		updates["gender"] = *params.Gender
	}
	if params.PhoneNumber != nil {
		updates["phone_number"] = *params.PhoneNumber
	}
	if params.PollingStation != nil {
		updates["polling_station"] = *params.PollingStation
	}
	if params.RegistrationStatus != nil {
		if !validRegStatuses[*params.RegistrationStatus] {
			return nil, ErrInvalidRegStatus
		}
		updates["registration_status"] = *params.RegistrationStatus
		if *params.RegistrationStatus == RegStatusRegistered {
			now := time.Now()
			updates["registration_date"] = &now
		}
	}

	countyID := citizen.CountyID
	districtID := citizen.DistrictID
	divisionID := citizen.DivisionID
	locationID := citizen.LocationID
	subLocationID := citizen.SubLocationID
	villageID := citizen.VillageID

	if params.CountyID != nil {
		countyID = *params.CountyID
		updates["county_id"] = countyID
	}
	if params.DistrictID != nil {
		districtID = *params.DistrictID
		updates["district_id"] = districtID
	}
	if params.DivisionID != nil {
		divisionID = params.DivisionID
		updates["division_id"] = divisionID
	}
	if params.LocationID != nil {
		locationID = params.LocationID
		updates["location_id"] = locationID
	}
	if params.SubLocationID != nil {
		subLocationID = params.SubLocationID
		updates["sub_location_id"] = subLocationID
	}
	if params.VillageID != nil {
		villageID = params.VillageID
		updates["village_id"] = villageID
	}

	if params.CountyID != nil || params.DistrictID != nil ||
		params.DivisionID != nil || params.LocationID != nil ||
		params.SubLocationID != nil || params.VillageID != nil {
		if err := s.validateAdminUnits(countyID, districtID, divisionID, locationID, subLocationID, villageID); err != nil {
			return nil, err
		}
	}

	if len(updates) == 0 {
		return citizen, nil
	}

	updates["updated_by"] = actorID

	result := s.db.Model(&model.Citizen{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}

	return s.GetByID(id)
}

func (s *CitizenService) Delete(id uuid.UUID) error {
	result := s.db.Delete(&model.Citizen{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrCitizenNotFound
	}
	return nil
}

func (s *CitizenService) RegisterCitizen(citizenID, campaignID, registeredBy, userAdminUnitID uuid.UUID, source string) (*model.RegistrationRecord, error) {
	campaign, err := s.campaignSvc.GetByID(campaignID)
	if err != nil {
		return nil, err
	}
	if campaign.Status != CampaignStatusActive {
		return nil, ErrCampaignNotActive
	}

	citizen, err := s.GetByID(citizenID)
	if err != nil {
		return nil, err
	}

	var existing int64
	s.db.Model(&model.RegistrationRecord{}).
		Where("citizen_id = ? AND campaign_id = ?", citizenID, campaignID).
		Count(&existing)
	if existing > 0 {
		return nil, ErrAlreadyRegistered
	}

	record := &model.RegistrationRecord{
		ID:           uuid.New(),
		CitizenID:    citizenID,
		CampaignID:   campaignID,
		RegisteredBy: registeredBy,
		Source:       source,
	}

	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	if err := tx.Create(record).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	now := time.Now()
	if err := tx.Model(&model.Citizen{}).
		Where("id = ?", citizenID).
		Updates(map[string]interface{}{
			"registration_status": RegStatusRegistered,
			"registration_date":   &now,
			"updated_by":          registeredBy,
		}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	progressUnitID := userAdminUnitID
	if progressUnitID == uuid.Nil {
		progressUnitID = citizen.CountyID
	}
	if err := s.touchDailyProgress(tx, campaignID, progressUnitID, now); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return record, nil
}

func (s *CitizenService) touchDailyProgress(tx *gorm.DB, campaignID, adminUnitID uuid.UUID, date time.Time) error {
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())

	var existing model.DailyProgress
	err := tx.Where("campaign_id = ? AND admin_unit_id = ? AND progress_date = ?",
		campaignID, adminUnitID, dateOnly).First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		progress := &model.DailyProgress{
			ID:              uuid.New(),
			CampaignID:      campaignID,
			AdminUnitID:     adminUnitID,
			ProgressDate:    dateOnly,
			RegisteredCount: 1,
		}
		return tx.Create(progress).Error
	}
	if err != nil {
		return err
	}

	return tx.Model(&existing).Update("registered_count", gorm.Expr("registered_count + 1")).Error
}

type CitizenStats struct {
	Total        int64 `json:"total"`
	Registered   int64 `json:"registered"`
	Unregistered int64 `json:"unregistered"`
	Pending      int64 `json:"pending"`
	Ineligible   int64 `json:"ineligible"`
	Male         int64 `json:"male"`
	Female       int64 `json:"female"`
}

func (s *CitizenService) GetStats(scopedUnits []uuid.UUID) (*CitizenStats, error) {
	var stats CitizenStats

	scopeQuery := func(q *gorm.DB) *gorm.DB {
		if len(scopedUnits) > 0 {
			return q.Where(`county_id IN ? OR district_id IN ? OR 
				division_id IN ? OR location_id IN ? OR 
				sub_location_id IN ? OR village_id IN ?`,
				scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits)
		}
		return q
	}

	scopeQuery(s.db.Model(&model.Citizen{})).Count(&stats.Total)
	scopeQuery(s.db.Model(&model.Citizen{}).Where("registration_status = ?", RegStatusRegistered)).Count(&stats.Registered)
	scopeQuery(s.db.Model(&model.Citizen{}).Where("registration_status = ?", RegStatusUnregistered)).Count(&stats.Unregistered)
	scopeQuery(s.db.Model(&model.Citizen{}).Where("registration_status = ?", RegStatusPending)).Count(&stats.Pending)
	scopeQuery(s.db.Model(&model.Citizen{}).Where("registration_status = ?", RegStatusIneligible)).Count(&stats.Ineligible)
	scopeQuery(s.db.Model(&model.Citizen{}).Where("gender = ?", GenderMale)).Count(&stats.Male)
	scopeQuery(s.db.Model(&model.Citizen{}).Where("gender = ?", GenderFemale)).Count(&stats.Female)

	return &stats, nil
}
