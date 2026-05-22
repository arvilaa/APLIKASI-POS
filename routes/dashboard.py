from flask import Blueprint, render_template
from models import db, Transaksi
from sqlalchemy import func
from datetime import datetime, timedelta
from routes.reminder import get_reminder_items  
from auth_middleware import login_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route("/dashboard")
@login_required
def dashboard():

    # TOTAL TRANSAKSI
    total_transaksi = Transaksi.query.count()

    # TOTAL PENDAPATAN
    total_pendapatan = db.session.query(func.sum(Transaksi.total)).scalar() or 0

    # 7 HARI TERAKHIR
    today = datetime.now()
    labels = []
    values = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)

        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)

        total = db.session.query(func.sum(Transaksi.total))\
            .filter(Transaksi.tanggal >= start, Transaksi.tanggal < end)\
            .scalar() or 0

        labels.append(day.strftime("%a"))  # Sen, Sel, dll
        values.append(total)

    # REMINDER
    reminder_items = get_reminder_items()

    return render_template(
        "dashboard/dashboard.html",
        total_transaksi=total_transaksi,
        total_pendapatan=total_pendapatan,
        chart_labels=labels,
        chart_values=values,
        reminder_items=reminder_items
    )