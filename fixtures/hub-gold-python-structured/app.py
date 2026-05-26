from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/meta")
def meta():
    return {"service": "hub-gold-python-structured", "version": 1}
