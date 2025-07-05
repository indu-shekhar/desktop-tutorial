
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

from app import create_app, db

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        try:
            db.create_all()
            print("Database created successfully!")
        except Exception as e:
            print(f"An error occurred: {str(e)}")
    app.run(debug=True)
