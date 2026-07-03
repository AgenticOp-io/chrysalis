"""Python SQL/DB effect lowering (G8725): db.execute with literal SQL."""
import sqlite3
from flask import Flask, jsonify

app = Flask(__name__)
db = sqlite3.connect(":memory:")


@app.get("/item/<id>")
def item(id):
    db.execute("SELECT id FROM items WHERE id = ?", (id,))
    return jsonify({"ok": True})


@app.get("/users/<id>")
def users(id):
    cur = db.cursor()
    cur.execute("SELECT name FROM users WHERE id = ?", (id,))
    return jsonify({"ok": True})
