from config import db
from flask_login import UserMixin
from datetime import datetime

class User(UserMixin, db.Model):

    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(50))

    password = db.Column(db.String(50))

# ======================
# MODEL BARANG
# ======================

class Barang(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    barcode = db.Column(db.String(100), unique=True)
    nama = db.Column(db.String(100))
    harga = db.Column(db.Integer)
    stok = db.Column(db.Integer)
    expired_date = db.Column(db.Date, nullable=True)

class BatchBarang(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    barang_id = db.Column(
        db.Integer,
        db.ForeignKey('barang.id'),
        nullable=False
    )

    stok = db.Column(db.Integer, nullable=False)

    expired_date = db.Column(db.Date)

    tanggal_input = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    
# ======================
# MODEL TRANSAKSI
# ======================

class Transaksi(db.Model):
    
    id = db.Column(db.Integer, primary_key=True)
    no_transaksi = db.Column(db.String(20))
    tanggal = db.Column(db.DateTime)
    total = db.Column(db.Integer)
    bayar = db.Column(db.Integer)
    kembali = db.Column(db.Integer)
    metode = db.Column(db.String(20))

# ======================
# DETAIL TRANSAKSI
# ======================

class DetailTransaksi(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    transaksi_id = db.Column(db.Integer, db.ForeignKey("transaksi.id"))

    barcode = db.Column(db.String(50))
    nama = db.Column(db.String(100))

    harga = db.Column(db.Integer)
    qty = db.Column(db.Integer)
    subtotal = db.Column(db.Integer)