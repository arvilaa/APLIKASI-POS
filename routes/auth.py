from flask import Blueprint, render_template, request, redirect, url_for, flash, session

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username == "admin" and password == "123":
            session["user"] = username
            return redirect(url_for("dashboard.dashboard"))
        else:
            flash("Username atau password salah!", "error")

    return render_template("login.html")
@auth_bp.route("/logout")
def logout():
    session.pop("user", None)  # hapus session
    return redirect(url_for("auth.login"))