// reminder_items akan dikirim dari template dashboard
document.addEventListener("DOMContentLoaded", function() {
    if(typeof reminder_items !== "undefined" && reminder_items.length > 0){
        let message = "Barang mendekati expired:\n";
        reminder_items.forEach(item => {
            message += `${item.nama} - ${item.expired_date} (${item.periode})\n`;
        });
        alert(message);
    }
});