async function xuatPhieuTuExamId(examId) {
    try {
        // 1. Lấy dữ liệu đầy đủ từ server
        const response = await fetch(`/api/exam-full/${examId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        if (!result.success) {
            alert('Lỗi lấy dữ liệu: ' + result.error);
            return;
        }
        const hoso = result.data;

        // 2. Gọi API xuất phiếu với dữ liệu vừa có
        xuatPhieuKham(hoso);
    } catch (err) {
        alert('Lỗi: ' + err.message);
    }
}

// Hàm xuatPhieuKham giữ nguyên, chỉ gửi dữ liệu hoso
function xuatPhieuKham(hoso) {
    fetch('/api/xuat-phieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hoso)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                taiFileDocx(data.base64, data.filename);
            } else {
                alert('Lỗi: ' + data.error);
            }
        });
}

function taiFileDocx(base64, tenFile) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tenFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}