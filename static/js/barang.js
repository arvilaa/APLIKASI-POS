let scanner = null;

window.openPopup = function(){
    console.clear();
    console.log("POPUP DIBUKA");

    document.getElementById("popupForm").classList.add("show");

    const barcodeInput = document.getElementById("barcode");
    barcodeInput.value = "";

    setTimeout(() => {
        barcodeInput.focus();
        console.log("FOCUS KE BARCODE");
    }, 200);
};

window.closePopup = function(){
    document.getElementById("popupForm").classList.remove("show");
};

// tombol scan kamera tidak dipakai untuk scanner USB
window.startScanner = function(){
    const barcodeInput = document.getElementById("barcode");
    barcodeInput.focus();
    console.log("Scanner USB aktif: scan barcode sekarang");
};

window.stopScanner = function(){};

document.addEventListener("DOMContentLoaded", function(){
    const barcodeInput = document.getElementById("barcode");
    const namaInput = document.getElementById("nama");

    if(barcodeInput){
        barcodeInput.addEventListener("input", function(){
            console.log("BARCODE MASUK:", barcodeInput.value);
        });

        barcodeInput.addEventListener("keydown", function(e){
            if(e.key === "Enter"){
                e.preventDefault();
                if(namaInput){
                    namaInput.focus();
                }
            }
        });
    }
});

window.closeEditPopup = function(){
    document.getElementById("editPopup").classList.remove("show");
}

const checkBtn = document.getElementById("checkExpiredBtn");
let expiredVisible = false;

function highlightText(text, keyword){
    if(!keyword) return text;

    const regex = new RegExp(`(${keyword})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
}

function updateSuggestionActive(items){
    items.forEach((item, index) => {
        if(index === selectedSuggestionIndex){
            item.classList.add("active");
            item.scrollIntoView({ block: "nearest" });
        }else{
            item.classList.remove("active");
        }
    });
}

checkBtn.addEventListener("click", function() {
    const today = new Date();
    const tbody = document.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    expiredVisible = !expiredVisible;

    // Tampilkan / sembunyikan kolom Status Expired
    document.querySelectorAll(".expired-col").forEach(td => td.style.display = expiredVisible ? "" : "none");

    // Hitung diffDays dan isi badge
    rows.forEach(tr => {
        const td = tr.querySelector(".expired-badge");
        const expiredDateStr = td.dataset.expiredDate;

        let diffDays = 9999; // default untuk row tanpa expired date
        if (expiredDateStr) {
            const parts = expiredDateStr.split("-");
            const expiredDate = new Date(parts[0], parts[1]-1, parts[2]);
            if (!isNaN(expiredDate)) {
                diffDays = Math.ceil((expiredDate - today)/(1000*60*60*24));
            }
        }

        tr.dataset.diffDays = diffDays;

        if (expiredVisible) {
            let label = "";
            let colorClass = "";
            if (diffDays <= 7) { label="1 minggu lagi"; colorClass="expired-red"; }
            else if (diffDays <= 14) { label="2 minggu"; colorClass="expired-orange"; }
            else if (diffDays <= 30) { label="1 bulan"; colorClass="expired-yellow"; }
            else if (diffDays <= 60) { label="2 bulan"; colorClass="expired-lightblue"; }
            else if (diffDays <= 90) { label="3 bulan"; colorClass="expired-green"; }

            td.innerHTML = label ? `<span class="${colorClass}">${label}</span>` : "";
        } else {
            td.innerHTML = "";
        }
    });

    // Sort row ascending berdasarkan diffDays
    if (expiredVisible) {
        rows.sort((a,b)=>parseInt(a.dataset.diffDays) - parseInt(b.dataset.diffDays));
        rows.forEach(tr => tbody.appendChild(tr));
    }
});

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

function searchBarang(){
    const keyword = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll(".table-barang tbody tr");

    rows.forEach(row => {
        const barcode = row.children[0].textContent.toLowerCase();
        const nama = row.children[1].textContent.toLowerCase();

        if(barcode.includes(keyword) || nama.includes(keyword)){
            row.style.display = "";
        }else{
            row.style.display = "none";
        }
    });
}

searchBtn.addEventListener("click", searchBarang);

searchInput.addEventListener("keyup", function(e){
    if(e.key === "Enter"){
        searchBarang();
    }

    if(searchInput.value === ""){
        searchBarang();
    }
});

const suggestionsBox = document.getElementById("suggestions");
let selectedSuggestionIndex = -1;

// ambil semua data dari tabel
const dataBarang = Array.from(document.querySelectorAll(".table-barang tbody tr")).map(row => {
    return {
        barcode: row.children[0].textContent,
        nama: row.children[1].textContent
    };
});

searchInput.addEventListener("input", function(){
    const keyword = this.value.toLowerCase();
    suggestionsBox.innerHTML = "";
    selectedSuggestionIndex = -1;

    if(keyword === ""){
        suggestionsBox.style.display = "none";
        return;
    }

    const filtered = dataBarang.filter(item =>
        item.nama.toLowerCase().includes(keyword) ||
        item.barcode.toLowerCase().includes(keyword)
    );

    filtered.slice(0,5).forEach(item => {
        const div = document.createElement("div");
        div.classList.add("suggestion-item");
        div.innerHTML = highlightText(item.nama, keyword) + " (" + highlightText(item.barcode, keyword) + ")";

        div.addEventListener("click", function(){
            searchInput.value = item.nama;
            suggestionsBox.style.display = "none";
            searchBarang(); // langsung filter tabel
        });

        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = filtered.length ? "block" : "none";
});

// klik luar → tutup dropdown
document.addEventListener("click", function(e){
    if(!e.target.closest(".search-wrapper")){
        suggestionsBox.style.display = "none";
    }
});

searchInput.addEventListener("keydown", function(e){
    const items = suggestionsBox.querySelectorAll(".suggestion-item");

    if(suggestionsBox.style.display !== "block" || items.length === 0){
        return;
    }

    if(e.key === "ArrowDown"){
        e.preventDefault();
        selectedSuggestionIndex++;

        if(selectedSuggestionIndex >= items.length){
            selectedSuggestionIndex = 0;
        }

        updateSuggestionActive(items);
    }

    if(e.key === "ArrowUp"){
        e.preventDefault();
        selectedSuggestionIndex--;

        if(selectedSuggestionIndex < 0){
            selectedSuggestionIndex = items.length - 1;
        }

        updateSuggestionActive(items);
    }

    if(e.key === "Enter"){
        if(selectedSuggestionIndex >= 0){
            e.preventDefault();
            items[selectedSuggestionIndex].click();
        }
    }

    if(e.key === "Escape"){
        suggestionsBox.style.display = "none";
        selectedSuggestionIndex = -1;
    }
});

function updateSummaryCards(){
    const rows = document.querySelectorAll(".table-barang tbody tr");

    let stokMenipis = 0;
    let restock = 0;
    let expiredDekat = 0;

    rows.forEach(row => {
        const stokText = row.children[3].textContent.toLowerCase();
        const expiredDateStr = row.querySelector(".expired-badge")?.dataset.expiredDate;

        if(stokText.includes("tersisa")){
            stokMenipis++;
        }

        if(stokText.includes("restock")){
            restock++;
        }

        if(expiredDateStr){
            const today = new Date();
            const parts = expiredDateStr.split("-");
            const expiredDate = new Date(parts[0], parts[1] - 1, parts[2]);
            const diffDays = Math.ceil((expiredDate - today) / (1000 * 60 * 60 * 24));

            if(diffDays <= 30){
                expiredDekat++;
            }
        }
    });

    document.getElementById("stokMenipisCount").textContent = stokMenipis;
    document.getElementById("restockCount").textContent = restock;
    document.getElementById("expiredCount").textContent = expiredDekat;
}


function formatHarga(){
    const hargaCells = document.querySelectorAll(".harga-cell");

    hargaCells.forEach(cell => {
        const harga = Number(cell.dataset.harga);

        if(!isNaN(harga)){
            cell.textContent = "Rp " + harga.toLocaleString("id-ID");
        }
    });
}

formatHarga();


let sortDirection = 1;

document.querySelectorAll(".sortable").forEach(header => {
    header.addEventListener("click", function(){
        const column = Number(this.dataset.column);
        const type = this.dataset.type;
        const tbody = document.querySelector(".table-barang tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));

        rows.sort((a, b) => {
            let aValue = a.children[column].textContent.trim();
            let bValue = b.children[column].textContent.trim();

            if(type === "number"){
                aValue = Number(aValue.replace(/[^\d]/g, ""));
                bValue = Number(bValue.replace(/[^\d]/g, ""));
            }

            if(type === "stock"){
                aValue = Number(a.children[column].textContent.replace(/[^\d]/g, ""));
                bValue = Number(b.children[column].textContent.replace(/[^\d]/g, ""));
            }

            if(type === "text"){
                return aValue.localeCompare(bValue) * sortDirection;
            }

            return (aValue - bValue) * sortDirection;
        });

        rows.forEach(row => tbody.appendChild(row));

        sortDirection *= -1;
    });
});

setTimeout(() => {
    document.querySelectorAll(".flash-message").forEach(message => {
        message.style.opacity = "0";
        message.style.transform = "translateY(-10px)";

        setTimeout(() => {
            message.remove();
        }, 300);
    });
}, 3000);

function renderPagination(result){
    const container = document.querySelector(".pagination");
    container.innerHTML = "";

    if(result.has_prev){
        container.innerHTML += `<a href="#" onclick="loadBarangData(${result.page - 1})">← Prev</a>`;
    }

    for(let i = 1; i <= result.pages; i++){
        container.innerHTML += `
            <a href="#" 
               class="${i === result.page ? 'active' : ''}"
               onclick="loadBarangData(${i})">
               ${i}
            </a>
        `;
    }

    if(result.has_next){
        container.innerHTML += `<a href="#" onclick="loadBarangData(${result.page + 1})">Next →</a>`;
    }
}

function renderBarangRows(data){
    const tbody = document.querySelector(".table-barang tbody");
    tbody.innerHTML = "";

    data.forEach(item => {
        let stokBadge = "";

        if(item.stok == 0){
            stokBadge = `<span class="stok-badge stok-habis">Habis</span>`;
        }else if(item.stok <= 5){
            stokBadge = `<span class="stok-badge stok-menipis">${item.stok} tersisa</span>`;
        }else if(item.stok <= 10){
            stokBadge = `<span class="stok-badge stok-restock">${item.stok} perlu isi ulang</span>`;
        }else{
            stokBadge = `<span class="stok-badge stok-aman">${item.stok}</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${item.barcode}</td>
                <td>${item.nama}</td>
                <td class="harga-cell" data-harga="${item.harga}">
                    Rp ${Number(item.harga).toLocaleString("id-ID")}
                </td>
                <td>${stokBadge}</td>
                <td class="expired-badge expired-col" data-expired-date="${item.expired_date}" style="display:none;"></td>
                <td>
                    <div class="action-buttons">
                        <button 
                            type="button"
                            class="btn-edit"
                            data-id="${item.id}"
                            data-barcode="${item.barcode}"
                            data-nama="${item.nama}"
                            data-harga="${item.harga}"
                            data-stok="${item.stok}"
                            data-expired="${item.expired_date}">
                            Edit
                        </button>

                        <a href="/barang/hapus/${item.id}" class="btn-hapus btn-delete">
                            Hapus
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });

}

async function loadBarangData(page = 1){
    const keyword = document.getElementById("searchInput").value;
    const activeFilter = document.querySelector(".filter-btn.active");
    const filter = activeFilter ? activeFilter.dataset.filter : "all";

    const response = await fetch(`/api/barang/filter?filter=${filter}&keyword=${keyword}&page=${page}`);
    const result = await response.json();

    if(result.status === "ok"){
        renderBarangRows(result.data);
        renderPagination(result);
        updateSummaryFromResult(result);
    }
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", async function(e){

        e.preventDefault(); // ❗ WAJIB

        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"))
        this.classList.add("active");

        const filter = this.dataset.filter;
        const keyword = document.getElementById("searchInput").value;

        const response = await fetch(`/api/barang/filter?filter=${filter}&keyword=${keyword}`);
        const result = await response.json();

        if(result.status === "ok"){
            renderBarangRows(result.data);
            renderPagination(result);
            updateSummaryFromResult(result);
        }
    });
});

document.addEventListener("DOMContentLoaded", function(){

    const searchForm = document.getElementById("searchForm");

    if(searchForm){
        searchForm.addEventListener("submit", function(e){
            e.preventDefault();
            loadBarangData();
        });
    }

});

document.addEventListener("click", function(e){

    const editBtn =
        e.target.closest(".btn-edit");

    const editBatchBtn =
        e.target.closest(".btn-edit-batch");

    if(editBatchBtn){

        e.stopPropagation();

        document.getElementById("edit_batch_id").value =
            editBatchBtn.dataset.id;

        document.getElementById("edit_batch_stok").value =
            editBatchBtn.dataset.stok;

        document.getElementById("edit_batch_expired").value =
            editBatchBtn.dataset.expired;

        document.getElementById("editBatchPopup")
            .classList.add("show");
    }

    // HAPUS
    const deleteBtn = e.target.closest(".btn-delete");

    if(deleteBtn){

        const yakin = confirm(
            "Yakin ingin menghapus barang ini?"
        );

        if(!yakin){
            e.preventDefault();
        }
    }
});

function updateSummaryFromResult(result){
    document.querySelector(".summary-card:nth-child(1) strong").textContent = result.total_barang;
    document.getElementById("stokMenipisCount").textContent = result.stok_menipis;
    document.getElementById("restockCount").textContent = result.restock;
    document.getElementById("expiredCount").textContent = result.expired_dekat;

    // ✅ TAMBAHAN
    if(document.getElementById("barangHabisCount")){
        document.getElementById("barangHabisCount").textContent = result.barang_habis;
    }
}

function openBatchPopup(id, nama) {

    document.getElementById("batchPopup")
        .classList.add("show");

    document.getElementById("batch_barang_id").value = id;

    document.getElementById("batchTitle").innerText =
        "Tambah Stok - " + nama;
}

function closeBatchPopup() {

    document.getElementById("batchPopup").classList.remove("show");
}

async function openDetailBatch(barangId){

    document
        .getElementById("detailBatchPopup")
        .classList.add("show");

    const response = await fetch(
        `/api/batch/${barangId}`
    );

    const result = await response.json();

    let html = "";

    if(result.data.length === 0){

        html = "<p>Tidak ada batch</p>";

    }else{

        result.data.forEach(item => {

            html += `
    <div class="batch-item">

        <p><strong>Stok:</strong> ${item.stok}</p>

        <p><strong>Expired:</strong>
            ${item.expired}
        </p>

        <p><strong>Input:</strong>
            ${item.tanggal_input}
        </p>

        <button
            class="btn-edit-batch"
            data-id="${item.id}"
            data-stok="${item.stok}"
            data-expired="${item.expired_raw || ''}"
        >
            Edit
        </button>

        <hr>

    </div>
`;
        });
    }

    document.getElementById(
        "batchListContainer"
    ).innerHTML = html;
}

function closeDetailBatch(){

    document
        .getElementById("detailBatchPopup")
        .classList.remove("show");
}

document.addEventListener("click", function(e){

    const editBtn = e.target.closest(".btn-edit");

    if(editBtn){

        document.getElementById("edit_id").value =
            editBtn.dataset.id;

        document.getElementById("edit_barcode").value =
            editBtn.dataset.barcode;

        document.getElementById("edit_nama").value =
            editBtn.dataset.nama;

        document.getElementById("edit_harga").value =
            editBtn.dataset.harga;

        document.getElementById("editPopup")
            .classList.add("show");
    }
});