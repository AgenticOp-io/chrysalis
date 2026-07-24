package main

import "github.com/gin-gonic/gin"

// hub-flagship-go — 20-route Gin mirror of hub-flagship-express / hub-flagship-python.
// No invented product UI (D6447). Bodies use Gin idioms the hub Go→WebIR lift understands.

func registerRoutes(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, true)
	})
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, 42)
	})
	r.GET("/version", func(c *gin.Context) {
		c.JSON(200, 1)
	})
	r.GET("/ready", func(c *gin.Context) {
		c.String(200, "ok")
	})
	r.GET("/count", func(c *gin.Context) {
		c.JSON(200, 3)
	})
	r.GET("/flag", func(c *gin.Context) {
		c.String(200, "chrysalis")
	})
	r.GET("/build", func(c *gin.Context) {
		c.JSON(200, 2026)
	})
	r.GET("/tier", func(c *gin.Context) {
		c.String(200, "gold")
	})
	r.GET("/meta", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "hub-flagship-go", "version": 1})
	})
	r.POST("/echo", func(c *gin.Context) {
		c.JSON(200, gin.H{"echo": true})
	})
	r.GET("/items", func(c *gin.Context) {
		c.JSON(200, true)
	})
	r.GET("/items/:id", func(c *gin.Context) {
		id := c.Param("id")
		c.JSON(200, gin.H{"id": id})
	})
	r.POST("/items", func(c *gin.Context) {
		c.JSON(201, gin.H{"created": true})
	})
	r.GET("/search", func(c *gin.Context) {
		q := c.DefaultQuery("q", "")
		c.JSON(200, gin.H{"q": q})
	})
	r.PUT("/items/:id", func(c *gin.Context) {
		id := c.Param("id")
		c.JSON(200, gin.H{"updated": true, "id": id})
	})
	r.DELETE("/items/:id", func(c *gin.Context) {
		c.JSON(200, true)
	})
	r.PATCH("/items/:id", func(c *gin.Context) {
		id := c.Param("id")
		c.JSON(200, gin.H{"patched": true, "id": id})
	})
	r.GET("/users/:userId", func(c *gin.Context) {
		userId := c.Param("userId")
		c.JSON(200, userId)
	})
	r.GET("/stats", func(c *gin.Context) {
		c.JSON(200, 3)
	})
	r.POST("/notify", func(c *gin.Context) {
		c.JSON(202, gin.H{"ok": true})
	})
}
