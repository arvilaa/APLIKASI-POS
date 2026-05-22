import sqlite3

# koneksi ke database lama
conn = sqlite3.connect('instance/pos.db')
cursor = conn.cursor()

try:
    # tambahkan kolom expired_date
    cursor.execute("ALTER TABLE barang ADD COLUMN expired_date DATE")
    print("Kolom expired_date berhasil ditambahkan!")
except Exception as e:
    print("Kolom mungkin sudah ada atau error:", e)

conn.commit()
conn.close()