"""Python request-field semantic lowering (G8724)."""
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.get("/user/<id>")
def user(id):
    return jsonify(
        {
            "id": id,
            "q": request.args.get("q", ""),
            "body_key": request.json.get("key", ""),
            "hdr": request.headers.get("X-Test"),
            "cookie": request.cookies.get("sid"),
        }
    )
