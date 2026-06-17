from flask import Blueprint, render_template, request, redirect, url_for, flash
from models import db, Barang, BatchBarang
from flask import flash
from datetime import datetime, date, timedelta
from sqlalchemy import func
from auth_middleware import login_required

barang_bp = Blueprint('barang', __name__)
@login_required
@barang_bp.route("/api/barang/filter")

def api_filter_barang():
    keyword = request.args.get("keyword", "")
    filter_type = request.args.get("filter", "all")

    query = Barang.query

    if keyword:
        query = query.filter(
            (Barang.nama.ilike(f"%{keyword}%")) |
            (Barang.barcode.ilike(f"%{keyword}%"))
        )
        
    # FILTER STOK
    if filter_type == "habis":

        query = query.filter(
            Barang.stok <= 0
        )

    elif filter_type == "menipis":

        query = query.filter(
            Barang.stok > 0,
            Barang.stok <= 5
        )

    elif filter_type == "restock":

        query = query.filter(
            Barang.stok > 5,
            Barang.stok <= 10
     )

    elif filter_type == "expired":

        today = date.today()
        limit = today + timedelta(days=30)

        expired_barang_ids = db.session.query(
            BatchBarang.barang_id
        ).filter(
            BatchBarang.expired_date != None,
            BatchBarang.expired_date <= limit,
            BatchBarang.stok > 0
        ).distinct()

        query = query.filter(
            Barang.id.in_(expired_barang_ids)
        )

    elif filter_type == "expired":

        today = date.today()
        limit = today + timedelta(days=30)

        expired_barang_ids = db.session.query(
            BatchBarang.barang_id
        ).filter(
            BatchBarang.expired_date != None,
            BatchBarang.expired_date <= limit,
            BatchBarang.stok > 0
        ).distinct()

        query = query.filter(
            Barang.id.in_(expired_barang_ids)
        )

    page = request.args.get("page", 1, type=int)

    pagination = query.paginate(page=page, per_page=15, error_out=False)

    data = []
    for b in pagination.items:
        data.append({
            "id": b.id,
            "barcode": b.barcode,
            "nama": b.nama,
            "harga": b.harga,
            "stok": b.stok,
            "expired_date": b.expired_date.strftime("%Y-%m-%d") if b.expired_date else ""
        })

    today = date.today()
    limit = today + timedelta(days=30)

    total_barang = query.count()
    barang_habis = query.filter(Barang.stok <= 0).count()
    stok_menipis = query.filter(Barang.stok <= 5).count()
    restock = query.filter(Barang.stok > 5, Barang.stok <= 10).count()
    expired_dekat = BatchBarang.query.filter(
        BatchBarang.expired_date != None,
        BatchBarang.expired_date <= limit,
        BatchBarang.stok > 0
    ).count()
    
    return {
    "status": "ok",
    "data": data,
    "page": pagination.page,
    "pages": pagination.pages,
    "has_prev": pagination.has_prev,
    "has_next": pagination.has_next,
    "total_barang": total_barang,
    "barang_habis": barang_habis,
    "stok_menipis": stok_menipis,
    "restock": restock,
    "expired_dekat": expired_dekat
}

@barang_bp.route("/barang")
@login_required
def barang():

    keyword = request.args.get("keyword", "")
    filter_type = request.args.get("filter", "all")
    page = request.args.get("page", 1, type=int)

    query = Barang.query

    # SEARCH
    if keyword:
        query = query.filter(
            (Barang.nama.ilike(f"%{keyword}%")) |
            (Barang.barcode.ilike(f"%{keyword}%"))
        )

    # ======================
    # STATISTIK GLOBAL
    # ======================

    total_barang = query.count()

    barang_habis = query.filter(
        Barang.stok <= 0
    ).count()

    stok_menipis = query.filter(
        Barang.stok > 0,
        Barang.stok <= 5
    ).count()

    restock = query.filter(
        Barang.stok > 5,
        Barang.stok <= 10
    ).count()

    today = date.today()
    limit = today + timedelta(days=30)

    expired_barang_ids = db.session.query(
        BatchBarang.barang_id
    ).filter(
        BatchBarang.expired_date != None,
        BatchBarang.expired_date <= limit,
        BatchBarang.expired_date >= today,
        BatchBarang.stok > 0
    ).distinct()

    expired_dekat = expired_barang_ids.count()

    # ======================
    # FILTER TABEL
    # ======================

    if filter_type == "habis":

        query = query.filter(
            Barang.stok <= 0
        )

    elif filter_type == "menipis":

        query = query.filter(
            Barang.stok > 0,
            Barang.stok <= 5
        )

    elif filter_type == "restock":

        query = query.filter(
            Barang.stok > 5,
            Barang.stok <= 10
        )

    elif filter_type == "expired":

        query = query.filter(
            Barang.id.in_(expired_barang_ids)
        )

    # ======================
    # PAGINATION
    # ======================

    pagination = query.order_by(
    func.lower(Barang.nama).asc()
    ).paginate(
        page=page,
        per_page=15,
        error_out=False
    )

    barang = pagination.items

    # ======================
    # EXPIRED DISPLAY
    # ======================

    for b in barang:

        expired_terdekat = BatchBarang.query.filter(
            BatchBarang.barang_id == b.id,
            BatchBarang.expired_date != None,
            BatchBarang.expired_date >= today,
            BatchBarang.stok > 0
        ).order_by(
            BatchBarang.expired_date.asc()
        ).first()

        expired_count = BatchBarang.query.filter(
            BatchBarang.barang_id == b.id,
            BatchBarang.expired_date != None,
            BatchBarang.expired_date < today,
            BatchBarang.stok > 0
        ).count()

        b.expired_count = expired_count

        if expired_terdekat:

            b.expired_display = expired_terdekat.expired_date.strftime(
                "%d-%m-%Y"
            )

            b.expired_raw = expired_terdekat.expired_date.strftime(
                "%Y-%m-%d"
            )

        else:

            b.expired_display = "-"
            b.expired_raw = ""

    return render_template(
        "barang/barang.html",
        page_title="Barang",
        page_icon="fa fa-box",
        barang=pagination,
        keyword=keyword,
        filter_type=filter_type,
        total_barang=total_barang,
        barang_habis=barang_habis,
        stok_menipis=stok_menipis,
        restock=restock,
        expired_dekat=expired_dekat
    )
    
@barang_bp.route("/batch/tambah", methods=["POST"])
@login_required
def tambah_batch():

    barang_id = request.form.get("barang_id")
    stok = request.form.get("stok")
    expired_date = request.form.get("expired_date")

    expired_obj = None

    if expired_date:
        expired_obj = datetime.strptime(
            expired_date,
            "%Y-%m-%d"
        ).date()

    # SIMPAN BATCH BARU
    batch = BatchBarang(
        barang_id=barang_id,
        stok=int(stok),
        expired_date=expired_obj
    )

    db.session.add(batch)

    # COMMIT DULU BIAR MASUK DATABASE
    db.session.commit()

    # HITUNG ULANG TOTAL STOK
    barang = Barang.query.get(barang_id)

    total_stok = sum(
        int(b.stok or 0)
        for b in BatchBarang.query.filter_by(
            barang_id=barang_id
        ).all()
    )

    # UPDATE STOK BARANG
    barang.stok = total_stok

    db.session.commit()

    flash("Batch stok berhasil ditambahkan", "success")

    return redirect("/barang")

@barang_bp.route("/barang/tambah", methods=["POST"])
@login_required
def tambah_barang():

    barcode = request.form['barcode']
    nama = request.form['nama']
    harga = request.form['harga']

    barang = Barang(
        barcode=barcode,
        nama=nama,
        harga=harga,
        stok=0
    )

    db.session.add(barang)
    db.session.commit()

    flash("Barang berhasil ditambahkan", "success")

    return redirect("/barang")

@barang_bp.route("/barang/hapus/<int:id>")
@login_required
def hapus_barang(id):

    barang = Barang.query.get(id)

    if not barang:
        flash("Barang tidak ditemukan", "danger")
        return redirect("/barang")

    # HAPUS SEMUA BATCH
    BatchBarang.query.filter_by(
        barang_id=id
    ).delete()

    # HAPUS BARANG
    db.session.delete(barang)

    db.session.commit()

    flash("Barang berhasil dihapus", "danger")

    return redirect("/barang")
@barang_bp.route("/barang/update", methods=["POST"])
@login_required
def barang_update():
    id = request.form.get("id")
    barang = Barang.query.get(id)
    if not barang:
        flash("Barang tidak ditemukan")
        return redirect(url_for("barang.barang"))

    barang.barcode = request.form.get("barcode")
    barang.nama = request.form.get("nama")
    barang.harga = int(request.form.get("harga"))

    db.session.commit()
    flash("Barang berhasil diperbarui", "warning")
    return redirect(url_for("barang.barang"))

@barang_bp.route("/api/barang/<barcode>")
@login_required
def api_barang(barcode):

    barang = Barang.query.filter_by(
        barcode=barcode
    ).first()

    if not barang:
        return {
            "status": "error"
        }

    today = date.today()

    expired_warning = False
    expired_block = False
    expired_days = None

    # tambahan baru
    expired_skipped = False

    # ambil semua batch
    batch_list = BatchBarang.query.filter(
        BatchBarang.barang_id == barang.id,
        BatchBarang.stok > 0
    ).order_by(
        BatchBarang.expired_date.asc().nullslast()
    ).all()

    valid_batch = None

    for batch in batch_list:

        # batch tanpa expired = aman
        if not batch.expired_date:
            valid_batch = batch
            break

        selisih = (
            batch.expired_date - today
        ).days

        # kalau batch expired
        if selisih < 0:

            expired_skipped = True

            continue

        # batch valid ditemukan
        valid_batch = batch

        # warning kalau mendekati expired
        if selisih <= 7:

            expired_warning = True
            expired_days = selisih

        break

    # kalau semua batch expired
    if not valid_batch:

        expired_block = True

    return {

        "status": "ok",

        "barang": {

            "barcode": barang.barcode,
            "nama": barang.nama,
            "harga": barang.harga,
            "stok": barang.stok,

            "expired_warning": expired_warning,
            "expired_block": expired_block,
            "expired_days": expired_days,

            # tambahan baru
            "expired_skipped": expired_skipped
        }
    }

@barang_bp.route("/api/barang/search")
@login_required
def search_barang():

    keyword = request.args.get("q", "")

    barang = Barang.query.filter(
        (Barang.nama.ilike(f"%{keyword}%")) |
        (Barang.barcode.ilike(f"%{keyword}%"))
    ).limit(5).all()

    hasil = []

    for b in barang:
        hasil.append({
            "barcode": b.barcode,
            "nama": b.nama,
            "harga": int(b.harga),
            "stok": int(b.stok)
        })

    return {"status": "ok", "data": hasil}

@barang_bp.route("/api/batch/<int:barang_id>")
@login_required
def api_batch(barang_id):

    batch_list = BatchBarang.query.filter(
    BatchBarang.barang_id == barang_id,
    BatchBarang.stok > 0
    ).order_by(
    BatchBarang.expired_date.asc()
    ).all()

    data = []

    for b in batch_list:

        data.append({
    "id": b.id,

    "stok": b.stok,

    "expired": b.expired_date.strftime("%d-%m-%Y")
        if b.expired_date else "-",

    "expired_raw": b.expired_date.strftime("%Y-%m-%d")
        if b.expired_date else "",

    "tanggal_input": b.tanggal_input.strftime("%d-%m-%Y")
})

    return {
        "status": "ok",
        "data": data
    }
    
@barang_bp.route("/batch/update", methods=["POST"])
@login_required
def update_batch():

    batch_id = request.form.get("batch_id")

    batch = BatchBarang.query.get(batch_id)

    if not batch:
        flash("Batch tidak ditemukan", "danger")
        return redirect("/barang")

    batch.stok = int(request.form.get("stok"))

    expired = request.form.get("expired_date")

    if expired:
        batch.expired_date = datetime.strptime(
            expired,
            "%Y-%m-%d"
        ).date()
    else:
        batch.expired_date = None

    db.session.commit()

    # HITUNG ULANG TOTAL STOK
    barang = Barang.query.get(batch.barang_id)

    total_stok = sum(
        int(b.stok or 0)
        for b in BatchBarang.query.filter_by(
            barang_id=batch.barang_id
        ).all()
    )

    barang.stok = total_stok

    db.session.commit()

    flash("Batch berhasil diupdate", "success")

    return redirect("/barang")