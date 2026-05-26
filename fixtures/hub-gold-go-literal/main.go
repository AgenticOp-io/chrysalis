package main

import "github.com/gin-gonic/gin"

func registerRoutes(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.String(200, "ok")
	})
	r.GET("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})
}
