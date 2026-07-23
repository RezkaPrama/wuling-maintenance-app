@extends('layouts.master-without_nav')
@section('title')Log In WULING APPS cuy @endsection
@section('content')
<!--begin::Wrapper-->
<div class="w-lg-500px p-10 p-lg-15 mx-auto">
    @if (session('status'))
    <!--begin::Alert-->
    <div class="alert alert-primary">
        <span class="svg-icon svg-icon-2hx svg-icon-primary me-3">...</span>
        <div class="d-flex flex-column">
            <span>{{ session('status') }}.</span>
        </div>
    </div>
    <!--end::Alert-->
    @endif
    @if(session('success'))
    <div class="alert alert-success">
        {{ session('success') }}
    </div>
    @endif
    @if(session('error'))
    <div class="alert alert-danger">
        {{ session('error') }}
    </div>
    @endif
    @if(session('info'))
    <div class="alert alert-info">
        {{ session('info') }}
    </div>
    @endif

    <form action="{{ route('login') }}" method="POST" id="loginForm">
        @csrf
        <!--begin::Heading-->
        <div class="text-center mb-10">
            <div class="text-center mb-10">
                <a href="{{ url('/') }}" class="mb-12">
                    <img alt="Logo" src="{{ asset('assets/media/logos/logo.png') }}" class="h-80px" />
                </a></br>
            </div>
        </div>
        <div class="fv-row mb-10">
            <label class="form-label fs-6 fw-bolder text-dark">email</label>
            <input class="form-control form-control-lg form-control-solid @error('email') is-invalid @enderror"
                type="text" name="email" autocomplete="off" value="{{ old('email') }}" />
            @error('email')
            <div id="validationServerUsernameFeedback" class="invalid-feedback">
                {{ $message }}
            </div>
            @enderror
        </div>
        <div class="fv-row mb-10">
            <label class="form-label fs-6 fw-bolder text-dark">Password</label>
            <div class="input-group">
                <input class="form-control form-control-lg form-control-solid" type="password" id="password"
                    name="password" autocomplete="off" value="{{ old('password') }}" />
                <button class="btn btn-outline-secondary toggle-password" type="button" data-target="password">
                    <i class="fa fa-eye"></i>
                </button>
            </div>
        </div>

        <div class="fv-row mb-10">
            <a href="/forgot-password" class="link-primary fs-6 fw-bolder">Lupa Password ?</a>
        </div>
        <div class="text-center">
            <!--begin::Submit button-->
            <button type="submit" id="loginBtn" class="btn btn-lg btn-primary w-100 mb-5">
                <span class="btn-text">Login</span>
                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
            </button>
        </div>
        <!--end::Actions-->
    </form>
</div>
<!--end::Wrapper-->

<script>
    const loginForm = document.getElementById('loginForm');
    const loginBtn  = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // WAJIB — cegah submit native ke Fortify route('login')

        const btnText = loginBtn.querySelector('.btn-text');
        const spinner = loginBtn.querySelector('.spinner-border');
        loginBtn.disabled = true;
        btnText.textContent = 'Memproses...';
        spinner.classList.remove('d-none');

        // Bersihkan pesan error lama (kalau ada dari submit sebelumnya)
        document.querySelectorAll('.js-login-error').forEach(el => el.remove());

        const loginValue = this.querySelector('[name="email"]').value; // isinya employee_id ATAU email
        const password    = this.querySelector('[name="password"]').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ login: loginValue, password }),
            });

            const result = await res.json();

            if (!res.ok) {
                // Laravel ValidationException -> { message, errors: { login: [...] } }
                const message = result.errors?.login?.[0] || result.message || 'Login gagal.';
                showError(message);
                resetButton();
                return;
            }

            // Response sukses: { success, message, data: { user, token } }
            localStorage.setItem('sanctum_token', result.data.token);
            window.location.href = '/admin/equipment';

        } catch (err) {
            showError('Tidak bisa terhubung ke server.');
            resetButton();
        }

        function resetButton() {
            loginBtn.disabled = false;
            btnText.textContent = 'Login';
            spinner.classList.add('d-none');
        }

        function showError(message) {
            const errDiv = document.createElement('div');
            errDiv.className = 'alert alert-danger js-login-error';
            errDiv.textContent = message;
            loginForm.insertBefore(errDiv, loginForm.firstChild);
        }
    });
</script>
@endsection