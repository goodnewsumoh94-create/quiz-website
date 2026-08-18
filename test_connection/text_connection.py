import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",          # your MySQL username
    password="Goodnews123@",  # your MySQL password
    database="quiz_website"
)

cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM questions")
rows = cursor.fetchall()

for row in rows:
    print(row)

cursor.close()
conn.close()