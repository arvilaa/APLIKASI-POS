from flask import Blueprint, render_template
from datetime import datetime, timedelta
from models import Barang

reminder_bp = Blueprint('reminder', __name__)

def get_reminder_items():
    today = datetime.today().date()
    
    # Urutan periode dari yang paling dekat
    periods = [
        ("1 minggu", today + timedelta(days=7)),
        ("2 minggu", today + timedelta(days=14)),
        ("1 bulan", today + timedelta(days=30)),
        ("2 bulan", today + timedelta(days=60)),
        ("3 bulan", today + timedelta(days=90)),
    ]
    
    reminder_list = []

    # Ambil semua barang
    barang_all = Barang.query.filter(Barang.expired_date >= today).all()

    for b in barang_all:
        # Cari periode terdekat yang sesuai
        for label, target_date in periods:
            if b.expired_date <= target_date:
                reminder_list.append({
                    "nama": b.nama,
                    "expired_date": b.expired_date,
                    "periode": label
                })
                break  # <--- berhenti setelah periode terdekat ditemukan

    # Urutkan berdasarkan tanggal expired
    reminder_list.sort(key=lambda x: x['expired_date'])

    return reminder_list

# Route untuk halaman reminder
@reminder_bp.route("/reminder")
def reminder_page():
    reminder_items = get_reminder_items()
    return render_template("reminder/reminder_list.html", reminder_items=reminder_items)