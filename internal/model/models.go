package model

import (
	"time"

	"github.com/google/uuid"
)

// Role represents a user role
type Role struct {
	ID          uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string       `gorm:"uniqueIndex;not null" json:"name"`
	Description string       `json:"description"`
	CreatedAt   time.Time    `json:"created_at"`
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
}

// Permission represents a single capability
type Permission struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string    `gorm:"uniqueIndex;not null" json:"name"`
	Description string    `json:"description"`
}

// AdminUnit represents a node in the administrative hierarchy
type AdminUnit struct {
	ID        uuid.UUID   `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string      `gorm:"not null" json:"name"`
	Level     int16       `gorm:"not null" json:"level"`
	ParentID  *uuid.UUID  `gorm:"type:uuid" json:"parent_id,omitempty"`
	Code      string      `gorm:"uniqueIndex" json:"code"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	Parent    *AdminUnit  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children  []AdminUnit `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// User represents a system user
type User struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	FullName     string     `gorm:"not null" json:"full_name"`
	Email        string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"not null" json:"-"`
	RoleID       uuid.UUID  `gorm:"type:uuid;not null" json:"role_id"`
	AdminUnitID  uuid.UUID  `gorm:"type:uuid;not null" json:"admin_unit_id"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Role         Role       `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	AdminUnit    AdminUnit  `gorm:"foreignKey:AdminUnitID" json:"admin_unit,omitempty"`
}

// RefreshToken stores hashed refresh tokens
type RefreshToken struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	TokenHash string     `gorm:"uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// Campaign represents a voter registration campaign
type Campaign struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name            string     `gorm:"not null" json:"name"`
	Description     string     `json:"description"`
	StartDate       time.Time  `gorm:"type:date" json:"start_date"`
	EndDate         time.Time  `gorm:"type:date" json:"end_date"`
	Status          string     `gorm:"default:Draft" json:"status"`
	InitialNIDCount int        `json:"initial_nid_count"`
	CreatedBy       *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// CampaignPublicHoliday stores holidays to exclude from working day calculations
type CampaignPublicHoliday struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CampaignID  uuid.UUID `gorm:"type:uuid;not null" json:"campaign_id"`
	HolidayDate time.Time `gorm:"type:date" json:"holiday_date"`
	Description string    `json:"description"`
}

// Citizen represents a National ID holder
type Citizen struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	NationalID         string     `gorm:"uniqueIndex;not null" json:"national_id"`
	FullName           string     `gorm:"not null" json:"full_name"`
	Gender             string     `gorm:"not null" json:"gender"`
	PhoneNumber        string     `json:"phone_number"`
	CountyID           uuid.UUID  `gorm:"type:uuid;not null" json:"county_id"`
	DistrictID         uuid.UUID  `gorm:"type:uuid;not null" json:"district_id"`
	DivisionID         *uuid.UUID `gorm:"type:uuid" json:"division_id,omitempty"`
	LocationID         *uuid.UUID `gorm:"type:uuid" json:"location_id,omitempty"`
	SubLocationID      *uuid.UUID `gorm:"type:uuid" json:"sub_location_id,omitempty"`
	VillageID          *uuid.UUID `gorm:"type:uuid" json:"village_id,omitempty"`
	PollingStation     string     `json:"polling_station"`
	RegistrationStatus string     `gorm:"default:Unregistered" json:"registration_status"`
	RegistrationDate   *time.Time `json:"registration_date,omitempty"`
	UpdatedBy          *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	County             AdminUnit  `gorm:"foreignKey:CountyID" json:"county,omitempty"`
	District           AdminUnit  `gorm:"foreignKey:DistrictID" json:"district,omitempty"`
}

// RegistrationRecord records a registration confirmation event
type RegistrationRecord struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CitizenID    uuid.UUID `gorm:"type:uuid;not null" json:"citizen_id"`
	CampaignID   uuid.UUID `gorm:"type:uuid;not null" json:"campaign_id"`
	RegisteredBy uuid.UUID `gorm:"type:uuid;not null" json:"registered_by"`
	RegisteredAt time.Time `gorm:"default:now()" json:"registered_at"`
	Source       string    `gorm:"default:Manual" json:"source"`
}

// AuditLog records all state-changing operations
type AuditLog struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	ActorID    *uuid.UUID `gorm:"type:uuid" json:"actor_id,omitempty"`
	Action     string     `gorm:"not null" json:"action"`
	EntityType string     `gorm:"not null" json:"entity_type"`
	EntityID   *uuid.UUID `gorm:"type:uuid" json:"entity_id,omitempty"`
	Details    []byte     `gorm:"type:jsonb" json:"details,omitempty"`
	IPAddress  string     `gorm:"type:inet" json:"ip_address,omitempty"`
	UserAgent  string     `json:"user_agent,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// Notification represents an in-app alert
type Notification struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Type        string     `gorm:"not null" json:"type"`
	Title       string     `gorm:"not null" json:"title"`
	Body        string     `gorm:"not null" json:"body"`
	ScopeUnitID *uuid.UUID `gorm:"type:uuid" json:"scope_unit_id,omitempty"`
	IsRead      bool       `gorm:"default:false" json:"is_read"`
	RecipientID *uuid.UUID `gorm:"type:uuid" json:"recipient_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// ImportJob tracks bulk import operations
type ImportJob struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Filename       string     `gorm:"not null" json:"filename"`
	UploaderID     uuid.UUID  `gorm:"type:uuid;not null" json:"uploader_id"`
	CampaignID     *uuid.UUID `gorm:"type:uuid" json:"campaign_id,omitempty"`
	Status         string     `gorm:"default:Pending" json:"status"`
	TotalRows      int        `json:"total_rows"`
	InsertedRows   int        `json:"inserted_rows"`
	RejectedRows   int        `json:"rejected_rows"`
	ErrorReportURL string     `json:"error_report_url,omitempty"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// DailyTarget stores computed daily registration targets per unit
type DailyTarget struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CampaignID  uuid.UUID `gorm:"type:uuid;not null" json:"campaign_id"`
	AdminUnitID uuid.UUID `gorm:"type:uuid;not null" json:"admin_unit_id"`
	TargetDate  time.Time `gorm:"type:date" json:"target_date"`
	TargetCount int       `json:"target_count"`
	ComputedAt  time.Time `json:"computed_at"`
}

// DailyProgress tracks registrations per unit per day
type DailyProgress struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	CampaignID      uuid.UUID `gorm:"type:uuid;not null" json:"campaign_id"`
	AdminUnitID     uuid.UUID `gorm:"type:uuid;not null" json:"admin_unit_id"`
	ProgressDate    time.Time `gorm:"type:date" json:"progress_date"`
	RegisteredCount int       `json:"registered_count"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Setting stores key-value system configuration
type Setting struct {
	Key         string     `gorm:"primaryKey" json:"key"`
	Value       string     `gorm:"not null" json:"value"`
	Description string     `json:"description"`
	UpdatedBy   *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
