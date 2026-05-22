document.addEventListener("DOMContentLoaded", function () {

    const labels = window.chartLabels;
    const data = window.chartValues;

    const ctx = document.getElementById('myChart');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: '#1a5276'
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });

});