# import os
# import mysql.connector
#
# conn = mysql.connector.connect(
#     host=os.getenv("DB_HOST"),
#     port=int(os.getenv("DB_PORT")),
#     user=os.getenv("DB_USER"),
#     password=os.getenv("DB_PASSWORD"),
#     database=os.getenv("DB_NAME"),
#     ssl_disabled=False
# )
#
# cursor = conn.cursor(dictionary=True)
#
# cursor.execute("SELECT * FROM questions")
#
# rows = cursor.fetchall()
#
# for row in rows:
#     print(row)
#
# cursor.close()
# conn.close()



from flask import Flask

app = Flask(__name__)

@app.route("/square/<int:number>")
def square(number):
    return str(number * number)

if __name__ == "__main__":
    app.run(debug=True)