<script>
/* -------- LOGIN -------- */
function secureLogin(e) {
    if (e) e.preventDefault();

    const email = document.querySelector('input[type="email"]').value;
    const password = document.querySelector('input[type="password"]').value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    localStorage.setItem("isLoggedIn", "true");
    window.location.href = "../dashboard_page/dashboard_path.html";
}

/* -------- AUTH GUARD -------- */
function checkAuth() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "../authentication_page/code.html";
    }
}

/* -------- LOGOUT -------- */
function logout() {
    localStorage.clear();
    window.location.href = "../authentication_page/code.html";
}
</script>
