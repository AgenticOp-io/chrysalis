package main

import "github.com/gin-gonic/gin"

func registerRoutes(r *gin.Engine) {
	r.GET("/ready", func(c *gin.Context) {
		c.JSON(200, gin.H{"ready": true})
	})
	r.POST("/echo", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})
}
