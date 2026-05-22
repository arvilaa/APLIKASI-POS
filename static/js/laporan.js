let laporanChart = null;
let selectedBulan = null;
let selectedProduk = null;

document.addEventListener("DOMContentLoaded", function () {
  const ctx = document.getElementById("myChart");

  if (ctx && window.chartLabels && window.chartValues) {
    laporanChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: window.chartLabels,
        datasets: [{
          data: window.chartValues,
          backgroundColor: "#1A5276"
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;

                if (value >= 1000000) {
                  return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                }

                if (value >= 1000) {
                  return 'Rp ' + (value / 1000).toFixed(1) + 'K';
                }

                return 'Rp ' + value;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                if (value >= 1000000) {
                  return (value / 1000000) + 'M';
                }

                if (value >= 1000) {
                  return (value / 1000) + 'K';
                }

                return value;
              },
              maxTicksLimit: 6
            }
          }
        },
        onClick: function (event, elements) {
          if (elements.length > 0) {
            const index = elements[0].index;
            selectedBulan = window.chartLabels[index];
            filterByBulan(selectedBulan);
          }
        }
      }
    });
  }

  const produkCtx = document.getElementById("produkChart");

  if (produkCtx && window.produkLabels && window.produkValues) {
    new Chart(produkCtx, {
      type: "bar",
      data: {
        labels: window.produkLabels,
        datasets: [{
          data: window.produkValues,
          backgroundColor: "#27AE60"
        }]
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        interaction: {
          mode: "nearest",
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                return context[0].label;
              }
            }
          },
          datalabels: {
            anchor: 'end',
            align: 'right',
            color: '#2C3E50',
            font: {
              weight: 'bold'
            },
            formatter: (v) => v
          }
        },
        onClick: function (event, elements) {
          if (elements.length > 0) {
            const index = elements[0].index;
            const produk = window.produkLabels[index];
            selectedProduk = produk;
            filterByProduk(produk);
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.08)' }
          },
          y: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              callback: function(value) {
                const label = this.getLabelForValue(value);
                return label.length > 13 ? label.substring(0, 13) + "..." : label;
              }
            }
          }
        },
        animations: {
          duration: 1000
        }
      }
    });
  }

  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener("keyup", function () {
      selectedBulan = null;
      filterTable();
    });
  }

  const resetBtn = document.getElementById("resetChartFilter");

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      selectedBulan = null;
      selectedProduk = null;
        showAllRows();

      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.value = "";
      }

      const metodeSelect = document.getElementById("filterMetode");
      if (metodeSelect) {
        metodeSelect.value = "";
      }

      showAllRows();

      const status = document.getElementById("filterStatus");
      if (status) {
        status.innerText = "Menampilkan semua transaksi";
      }
    });
  }

  const filterMetode = document.getElementById("filterMetode");

  if (filterMetode) {
    filterMetode.addEventListener("change", function () {
      selectedBulan = null;
      filterTable();
    });
  }
});

function filterByBulan(bulan) {
  const rows = document.querySelectorAll(".table-laporan tbody tr");

  rows.forEach(row => {
    const rowBulan = row.getAttribute("data-bulan");
    row.style.display = rowBulan === bulan ? "" : "none";
  });

  const status = document.getElementById("filterStatus");
  if (status) {
    status.innerText = "Menampilkan transaksi bulan: " + bulan;
  }
}

function filterTable() {
  const input = document.getElementById("searchInput").value.toLowerCase();

  const metodeSelect = document.getElementById("filterMetode");
  const metodeFilter = metodeSelect ? metodeSelect.value.toLowerCase() : "";

  const rows = document.querySelectorAll(".table-laporan tbody tr");

  rows.forEach(row => {
    const trx = row.children[1].innerText.toLowerCase();
    const metode = row.children[2].innerText.toLowerCase().trim();
    const total = row.children[3].innerText.toLowerCase();

    const cocokSearch =
      trx.includes(input) ||
      metode.includes(input) ||
      total.includes(input);

    const cocokMetode =
      metodeFilter === "" || metode.includes(metodeFilter);

    row.style.display = cocokSearch && cocokMetode ? "" : "none";
  });
}

function showAllRows() {
  const rows = document.querySelectorAll(".table-laporan tbody tr");

  rows.forEach(row => {
    row.style.display = "";
  });
}

function filterByProduk(produk) {
  const rows = document.querySelectorAll(".table-laporan tbody tr");
  const produkDipilih = produk.toLowerCase().trim();

  rows.forEach(row => {
    const rowProduk = (row.getAttribute("data-produk") || "").toLowerCase().trim();

    if (rowProduk.includes(produkDipilih)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });

  const status = document.getElementById("filterStatus");
  if (status) {
    status.innerText = "Menampilkan produk: " + produk;
  }
}

const rows = document.querySelectorAll(".table-laporan tbody tr");

rows.forEach(row => {
  row.addEventListener("click", function () {
    rows.forEach(r => r.classList.remove("active-row"));
    this.classList.add("active-row");
  });
});