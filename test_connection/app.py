from flask import Flask, jsonify, request
from flask_cors import CORS
from mysql.connector import pooling
import os
import requests
from dotenv import load_dotenv
import jwt
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()  # only does anything locally; Render ignores this and uses its own env vars

app = Flask(__name__)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://quiz-website-ten-silk.vercel.app"
)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [FRONTEND_URL],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    }
)

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
    # -----------------------------------------
    # 1. Get YOUR questions from MySQL
    # -----------------------------------------
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            id,
            topic,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            explanation,
            question_type,
            expected_output,
            solution_code,
            language,
            starter_code
        FROM questions
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    # -----------------------------------------
    # 2. Get extra multiple-choice questions
    #    from QuizAPI
    # -----------------------------------------

    api_key = os.getenv("QUIZ_API_KEY")

    if not api_key:
        # If the API key isn't configured,
        # just return your normal MySQL questions.
        return jsonify(rows)

    try:
        response = requests.get(
            "https://quizapi.io/api/v1/questions",
            params={
                "category": "Programming",
                "type": "MULTIPLE_CHOICE",
                "limit": 20,
                "random": "true"
            },
            headers={
                "Authorization": f"Bearer {api_key}"
            },
            timeout=10
        )

        if response.ok:
            api_data = response.json().get("data", [])

            for q in api_data:
                answers = q.get("answers", [])

                # Make sure there are enough answers
                if len(answers) < 4:
                    continue

                correct_option = None

                for index, answer in enumerate(answers[:4]):
                    if answer.get("isCorrect"):
                        correct_option = chr(65 + index)
                        break

                if correct_option is None:
                    continue

                api_question = {
                    # Prefix API IDs so they cannot collide
                    # with your MySQL IDs.
                    "id": f"api_{q.get('id')}",

                    "topic": q.get("category") or "Programming",

                    "question_text": q.get("text", ""),

                    "option_a": answers[0].get("text", ""),
                    "option_b": answers[1].get("text", ""),
                    "option_c": answers[2].get("text", ""),
                    "option_d": answers[3].get("text", ""),

                    "correct_option": correct_option,

                    "explanation": q.get("explanation") or "",

                    "question_type": "multiple_choice",

                    # API questions don't have these
                    "expected_output": None,
                    "solution_code": None,
                    "language": None,
                    "starter_code": None
                }

                rows.append(api_question)

        else:
            print(
                "QuizAPI request failed:",
                response.status_code,
                response.text
            )

    except requests.RequestException as error:
        print("QuizAPI request error:", error)

    # -----------------------------------------
    # 3. Return MySQL + API questions together
    # -----------------------------------------

    return jsonify(rows)

@app.route("/api/answer", methods=["POST"])
@require_auth
def submit_answer():
    data = request.get_json()

    question_id = data.get("question_id")
    user_answer = data.get("user_answer")

    if question_id is None or user_answer is None:
        return jsonify({"error": "question_id and user_answer are required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            correct_option,
            explanation,
            question_type,
            expected_output,
            solution_code
        FROM questions
        WHERE id = %s
    """, (question_id,))

    result = cursor.fetchone()

    if result is None:
        cursor.close()
        conn.close()
        return jsonify({"error": "Question not found"}), 404

    question_type = result["question_type"]

    # ---------------------------------------
    # MULTIPLE CHOICE
    # ---------------------------------------
    if question_type == "multiple_choice":
        is_correct = user_answer == result["correct_option"]

        cursor.execute("""
            INSERT INTO results
                (questions_id, user_answer, user_id)
            VALUES (%s, %s, %s)
        """, (question_id, user_answer, request.user_id))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "correct": is_correct,
            "correct_answer": result["correct_option"],
            "explanation": result["explanation"]
        })

    # ---------------------------------------
    # CODING / DEBUGGING
    # ---------------------------------------
    elif question_type in ("coding", "debugging"):

        # The frontend sends the user's code/output.
        # For now, return the expected information so
        # the frontend can handle code execution.
        cursor.close()
        conn.close()

        return jsonify({
            "correct": False,
            "correct_answer": result["correct_option"],
            "explanation": result["explanation"],
            "question_type": question_type,
            "expected_output": result["expected_output"],
            "solution_code": result["solution_code"]
        })

    # ---------------------------------------
    # UNKNOWN QUESTION TYPE
    # ---------------------------------------
    cursor.close()
    conn.close()

    return jsonify({
        "error": f"Unknown question type: {question_type}"
    }), 400

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


@app.route("/api/projects", methods=["GET"])
def get_projects():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, title, description, topic, difficulty FROM projects")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)


@app.route("/api/projects/<int:project_id>/steps", methods=["GET"])
def get_project_steps(project_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, step_number, instructions, starter_code,
               solution_code, expected_output, language, checks, hint
        FROM project_steps
        WHERE project_id = %s
        ORDER BY step_number
    """, (project_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)




@app.route("/api/project-progress/<int:project_id>", methods=["GET"])
@require_auth
def get_project_progress(project_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT step_number FROM project_progress
        WHERE user_id = %s AND project_id = %s
    """, (request.user_id, project_id))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([r["step_number"] for r in rows])


@app.route("/api/project-progress", methods=["POST"])
@require_auth
def save_project_progress():
    data = request.get_json()
    project_id = data["project_id"]
    step_number = data["step_number"]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Enforce sequential unlocking server-side: you can only complete step N
    # if you've already completed step N-1 (or you're completing step 1).
    if step_number > 1:
        cursor.execute("""
            SELECT 1 FROM project_progress
            WHERE user_id = %s AND project_id = %s AND step_number = %s
        """, (request.user_id, project_id, step_number - 1))
        if cursor.fetchone() is None:
            cursor.close()
            conn.close()
            return jsonify({"error": "Previous step not completed yet"}), 400

    cursor.execute("""
        INSERT INTO project_progress (user_id, project_id, step_number)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE completed_at = CURRENT_TIMESTAMP
    """, (request.user_id, project_id, step_number))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"status": "saved"})

@app.route("/api/project-hint-used", methods=["POST"])
@require_auth
def mark_hint_used():
    data = request.get_json()
    project_id = data["project_id"]
    step_number = data["step_number"]
    hint_type = data.get("type", "hint")  # "hint" or "solution"

    column = "solution_used" if hint_type == "solution" else "hint_used"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"""
        INSERT INTO project_step_hints (user_id, project_id, step_number, {column})
        VALUES (%s, %s, %s, TRUE)
        ON DUPLICATE KEY UPDATE {column} = TRUE
    """, (request.user_id, project_id, step_number))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "recorded"})

if __name__ == "__main__":
    app.run(debug=True)