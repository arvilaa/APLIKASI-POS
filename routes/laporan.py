from flask import Blueprint, render_template, request
from models import db, Transaksi
from datetime import datetime, timedelta

from routes import transaksi
from models import DetailTransaksi
from flask import Response
import csv
from io import StringIO
from auth_middleware import login_required
from collections import defaultdict
from datetime import datetime

laporan_bp = Blueprint('laporan', __name__)

@laporan_bp.route("/laporan", methods=["GET"])
@login_required
def laporan():
    start = request.args.get("start")
    end = request.args.get("end")

    query = Transaksi.query
    metode = request.args.get("metode")

    metode = request.args.get("metode")

    if metode:

        metode = metode.lower()

    if metode == "tunai":
        query = query.filter(
            db.func.lower(Transaksi.metode).in_(["tunai"])
        )

    elif metode == "qris":
        query = query.filter(
            db.func.lower(Transaksi.metode).in_(["qris"])
        )
    # FILTER TANGGAL
    if start and end:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d") + timedelta(days=1)

        query = query.filter(
            Transaksi.tanggal >= start_dt,
            Transaksi.tanggal < end_dt
        )

    transaksi = query.order_by(Transaksi.tanggal.desc()).all()

    # TOTAL
    total_pendapatan = sum(t.total for t in transaksi) if transaksi else 0
    rata_rata = total_pendapatan // len(transaksi) if transaksi else 0
    total_transaksi = len(transaksi)
    print("TOTAL TRANSAKSI:", total_transaksi)
    
    total_tunai = 0
    total_qris = 0

    transaksi_list = []

    for t in transaksi:
        detail = DetailTransaksi.query.filter_by(transaksi_id=t.id).all()
        nama_produk = ", ".join([d.nama for d in detail])

        transaksi_list.append({
        "tanggal": t.tanggal,
        "no_transaksi": t.no_transaksi,
        "metode": t.metode,
        "total": t.total,
        "kasir": "Admin",
        "produk": nama_produk.lower()
    })
        
    # ======================
    # PRODUK TERLARIS
    # ======================
    produk_data = {}

    for d in DetailTransaksi.query.all():
        nama = d.nama
        produk_data[nama] = produk_data.get(nama, 0) + d.qty

    # ambil top 5
    produk_sorted = sorted(produk_data.items(), key=lambda x: x[1], reverse=True)[:5]

    produk_labels = [p[0] for p in produk_sorted]
    produk_values = [p[1] for p in produk_sorted]
  
    # ======================
    # CHART DINAMIS
    # ======================
    # determine date span in days for chart granularity
    chart_data = {}

    if start and end:
        end_dt_real = end_dt - timedelta(days=1)
        selisih_hari = (end_dt_real - start_dt).days
    elif transaksi:
        start_dt = min(t.tanggal for t in transaksi)
        end_dt_real = max(t.tanggal for t in transaksi)
        start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt_real = end_dt_real.replace(hour=0, minute=0, second=0, microsecond=0)
        selisih_hari = (end_dt_real - start_dt).days
    else:
        end_dt_real = None
        selisih_hari = 0

    if end_dt_real is not None:
        if selisih_hari > 31:
            current = start_dt.replace(day=1)
            end_month = end_dt_real.replace(day=1)

            while current <= end_month:
                key = current.strftime("%Y-%m")
                chart_data[key] = {
                    "label": current.strftime("%b %Y"),
                    "total": 0
                }

                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)

            for t in transaksi:
                key = t.tanggal.strftime("%Y-%m")
                if key in chart_data:
                    chart_data[key]["total"] += t.total
        else:
            current = start_dt
            while current <= end_dt_real:
                key = current.strftime("%Y-%m-%d")
                chart_data[key] = {
                    "label": current.strftime("%d %b"),
                    "total": 0
                }
                current += timedelta(days=1)

            for t in transaksi:
                key = t.tanggal.strftime("%Y-%m-%d")
                if key in chart_data:
                    chart_data[key]["total"] += t.total

    chart_labels = [v["label"] for v in chart_data.values()]
    chart_values = [v["total"] for v in chart_data.values()]
    metode_data = {}

    for t in transaksi:
        metode = t.metode.lower()

        if metode in ["tunai"]:
            metode = "Tunai"
        elif metode in ["qris"]:
            metode = "QRIS"
        else:
            continue
        
        metode_data[metode] = metode_data.get(metode, 0) + 1

        if metode == "Tunai":
            total_tunai += t.total
        elif metode == "QRIS":
            total_qris += t.total
            
    return render_template(
        "laporan/laporan.html",
        transaksi=transaksi,
        total_pendapatan=total_pendapatan,
        rata_rata=rata_rata,
        total_transaksi=total_transaksi,
        transaksi_list=transaksi_list,
        total_tunai=total_tunai,
        total_qris=total_qris,
        produk_labels=produk_labels,
        produk_values=produk_values,
        chart_labels=chart_labels,
        chart_values=chart_values,
        metode_labels=list(metode_data.keys()),
        metode_values=list(metode_data.values()),
        start=start,
        end=end
    )
    
@laporan_bp.route("/laporan/export")
@login_required
def export_laporan():
    start = request.args.get("start")
    end = request.args.get("end")
    

    query = Transaksi.query

    if start and end:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d") + timedelta(days=1)

        query = query.filter(
            Transaksi.tanggal >= start_dt,
            Transaksi.tanggal < end_dt
        )

    transaksi = query.order_by(Transaksi.tanggal.desc()).all()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["Tanggal", "No Transaksi", "Metode", "Total", "Kasir"])

    for t in transaksi:
        metode = t.metode.lower().strip()

        if metode in ["cash", "tunai"]:
            metode = "Tunai"
        elif metode in ["debit", "qris"]:
            metode = "QRIS"

        writer.writerow([
            t.tanggal.strftime("%d-%m-%Y %H:%M"),
            t.no_transaksi,
            metode,
            t.total,
            "Admin"
        ])

    # ======================
# NAMA FILE DINAMIS
# ======================

    if start and end:

        start_fmt = datetime.strptime(start, "%Y-%m-%d").strftime("%d-%m-%Y")
        end_fmt = datetime.strptime(end, "%Y-%m-%d").strftime("%d-%m-%Y")

        filename = f"laporan_{start_fmt}_sd_{end_fmt}.csv"

    else:

        filename = "laporan_semua.csv"


    response = Response(output.getvalue(), mimetype="text/csv")

    response.headers["Content-Disposition"] = (
        f"attachment; filename={filename}"
    )

    return response