package main

import (
	"database/sql"

	"github.com/gin-gonic/gin"
)

func registerRoutes(r *gin.Engine) {
	db, _ := sql.Open("sqlite3", ":memory:")
	r.GET("/item/:id", func(c *gin.Context) {
		id := c.Param("id")
		db.Query("SELECT id FROM items WHERE id = ?", id)
		c.JSON(200, gin.H{"ok": true})
	})
	r.GET("/users/:id", func(c *gin.Context) {
		id := c.Param("id")
		db.QueryRow("SELECT name FROM users WHERE id = ?", id)
		c.JSON(200, gin.H{"ok": true})
	})
}
