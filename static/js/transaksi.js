// ===============================
// GLOBAL STATE
// ===============================

let html5QrCode = null;
let scannerRunning = false;
let selectedIndex = -1;
let totalBelanja = 0;


// ===============================
// FORMAT RUPIAH
// ===============================

function rupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

function showToast(message, type = "success"){
  const toast = document.getElementById("toast");

  toast.className = "toast show " + type;
  toast.innerText = message;

  setTimeout(() => {
    toast.className = "toast " + type;
  }, 2500);
}

// ===============================
// AUTOCOMPLETE BARANG
// ===============================

let scanTimer = null;
let lastScanCode = "";
let lastScanTime = 0;

function prosesScanBarcode(kode) {
  kode = kode.trim();


  if (kode === "") return;

  const now = Date.now();

  // cegah barcode yang sama masuk 2x dalam 1 detik
  if (kode === lastScanCode && now - lastScanTime < 1000) {
    return;
  }

  lastScanCode = kode;
  lastScanTime = now;

  searchBarang(kode);
  document.getElementById("scanInput").value = "";
  document.getElementById("suggestionBox").innerHTML = "";
  document.getElementById("scanInput").blur();
}

function autoCompleteBarang() {
  let input = document.getElementById("scanInput");
  let keyword = input.value.trim();

  clearTimeout(scanTimer);

  // barcode -> langsung proses
  if (/^[0-9A-Za-z]{6,}$/.test(keyword)) {
    scanTimer = setTimeout(() => {
      prosesScanBarcode(keyword);
    }, 150);
    return;
  }

  // pencarian nama barang
  if (keyword.length < 2) {
    document.getElementById("suggestionBox").innerHTML = "";
    return;
  }

  fetch("/api/barang/search?q=" + encodeURIComponent(keyword))
    .then(res => res.json())
    .then(data => {
      let box = document.getElementById("suggestionBox");
      box.innerHTML = "";
      selectedIndex = -1;

      data.data.forEach((barang) => {
        let div = document.createElement("div");
        div.className = "suggestion-item";

        div.innerHTML = `
          ${barang.nama} - ${rupiah(barang.harga)}
          <span class="stok-info">
            (${barang.stok > 0 ? 'Stok: ' + barang.stok : 'Habis'})
          </span>
        `;

        div.onclick = function () {
          searchBarang(barang.barcode);
          box.innerHTML = "";
          input.value = "";
        };

        box.appendChild(div);
      });
    });
}

// ===============================
// KEYBOARD NAVIGATION
// ===============================

function handleKey(event) {
  let items = document.querySelectorAll(".suggestion-item");

  // ENTER dari barcode scanner
  if (event.key === "Enter") {
    event.preventDefault();

    if (items.length > 0 && selectedIndex >= 0) {
      items[selectedIndex].click();
    } else {
      handleScan();
    }

    return;
  }

  // Kalau suggestion belum ada, tombol selain Enter tidak perlu diproses
  if (items.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex++;

    if (selectedIndex >= items.length) {
      selectedIndex = 0;
    }

    highlight(items);
  }

  else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex--;

    if (selectedIndex < 0) {
      selectedIndex = items.length - 1;
    }

    highlight(items);
  }

  else if (event.key === "Escape") {
    document.getElementById("suggestionBox").innerHTML = "";
    selectedIndex = -1;
  }
}

// ===============================
// HIGHLIGHT
// ===============================

function highlight(items) {
  items.forEach(item => item.classList.remove("active"));

  if (selectedIndex >= 0) {
    items[selectedIndex].classList.add("active");
    items[selectedIndex].scrollIntoView({
      block: "nearest"
    });
  }
}


// ===============================
// SCAN ENTER
// ===============================

function handleScan() {
  let kode = document.getElementById("scanInput").value.trim();
  prosesScanBarcode(kode);
}

// ===============================
// API BARANG
// ===============================

function searchBarang(kode) {
  kode = kode.trim();

  fetch("/api/barang/" + encodeURIComponent(kode))
    .then(res => res.json())
    .then(data => {
      console.log("HASIL:", data);

      if (data.status === "ok") {

    if(data.barang.expired_block){

        showToast(
            "Barang sudah kadaluarsa!",
            "error"
        );

        return;
    }

     if(data.barang.expired_skipped){

    showToast(
        "Ada batch kadaluarsa yang dilewati otomatis",
        "warning"
    );
} 
    if(data.barang.expired_warning){

        showToast(
            `Barang mendekati expired (${data.barang.expired_days} hari lagi)`,
            "warning"
        );
    }

    tambahKeTabel(data.barang);

    document.getElementById("suggestionBox").innerHTML = "";
    document.getElementById("scanInput").value = "";

} else {

    showToast(
        "Barang tidak ditemukan",
        "error"
    );
}

})
.catch(err => {
    console.log(err);
});
}

// ===============================
// TAMBAH KE KERANJANG (UPGRADE)
// ===============================

function tambahKeTabel(barang) {

  if(barang.stok <= 0){
  showToast("Stok barang habis!", "error");
  return;
  document.getElementById("suggestionBox").innerHTML = "";
}

  let table = document.getElementById("keranjang");
  let rows = table.querySelectorAll("tr");

  let ditemukan = false;

  rows.forEach(row => {

    if (row.dataset.kode === barang.barcode) {

      let qtyEl = row.querySelector(".qty");
      let subtotalEl = row.querySelector(".subtotal");

      let qtySekarang = parseInt(qtyEl.innerText);

if(qtySekarang >= barang.stok){
  alert("Stok tidak mencukupi!");
  return;
}

let qty = qtySekarang + 1;

      qtyEl.innerText = qty;
      subtotalEl.innerText = rupiah(qty * barang.harga);

      ditemukan = true;

    }

  });

  if (!ditemukan) {

    let tr = document.createElement("tr");
    tr.dataset.kode = barang.barcode;
    tr.dataset.stok = barang.stok;

 tr.innerHTML = `
<td>${barang.nama}</td>
<td>${rupiah(barang.harga)}</td>
<td>
  <div class="qty-control">
    <button onclick="kurang(this)">-</button>
    <span class="qty">1</span>
    <button onclick="tambah(this)">+</button>
  </div>
</td>
<td class="subtotal">${rupiah(barang.harga)}</td>
<td>
  <button onclick="hapusItem(this)">❌</button>
</td>
`;

    table.appendChild(tr);

  }

  updateTotal();
  document.getElementById("scanInput").value = "";
  document.getElementById("suggestionBox").innerHTML = "";

}


// ===============================
// QTY CONTROL
// ===============================

function tambah(btn) {

  let row = btn.closest("tr");
  let qtyEl = row.querySelector(".qty");
  let harga = parseInt(row.children[1].innerText.replace(/[^0-9]/g, ""));

  let stok = parseInt(row.dataset.stok);
let qtySekarang = parseInt(qtyEl.innerText);

if(qtySekarang >= stok){
  alert("Stok tidak mencukupi!");
  return;
}

let qty = qtySekarang + 1;
  qtyEl.innerText = qty;

  row.querySelector(".subtotal").innerText = rupiah(qty * harga);

  updateTotal();

}

function kurang(btn) {

  let row = btn.closest("tr");
  let qtyEl = row.querySelector(".qty");
  let harga = parseInt(row.children[1].innerText.replace(/[^0-9]/g, ""));

  let qty = parseInt(qtyEl.innerText);

  if (qty > 1) {
    qty--;
    qtyEl.innerText = qty;
    row.querySelector(".subtotal").innerText = rupiah(qty * harga);
  } else {
    row.remove();
  }

  updateTotal();

}


// ===============================
// TOTAL
// ===============================

function updateTotal() {
  let total = 0;

  document.querySelectorAll(".subtotal").forEach(cell => {
    total += parseInt(cell.innerText.replace(/[^0-9]/g, ""));
  });

  totalBelanja = total;
  document.getElementById("totalBelanja").innerText = rupiah(total);

  hitungKembalian();
}

function resetTransaksi(){
  document.getElementById("keranjang").innerHTML = "";
  document.getElementById("inputBayar").value = "";
  document.getElementById("kembalian").innerText = "Rp 0";

  totalBelanja = 0;
  lastScanCode = "";
  lastScanTime = 0;
  clearTimeout(scanTimer);

  document.getElementById("totalBelanja").innerText = "Rp 0";
}

// ===============================
// KEMBALIAN
// ===============================

function hitungKembalian() {
  let bayar = parseInt(document.getElementById("inputBayar").value) || 0;

  if (bayar < totalBelanja) {
    document.getElementById("kembalian").innerText = "Rp 0";
    return;
  }

  let kembali = bayar - totalBelanja;
  document.getElementById("kembalian").innerText = rupiah(kembali);
}

document.getElementById("inputBayar")
  .addEventListener("input", hitungKembalian);


// ===============================
// SCANNER CAMERA
// ===============================

function startScanner() {

  if (scannerRunning) return;

  document.getElementById("reader").style.display = "block";

  html5QrCode = new Html5Qrcode("reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },

    (decodedText) => {

      console.log("SCAN BERHASIL:", decodedText);

      document.getElementById("scanInput").value = decodedText;

      stopScanner();
      searchBarang(decodedText);

    }

  ).then(() => {
    scannerRunning = true;
  }).catch(err => {
    console.log(err);
  });

}


function stopScanner() {

  if (html5QrCode && scannerRunning) {

    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      document.getElementById("reader").style.display = "none";
      scannerRunning = false;
    });

  }

}


// ===============================
// PROSES BAYAR (UPGRADE)
// ===============================

async function prosesBayar() {

  let rows = document.querySelectorAll("#keranjang tr");

  // 1. cek keranjang kosong
  if (rows.length === 0) {
   showToast("Keranjang masih kosong!", "warning");
    return;
  }

  // 2. cek input bayar
  let inputBayarEl = document.getElementById("inputBayar");

  if (inputBayarEl.value === "") {
    alert("Masukkan jumlah bayar terlebih dahulu!");
    inputBayarEl.focus();
    return;
  }

  let bayar = parseInt(inputBayarEl.value);

  // 3. cek uang kurang
  if (bayar < totalBelanja) {
    showToast("Uang tidak cukup!", "error");
    inputBayarEl.focus();
    return;
  }

  // 4. cek metode pembayaran
  let metodeEl = document.querySelector("input[name='metode']:checked");

  if (!metodeEl) {
    alert("Pilih metode pembayaran!");
    return;
  }

  let kembali = bayar - totalBelanja;

  let metode = metodeEl.parentNode.innerText.trim();

  let items = [];

  rows.forEach(row => {
    items.push({
      barcode: row.dataset.kode,
      nama: row.children[0].innerText,
      harga: parseInt(row.children[1].innerText.replace(/[^0-9]/g, "")),
      qty: parseInt(row.querySelector(".qty").innerText),
      subtotal: parseInt(row.querySelector(".subtotal").innerText.replace(/[^0-9]/g, ""))
    });
  });

  try {
    // kirim request ke API
    let res = await fetch("/api/transaksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items,
        total: totalBelanja,
        bayar: bayar,
        kembali: kembali,
        metode: metode
      })
    });

    let dataText = await res.text(); // ambil response text

    let data;
    try {
      data = JSON.parse(dataText); // parse ke JSON
    } catch (parseErr) {
      alert("Gagal parse response JSON:\n" + parseErr);
      return;
    }

    if (data.status === "ok") {
      showToast("Transaksi berhasil diproses", "success");
      document.getElementById("suggestionBox").innerHTML = "";
      tampilkanStruk(items, totalBelanja, bayar, kembali, metode, data.trx_id);
      resetTransaksi();
    } else {
      alert("Transaksi gagal: " + (data.message || "Tidak ada message"));
    }

  } catch (err) {
    alert("Terjadi error di fetch:\n" + err);
  }
}

// ===============================
// Struk Function
// ===============================
function tampilkanStruk(items, total, bayar, kembali, metode, nomorTrx) {
  const now = new Date();

  function kananKiri(kiri, kanan, lebar = 30) {
    kiri = String(kiri);
    kanan = String(kanan);

    let spasi = lebar - kiri.length - kanan.length;
    if (spasi < 1) spasi = 1;

    return kiri + " ".repeat(spasi) + kanan;
  }

  function tengah(text, lebar = 30) {
    text = String(text);

    let spasiKiri = Math.floor((lebar - text.length) / 2);
    if (spasiKiri < 0) spasiKiri = 0;

    return " ".repeat(spasiKiri) + text;
  }

  function garis(lebar = 30) {
    return "-".repeat(lebar);
  }

  let text = "";

  text += tengah("TOKO ANRESTA") + "\n";
  text += tengah("Jl. Sekarsari, Tulungrejo") + "\n";
  text += garis() + "\n";
  text += "Tanggal: " + now.toLocaleString("id-ID") + "\n";
  text += "Kasir  : Admin\n";
  text += "No Trx : " + nomorTrx + "\n";
  text += garis() + "\n";

  items.forEach(item => {
    text += item.nama + "\n";
    text += kananKiri(
      item.qty + " x " + rupiah(item.harga),
      rupiah(item.subtotal)
    ) + "\n";
  });

  text += garis() + "\n";
  text += kananKiri("Total", rupiah(total)) + "\n";
  text += kananKiri("Bayar", rupiah(bayar)) + "\n";
  text += kananKiri("Kembali", rupiah(kembali)) + "\n";
  text += kananKiri("Metode", metode) + "\n";
  text += garis() + "\n";
  text += tengah("TERIMA KASIH") + "\n\n";
  text += tengah("SELAMAT BERBELANJA") + "\n";
  text += " \n \n \n \n \n \n \n \n \n \n";

  document.getElementById("suggestionBox").innerHTML = "";
  document.getElementById("strukText").innerText = text;
  document.getElementById("popupStruk").style.display = "flex";
}

function closeStruk() {
  document.getElementById("popupStruk").style.display = "none";
}

function cetakStruk() {
  const isiStruk = document.getElementById("strukText").innerText;

  const w = window.open("", "_blank", "width=300,height=600");

  w.document.write(`
    <html>
      <head>
        <title>Cetak Struk</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 6px 6px 120px 6px;
            width: 58mm;
            box-sizing: border-box;
            font-family: monospace;
            font-size: 11px;
            line-height: 1.45;
            color: #000;
            background: #fff;
          }

          pre {
            margin: 0;
            padding: 0;
            white-space: pre;
            font-family: monospace;
            font-size: 11px;
            line-height: 1.45;
          }
        </style>
      </head>
      <body>
        <pre>${isiStruk}</pre>
      </body>
    </html>
  `);

  w.document.close();

  setTimeout(() => {
    w.focus();
    w.print();
  }, 1000);
}

// ===============================
// AUTO FOCUS
// ===============================

  function hapusItem(btn){
  btn.closest("tr").remove();
  updateTotal();
}

window.autoCompleteBarang = autoCompleteBarang;
window.handleKey = handleKey;
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.tambah = tambah;
window.kurang = kurang;
window.hapusItem = hapusItem;
window.prosesBayar = prosesBayar;
window.cetakStruk = cetakStruk;
window.closeStruk = closeStruk;


document.getElementById("scanInput").addEventListener("input", function() {
    console.log("INPUT:", this.value);
});

let barcodeBuffer = "";
let barcodeTimer = null;

document.addEventListener("keydown", function(event) {

   console.log(
    "KEY:",
    event.key,
    "TARGET:",
    document.activeElement.id
  );

  const active = document.activeElement;

  // Kalau sedang isi nominal bayar, jangan ganggu
  if (active && active.id === "inputBayar") {
    return;
  }

  // Kalau scanner kirim Enter
  if (event.key === "Enter") {
    if (barcodeBuffer.length >= 5) {
      prosesScanBarcode(barcodeBuffer);
      barcodeBuffer = "";
    }
    return;
  }

  // Ambil karakter dari scanner
  if (event.key.length === 1) {
    barcodeBuffer += event.key;

    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(() => {
      if (barcodeBuffer.length >= 5) {
        prosesScanBarcode(barcodeBuffer);
      }
      barcodeBuffer = "";
    }, 300);
  }
});