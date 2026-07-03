package main

import "github.com/gin-gonic/gin"

func registerRoutes(r *gin.Engine) {
	r.GET("/user/:id", func(c *gin.Context) {
		id := c.Param("id")
		q := c.DefaultQuery("q", "")
		hdr := c.GetHeader("X-Test")
		sid, _ := c.Cookie("sid")
		c.JSON(200, gin.H{"id": id, "q": q, "hdr": hdr, "cookie": sid})
	})
}
