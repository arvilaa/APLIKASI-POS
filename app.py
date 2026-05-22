from flask import Flask
from models import db

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.transaksi import transaksi_bp
from routes.barang import barang_bp
from routes.laporan import laporan_bp

app = Flask(__name__)

# konfigurasi database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# hubungkan SQLAlchemy ke Flask
db.init_app(app)

# register blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(transaksi_bp)
app.register_blueprint(barang_bp)
app.register_blueprint(laporan_bp)

# buat tabel database
with app.app_context():
    db.create_all()

app.secret_key = "secret123"

if __name__ == "__main__":
    app.run(debug=True)