from flask import Flask, jsonify, request
from flask_cors import CORS
from mysql.connector import pooling
import os
from dotenv import load_dotenv
import jwt
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()  # only does anything locally; Render ignores this and uses its own env vars

app = Flask(__name__)

CORS(app, origins=[os.environ.get("FRONTEND_URL", "https://quiz-website-ten-silk.vercel.app/")])

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

db_pool = pooling.MySQLConnectionPool(
    pool_name="quiz_pool",
    pool_size=5,
    pool_reset_session=False,
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT")),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    ssl_disabled=False
)

def get_connection():
    return db_pool.get_connection()


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        request.user_id = payload["user_id"]
        request.username = payload["username"]
        return f(*args, **kwargs)
    return wrapper


def make_token(user_id, username):
    return jwt.encode(
        {
            "user_id": user_id,
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)
        },
        SECRET_KEY,
        algorithm="HS256"
    )


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"error": "That username is already taken"}), 409

    password_hash = generate_password_hash(password)
    cursor.execute(
        "INSERT INTO users (username, password_hash) VALUES (%s, %s)",
        (username, password_hash)
    )
    conn.commit()
    user_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({"token": make_token(user_id, username), "username": username})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, password_hash FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    return jsonify({"token": make_token(user["id"], username), "username": username})


@app.route("/api/test-db")
def test_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return {"database": "connected", "result": result[0]}


@app.route("/api/questions", methods=["GET"])
def get_questions():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            id, topic, question_text, option_a, option_b, option_c, option_d,
            correct_option, explanation, question_type,
            expected_output, solution_code, language
        FROM questions
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)


@app.route("/api/answer", methods=["POST"])
@require_auth
def submit_answer():
    data = request.get_json()
    question_id = data["question_id"]
    user_answer = data["user_answer"]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT correct_option, explanation FROM questions WHERE id = %s",
        (question_id,)
    )
    result = cursor.fetchone()

    if result is None:
        cursor.close()
        conn.close()
        return "Not valid", 404

    is_correct = user_answer == result["correct_option"]

    cursor.execute(
        "INSERT INTO results (questions_id, user_answer, user_id) VALUES (%s, %s, %s)",
        (question_id, user_answer, request.user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "correct": is_correct,
        "correct_answer": result["correct_option"],
        "explanation": result["explanation"]
    })


@app.route("/api/history", methods=["GET"])
@require_auth
def get_history():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            COUNT(*) AS total_attempts,
            SUM(CASE WHEN results.user_answer = questions.correct_option THEN 1 ELSE 0 END) AS correct_attempts
        FROM results
        JOIN questions ON results.questions_id = questions.id
        WHERE results.user_id = %s
    """, (request.user_id,))
    overall = cursor.fetchone()

    cursor.execute("""
        SELECT
            questions.topic,
            COUNT(*) AS total_attempts,
            SUM(CASE WHEN results.user_answer = questions.correct_option THEN 1 ELSE 0 END) AS correct_attempts
        FROM results
        JOIN questions ON results.questions_id = questions.id
        WHERE results.user_id = %s
        GROUP BY questions.topic
        ORDER BY (correct_attempts / total_attempts) ASC
    """, (request.user_id,))
    by_topic = cursor.fetchall()

    cursor.close()
    conn.close()

    overall["total_attempts"] = overall["total_attempts"] or 0
    overall["correct_attempts"] = int(overall["correct_attempts"] or 0)
    for row in by_topic:
        row["correct_attempts"] = int(row["correct_attempts"])

    return jsonify({"overall": overall, "by_topic": by_topic})


@app.route("/api/study", methods=["GET"])
def get_study_content():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, topic, title, content, ordering_number
        FROM study_content
        ORDER BY topic, ordering_number
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)


if __name__ == "__main__":
    app.run(debug=True)