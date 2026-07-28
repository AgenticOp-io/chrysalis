package main

import "github.com/gin-gonic/gin"

// hub-gold-gin-group — Gin Group prefix peel (G10066 / D6528).
// Literal r.Group("/prefix") + nested g.GET path join only.
// No Group middleware / Use invent (D6447).

func registerRoutes(r *gin.Engine) {
	r.GET("/health", health)
	r.GET("/ping", ping)

	meta := r.Group("/meta")
	{
		meta.GET("/version", version)
		meta.GET("/ready", ready)
		meta.GET("/count", count)
		meta.GET("/flag", flagHandler)
		meta.GET("/build", build)
		meta.GET("/tier", tier)
		meta.GET("", metaHandler)
	}

	api := r.Group("/api")
	{
		api.POST("/echo", echo)
		api.GET("/search", search)
		api.GET("/stats", stats)
		api.POST("/notify", notify)
		api.GET("/users/:userId", getUser)

		items := api.Group("/items")
		{
			items.GET("", listItems)
			items.GET("/:id", getItem)
			items.POST("", createItem)
			items.PUT("/:id", updateItem)
			items.DELETE("/:id", deleteItem)
			items.PATCH("/:id", patchItem)
		}
	}
}

func health(c *gin.Context) {
	c.JSON(200, true)
}

func ping(c *gin.Context) {
	c.JSON(200, 42)
}

func version(c *gin.Context) {
	c.JSON(200, 1)
}

func ready(c *gin.Context) {
	c.String(200, "ok")
}

func count(c *gin.Context) {
	c.JSON(200, 3)
}

func flagHandler(c *gin.Context) {
	c.String(200, "chrysalis")
}

func build(c *gin.Context) {
	c.JSON(200, 2026)
}

func tier(c *gin.Context) {
	c.String(200, "gold")
}

func metaHandler(c *gin.Context) {
	c.JSON(200, gin.H{"service": "hub-gold-gin-group", "version": 1})
}

func echo(c *gin.Context) {
	c.JSON(200, gin.H{"echo": true})
}

func listItems(c *gin.Context) {
	c.JSON(200, true)
}

func getItem(c *gin.Context) {
	id := c.Param("id")
	c.JSON(200, gin.H{"id": id})
}

func createItem(c *gin.Context) {
	c.JSON(201, gin.H{"created": true})
}

func search(c *gin.Context) {
	q := c.DefaultQuery("q", "")
	c.JSON(200, gin.H{"q": q})
}

func updateItem(c *gin.Context) {
	id := c.Param("id")
	c.JSON(200, gin.H{"updated": true, "id": id})
}

func deleteItem(c *gin.Context) {
	c.JSON(200, true)
}

func patchItem(c *gin.Context) {
	id := c.Param("id")
	c.JSON(200, gin.H{"patched": true, "id": id})
}

func getUser(c *gin.Context) {
	userId := c.Param("userId")
	c.JSON(200, userId)
}

func stats(c *gin.Context) {
	c.JSON(200, 3)
}

func notify(c *gin.Context) {
	c.JSON(202, gin.H{"ok": true})
}
