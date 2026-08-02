package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/model"
	"github.com/sdic/nvrcms/internal/utils"
	"gorm.io/gorm"
)

type DashboardService struct {
	db          *gorm.DB
	adminUnit   *AdminUnitService
	campaignSvc *CampaignService
}

func NewDashboardService(db *gorm.DB, adminUnit *AdminUnitService, campaignSvc *CampaignService) *DashboardService {
	return &DashboardService{db: db, adminUnit: adminUnit, campaignSvc: campaignSvc}
}

type KPISummary struct {
	NationalIDsNotRegistered int64      `json:"national_ids_not_registered"`
	RegisteredVoters         int64      `json:"registered_voters"`
	AdultPopulation          int64      `json:"adult_population"`
	InitialTarget            int        `json:"initial_target"`
	TodaysTarget             int64      `json:"todays_target"`
	TodaysProgress           int64      `json:"todays_progress"`
	OverallProgressPercent   float64    `json:"overall_progress_percent"`
	RemainingWorkingDays     int        `json:"remaining_working_days"`
	TotalWorkingDays         int        `json:"total_working_days"`
	ActiveCampaignID         *uuid.UUID `json:"active_campaign_id,omitempty"`
	ActiveCampaignName       string     `json:"active_campaign_name,omitempty"`
}

func (s *DashboardService) GetKPIs(activeCampaignID *uuid.UUID, scopedUnits []uuid.UUID) (*KPISummary, error) {
	kpi := &KPISummary{}

	campaign, err := s.resolveActiveCampaign(activeCampaignID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if campaign != nil {
		kpi.ActiveCampaignID = &campaign.ID
		kpi.ActiveCampaignName = campaign.Name
		kpi.InitialTarget = campaign.InitialNIDCount
	}

	scopeWhere, scopeArgs := s.scopeClause(scopedUnits, true)

	s.db.Model(&model.Citizen{}).
		Where(scopeWhere, scopeArgs...).
		Count(&kpi.AdultPopulation)

	s.db.Model(&model.Citizen{}).
		Where("registration_status = ?", RegStatusRegistered).
		Where(scopeWhere, scopeArgs...).
		Count(&kpi.RegisteredVoters)

	kpi.NationalIDsNotRegistered = kpi.AdultPopulation - kpi.RegisteredVoters
	if kpi.NationalIDsNotRegistered < 0 {
		kpi.NationalIDsNotRegistered = 0
	}

	if kpi.AdultPopulation > 0 {
		kpi.OverallProgressPercent = float64(kpi.RegisteredVoters) / float64(kpi.AdultPopulation) * 100
	}

	today := utils.DateOnly(time.Now())
	todayStr := utils.FormatDateOnly(today)

	if campaign != nil {
		holidays, err := s.listPublicHolidays(campaign.ID)
		if err != nil {
			return nil, err
		}
		cal := utils.NewWorkingDayCalendar(holidays)

		kpi.TotalWorkingDays = cal.CountWorkingDaysInclusive(campaign.StartDate, campaign.EndDate)
		kpi.RemainingWorkingDays = cal.RemainingWorkingDays(today, campaign.EndDate)

		if campaign.Status == CampaignStatusActive && kpi.RemainingWorkingDays > 0 && kpi.NationalIDsNotRegistered > 0 {
			kpi.TodaysTarget = kpi.NationalIDsNotRegistered / int64(kpi.RemainingWorkingDays)
			if kpi.TodaysTarget <= 0 {
				kpi.TodaysTarget = kpi.NationalIDsNotRegistered
			}
		}
	}

	q := s.db.Table("daily_progress").
		Where("progress_date::date = ?", todayStr)
	if len(scopedUnits) > 0 {
		q = q.Where("admin_unit_id IN ?", scopedUnits)
	}
	q.Select("COALESCE(SUM(registered_count), 0)").
		Scan(&kpi.TodaysProgress)

	return kpi, nil
}

type DistrictPerformanceRow struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	CountyName  string    `json:"county_name,omitempty"`
	AdultPop    int64     `json:"adult_population"`
	Registered  int64     `json:"registered"`
	Remaining   int64     `json:"remaining"`
	ProgressPct float64   `json:"progress_percent"`
}

func (s *DashboardService) DistrictPerformance(activeCampaignID *uuid.UUID, scopedUnits []uuid.UUID) ([]DistrictPerformanceRow, error) {
	scopeWhere, scopeArgs := s.scopeClause(scopedUnits, false)

	var rows []DistrictPerformanceRow
	err := s.db.Raw(`
		SELECT d.id, d.name, c.name AS county_name,
			COUNT(DISTINCT citizen.id) AS adult_population,
			COUNT(DISTINCT CASE WHEN citizen.registration_status = ? THEN citizen.id END) AS registered,
			COUNT(DISTINCT citizen.id) - COUNT(DISTINCT CASE WHEN citizen.registration_status = ? THEN citizen.id END) AS remaining
		FROM admin_units d
		JOIN admin_units c ON c.id = d.parent_id
		LEFT JOIN citizens citizen ON citizen.district_id = d.id
		WHERE d.level = 3
		`+scopeWhere+`
		GROUP BY d.id, d.name, c.name
		ORDER BY adult_population DESC
	`, append([]interface{}{RegStatusRegistered, RegStatusRegistered}, scopeArgs...)...).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for i := range rows {
		if rows[i].AdultPop > 0 {
			rows[i].ProgressPct = float64(rows[i].Registered) / float64(rows[i].AdultPop) * 100
		}
	}
	return rows, nil
}

type RegistrationTrendPoint struct {
	Date       string `json:"date"`
	Registered int64  `json:"registered"`
}

func (s *DashboardService) RegistrationTrend(activeCampaignID *uuid.UUID, days int, scopedUnits []uuid.UUID) ([]RegistrationTrendPoint, error) {
	if days <= 0 {
		days = 30
	}

	scopeWhere, scopeArgs := s.scopeClauseReg(scopedUnits)

	var rows []RegistrationTrendPoint
	err := s.db.Raw(`
		SELECT to_char(series.d, 'YYYY-MM-DD') AS date,
			COALESCE(SUM(CASE WHEN rr.id IS NOT NULL THEN 1 ELSE 0 END), 0) AS registered
		FROM generate_series(
			NOW()::date - INTERVAL '1 day' * ?,
			NOW()::date,
			'1 day'::interval
		) AS series(d)
		LEFT JOIN registration_records rr
			ON rr.registered_at::date = series.d::date
			`+scopeWhere+`
		GROUP BY series.d
		ORDER BY series.d ASC
	`, append([]interface{}{days - 1}, scopeArgs...)...).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

type PerformanceTableRow struct {
	ID          uuid.UUID `json:"id"`
	Level       int16     `json:"level"`
	Name        string    `json:"name"`
	ParentName  string    `json:"parent_name,omitempty"`
	AdultPop    int64     `json:"adult_population"`
	Registered  int64     `json:"registered"`
	Remaining   int64     `json:"remaining"`
	ProgressPct float64   `json:"progress_percent"`
}

func (s *DashboardService) PerformanceTable(level int16, activeCampaignID *uuid.UUID, scopedUnits []uuid.UUID) ([]PerformanceTableRow, error) {
	if level < 2 {
		level = 2
	}
	if level > 8 {
		level = 8
	}

	levelField := "county_id"
	switch level {
	case 2:
		levelField = "county_id"
	case 3:
		levelField = "district_id"
	case 4:
		levelField = "division_id"
	case 5:
		levelField = "location_id"
	case 6:
		levelField = "sub_location_id"
	case 7, 8:
		levelField = "village_id"
	}

	scopeWhere, scopeArgs := s.scopeClause(scopedUnits, false)

	var rows []PerformanceTableRow
	err := s.db.Raw(`
		SELECT u.id, u.level, u.name, p.name AS parent_name,
			COUNT(DISTINCT c.id) AS adult_population,
			COUNT(DISTINCT CASE WHEN c.registration_status = ? THEN c.id END) AS registered,
			COUNT(DISTINCT c.id) - COUNT(DISTINCT CASE WHEN c.registration_status = ? THEN c.id END) AS remaining
		FROM admin_units u
		LEFT JOIN admin_units p ON p.id = u.parent_id
		LEFT JOIN citizens c ON c.`+levelField+` = u.id
		WHERE u.level = ?
		`+scopeWhere+`
		GROUP BY u.id, u.level, u.name, p.name
		ORDER BY adult_population DESC
	`, append([]interface{}{RegStatusRegistered, RegStatusRegistered, level}, scopeArgs...)...).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for i := range rows {
		if rows[i].AdultPop > 0 {
			rows[i].ProgressPct = float64(rows[i].Registered) / float64(rows[i].AdultPop) * 100
		}
	}
	return rows, nil
}

func (s *DashboardService) resolveActiveCampaign(id *uuid.UUID) (*model.Campaign, error) {
	if id != nil && *id != uuid.Nil {
		return s.campaignSvc.GetByID(*id)
	}
	var c model.Campaign
	err := s.db.Where("status = ?", CampaignStatusActive).Order("created_at DESC").First(&c).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			err2 := s.db.Where("status IN ?", []string{CampaignStatusPaused, CampaignStatusDraft, CampaignStatusCompleted}).
				Order("created_at DESC").First(&c).Error
			if err2 != nil {
				return nil, nil
			}
			return &c, nil
		}
		return nil, err
	}
	return &c, nil
}

func (s *DashboardService) listPublicHolidays(campaignID uuid.UUID) ([]time.Time, error) {
	var rows []model.CampaignPublicHoliday
	if err := s.db.Where("campaign_id = ?", campaignID).Find(&rows).Error; err != nil {
		return nil, err
	}
	dates := make([]time.Time, 0, len(rows))
	for _, r := range rows {
		dates = append(dates, r.HolidayDate)
	}
	return dates, nil
}

func (s *DashboardService) scopeClause(scopedUnits []uuid.UUID, prefix bool) (string, []interface{}) {
	p := "AND"
	if prefix {
		p = ""
	}
	if len(scopedUnits) == 0 {
		return "", nil
	}
	return ` ` + p + ` (citizen.county_id IN ? OR citizen.district_id IN ? OR citizen.division_id IN ? OR
		citizen.location_id IN ? OR citizen.sub_location_id IN ? OR citizen.village_id IN ?)`,
		[]interface{}{scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits, scopedUnits}
}

func (s *DashboardService) scopeClauseProgress(scopedUnits []uuid.UUID) (string, []interface{}) {
	if len(scopedUnits) == 0 {
		return "1=1", []interface{}{}
	}
	return "admin_unit_id IN ?", []interface{}{scopedUnits}
}

func (s *DashboardService) scopeClauseReg(scopedUnits []uuid.UUID) (string, []interface{}) {
	if len(scopedUnits) == 0 {
		return "", nil
	}
	return "", nil
}
