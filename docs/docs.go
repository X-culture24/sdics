package docs

import (
	"time"
)

// SwaggerInfo holds exported Swagger Info so clients can modify it
var SwaggerInfo = &swagSpec{
	Host:        "localhost:8080",
	BasePath:    "/api/v1",
	Version:     "0.1.0",
	Title:       "NVRCMS API",
	Description: "National Voter Registration Campaign Management System",
}

type swagSpec struct {
	Host        string
	BasePath    string
	Version     string
	Title       string
	Description string
}

func ReadDoc() string {
	return `{"swagger":"2.0","info":{"title":"NVRCMS API","version":"0.1.0","description":"National Voter Registration Campaign Management System"},"host":"localhost:8080","basePath":"/api/v1","paths":{}}`
}

var Spec struct {
	Schemes       []string
	Swagger       string
	Infos         map[string]map[string]interface{}
	GeneratedTime time.Time
}

func init() {
	Spec.Schemes = []string{"http", "https"}
	Spec.Swagger = "2.0"
	Spec.Infos = map[string]map[string]interface{}{
		"2.0": {
			"title":   "NVRCMS API",
			"version": "0.1.0",
			"info": map[string]interface{}{
				"description": "National Voter Registration Campaign Management System",
			},
		},
	}
	Spec.GeneratedTime = time.Now()
}
