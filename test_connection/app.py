from flask import Flask, jsonify, request
from flask_cors import CORS
from mysql.connector import pooling
import os
from dotenv import load_dotenv
import time

load_dotenv()  # only does anything locally; Render ignores this and uses its own env vars

app = Flask(__name__)

CORS(app, origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")])


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
            language
        FROM questions
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(rows)

@app.route("/api/answer", methods=["POST"])
def submit_answer():
    import time

    start = time.time()

    data = request.get_json()

    question_id = data["question_id"]
    user_answer = data["user_answer"]

    conn = get_connection()
    print("Connection:", time.time() - start)

    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT correct_option, explanation
        FROM questions
        WHERE id = %s
        """,
        (question_id,)
    )

    result = cursor.fetchone()
    print("SELECT:", time.time() - start)

    if result is None:
        cursor.close()
        conn.close()
        return "Not valid", 404

    is_correct = user_answer == result["correct_option"]

    cursor.execute(
        """
        INSERT INTO results (questions_id, user_answer)
        VALUES (%s, %s)
        """,
        (question_id, user_answer)
    )
    conn.commit()
    cursor.close()
    conn.close()

    print("TOTAL:", time.time() - start)

    return jsonify({
        "correct": is_correct,
        "correct_answer": result["correct_option"],
        "explanation": result["explanation"]
    })


@app.route("/api/history", methods=["GET"])
def get_history():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Overall stats
    cursor.execute("""
        SELECT
            COUNT(*) AS total_attempts,
            SUM(CASE WHEN results.user_answer = questions.correct_option THEN 1 ELSE 0 END) AS correct_attempts
        FROM results
        JOIN questions ON results.questions_id = questions.id
    """)
    overall = cursor.fetchone()

    # Per-topic breakdown
    cursor.execute("""
        SELECT
            questions.topic,
            COUNT(*) AS total_attempts,
            SUM(CASE WHEN results.user_answer = questions.correct_option THEN 1 ELSE 0 END) AS correct_attempts
        FROM results
        JOIN questions ON results.questions_id = questions.id
        GROUP BY questions.topic
        ORDER BY (correct_attempts / total_attempts) ASC
    """)
    by_topic = cursor.fetchall()

    cursor.close()
    conn.close()

    overall["correct_attempts"] = int(overall["correct_attempts"])
    for row in by_topic:
        row["correct_attempts"] = int(row["correct_attempts"])
    return jsonify({
        "overall": overall,
        "by_topic": by_topic
    })

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
