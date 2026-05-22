from flask import Blueprint, render_template, request, jsonify

from models import (
    db,
    Transaksi,
    DetailTransaksi,
    Barang,
    BatchBarang
)

from datetime import date, datetime

from auth_middleware import login_required

transaksi_bp = Blueprint('transaksi', __name__)


@transaksi_bp.route("/transaksi")
@login_required
def transaksi():
    return render_template("transaksi/transaksi.html")


@transaksi_bp.route("/api/transaksi", methods=["POST"])
@login_required
def simpan_transaksi():

    try:

        data = request.json

        items = data.get("items", [])
        total = data.get("total", 0)
        bayar = data.get("bayar", 0)
        kembali = data.get("kembali", 0)
        metode = data.get("metode", "Cash")

        # VALIDASI
        if not items or total <= 0:
            return jsonify({
                "status": "error",
                "message": "Transaksi tidak valid"
            })

        # NOMOR TRANSAKSI
        no_transaksi = "TRX" + datetime.now().strftime("%Y%m%d%H%M%S")

        transaksi = Transaksi(
            no_transaksi=no_transaksi,
            tanggal=datetime.now(),
            total=total,
            bayar=bayar,
            kembali=kembali,
            metode=metode
        )

        db.session.add(transaksi)
        db.session.flush()

        # ======================
        # LOOP ITEM TRANSAKSI
        # ======================

        for item in items:

            barang = Barang.query.filter_by(
                barcode=item["barcode"]
            ).first()

            if not barang:
                return jsonify({
                    "status": "error",
                    "message": f"Barang {item['nama']} tidak ditemukan"
                })

            # ======================
            # HITUNG TOTAL STOK BATCH
            # ======================

            total_stok = db.session.query(
                db.func.sum(BatchBarang.stok)
            ).filter(
                BatchBarang.barang_id == barang.id
            ).scalar() or 0

            # fallback stok lama
            if total_stok == 0:
                total_stok = barang.stok

            # VALIDASI STOK
            if total_stok < item["qty"]:
                return jsonify({
                    "status": "error",
                    "message": f"Stok tidak cukup untuk {item['nama']}"
                })

            # ======================
            # DETAIL TRANSAKSI
            # ======================

            detail = DetailTransaksi(
                transaksi_id=transaksi.id,
                barcode=item["barcode"],
                nama=item["nama"],
                harga=item["harga"],
                qty=item["qty"],
                subtotal=item["harga"] * item["qty"]
            )

            db.session.add(detail)

            # ======================
            # FEFO
            # ======================

            qty = item["qty"]

            hari_ini = date.today()

            batch_list = BatchBarang.query.filter(
                    BatchBarang.barang_id == barang.id,
                    BatchBarang.stok > 0,
                    db.or_(
                        BatchBarang.expired_date == None,
                        BatchBarang.expired_date >= hari_ini
                    )
            ).order_by(
                    BatchBarang.expired_date.asc().nullslast()
            ).all()

            # kalau belum punya batch
            if not batch_list:

                barang.stok -= qty

            else:

                warning_expired = False
                expired_days = None
                for batch in batch_list:

                    if batch.expired_date:

                        sisa_hari = (
                        batch.expired_date - hari_ini
                    ).days

                    if sisa_hari <= 7:
                        print(
                            f"WARNING: {barang.nama} "
                            f"expired {sisa_hari} hari lagi"
                        )
                    if qty <= 0:
                        break

                    # stok batch cukup
                    if batch.stok >= qty:

                        batch.stok -= qty
                        qty = 0

                    else:

                        qty -= batch.stok
                        batch.stok = 0

                     # SYNC TOTAL STOK BARANG
                total_stok_baru = sum(
                    int(b.stok or 0)
                    for b in BatchBarang.query.filter_by(
                        barang_id=barang.id
                    ).all()
                )

                barang.stok = total_stok_baru
        db.session.commit()

        return jsonify({
            "status": "ok",
            "trx_id": no_transaksi
        })

    except Exception as e:

        print("ERROR TRANSAKSI:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        })