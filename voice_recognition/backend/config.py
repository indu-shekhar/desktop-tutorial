import os

class Config:
    SECRET_KEY = os.urandom(24)
    print(SECRET_KEY)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///'+ os.path.join(os.getcwd(), 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'alphabetagammadelta@epsilonzetaeta'