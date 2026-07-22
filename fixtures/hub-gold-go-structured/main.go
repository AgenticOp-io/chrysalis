package main

import "github.com/gin-gonic/gin"

func registerRoutes(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})
	r.GET("/meta", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "hub-gold-go-structured", "version": 1})
	})
}
