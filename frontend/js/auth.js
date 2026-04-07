// js/auth.js

// Kiểm tra và chuyển hướng nếu chưa đăng nhập
export function checkAuth() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(currentUser);
}

// Tự động chạy khi import vào trang (ngoại trừ login/register)
export function initAuth() {
    const protectedPages = ['index.html', 'doctor-dashboard.html', 'nurse-dashboard.html', 'history.html', 'conclusion.html'];
    const currentPage = window.location.pathname.split('/').pop();
    if (protectedPages.includes(currentPage)) {
        checkAuth();
    }
}

// Hàm đăng xuất
export function logout() {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('token'); // nếu dùng token
    window.location.href = 'login.html';
}