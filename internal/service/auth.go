package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sdic/nvrcms/internal/config"
	"github.com/sdic/nvrcms/internal/model"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountDisabled    = errors.New("account is disabled")
	ErrTokenExpired       = errors.New("token has expired")
	ErrTokenInvalid       = errors.New("token is invalid")
	ErrTokenRevoked       = errors.New("token has been revoked")
)

// JWTClaims are embedded in each access token
type JWTClaims struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	RoleName    string `json:"role_name"`
	AdminUnitID string `json:"admin_unit_id"`
	jwt.RegisteredClaims
}

// LoginResponse is returned on successful authentication
type LoginResponse struct {
	AccessToken  string     `json:"access_token"`
	RefreshToken string     `json:"refresh_token"`
	ExpiresAt    time.Time  `json:"expires_at"`
	User         model.User `json:"user"`
}

// AuthService handles authentication operations
type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

// Login validates credentials and issues JWT + refresh token
func (s *AuthService) Login(email, password, ipAddress, userAgent string) (*LoginResponse, error) {
	var user model.User
	if err := s.db.Preload("Role").Preload("AdminUnit").
		Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrAccountDisabled
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Issue access token
	expiresAt := time.Now().Add(time.Duration(s.cfg.JWTExpiryMinutes) * time.Minute)
	accessToken, err := s.generateAccessToken(user, expiresAt)
	if err != nil {
		return nil, err
	}

	// Issue refresh token
	rawRefresh, err := generateSecureToken()
	if err != nil {
		return nil, err
	}
	refreshHash := hashToken(rawRefresh)
	refreshExpiry := time.Now().Add(time.Duration(s.cfg.RefreshExpiryDays) * 24 * time.Hour)

	rt := model.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: refreshHash,
		ExpiresAt: refreshExpiry,
	}
	if err := s.db.Create(&rt).Error; err != nil {
		return nil, err
	}

	// Update last login
	s.db.Model(&user).Update("last_login_at", time.Now())

	// Audit log
	s.writeAudit(&user.ID, "LOGIN", "user", &user.ID, nil, ipAddress, userAgent)

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresAt:    expiresAt,
		User:         user,
	}, nil
}

// RefreshToken exchanges a valid refresh token for a new access token
func (s *AuthService) RefreshToken(rawRefreshToken string) (*LoginResponse, error) {
	hash := hashToken(rawRefreshToken)

	var rt model.RefreshToken
	if err := s.db.Where("token_hash = ?", hash).First(&rt).Error; err != nil {
		return nil, ErrTokenInvalid
	}

	if rt.RevokedAt != nil {
		return nil, ErrTokenRevoked
	}

	if time.Now().After(rt.ExpiresAt) {
		return nil, ErrTokenExpired
	}

	var user model.User
	if err := s.db.Preload("Role").Preload("AdminUnit").
		First(&user, "id = ?", rt.UserID).Error; err != nil {
		return nil, ErrTokenInvalid
	}

	if !user.IsActive {
		return nil, ErrAccountDisabled
	}

	expiresAt := time.Now().Add(time.Duration(s.cfg.JWTExpiryMinutes) * time.Minute)
	accessToken, err := s.generateAccessToken(user, expiresAt)
	if err != nil {
		return nil, err
	}

	// Rotate refresh token
	now := time.Now()
	s.db.Model(&rt).Update("revoked_at", now)

	rawNew, err := generateSecureToken()
	if err != nil {
		return nil, err
	}
	newRT := model.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: hashToken(rawNew),
		ExpiresAt: time.Now().Add(time.Duration(s.cfg.RefreshExpiryDays) * 24 * time.Hour),
	}
	if err := s.db.Create(&newRT).Error; err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: rawNew,
		ExpiresAt:    expiresAt,
		User:         user,
	}, nil
}

// Logout revokes all refresh tokens for the user
func (s *AuthService) Logout(userID uuid.UUID, ipAddress, userAgent string) error {
	now := time.Now()
	s.db.Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now)
	s.writeAudit(&userID, "LOGOUT", "user", &userID, nil, ipAddress, userAgent)
	return nil
}

// RevokeAllTokens revokes every token for a user (used on deactivation)
func (s *AuthService) RevokeAllTokens(userID uuid.UUID) error {
	now := time.Now()
	return s.db.Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now).Error
}

// ValidateAccessToken parses and validates a JWT, returning its claims
func (s *AuthService) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, ErrTokenInvalid
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}

	return claims, nil
}

// HashPassword hashes a plaintext password with bcrypt cost 12
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// ── Private helpers ───────────────────────────────────────────────────────────

func (s *AuthService) generateAccessToken(user model.User, expiresAt time.Time) (string, error) {
	claims := JWTClaims{
		UserID:      user.ID.String(),
		Email:       user.Email,
		RoleName:    user.Role.Name,
		AdminUnitID: user.AdminUnitID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) writeAudit(actorID *uuid.UUID, action, entityType string, entityID *uuid.UUID, details []byte, ip, ua string) {
	log := model.AuditLog{
		ID:         uuid.New(),
		ActorID:    actorID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Details:    details,
		IPAddress:  ip,
		UserAgent:  ua,
	}
	s.db.Create(&log)
}

func generateSecureToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}
