@extends('layouts.master-without_nav')
@section('title')Log In WULING APPS @endsection
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
            <input class="form-control form-control-lg form-control-solid @error('email') is-invalid @enderror" type="text" name="email" autocomplete="off" value="{{ old('email') }}" />
            @error('email')
            <div id="validationServerUsernameFeedback" class="invalid-feedback">
                {{ $message }}
            </div>
            @enderror
        </div>
        <div class="fv-row mb-10">
            <label class="form-label fs-6 fw-bolder text-dark">Password</label>
            <div class="input-group">
                <input class="form-control form-control-lg form-control-solid" type="password" id="password" name="password" autocomplete="off" value="{{ old('password') }}" />
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
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function () {
            const targetInput = document.getElementById(this.dataset.target);
            const icon = this.querySelector('i');
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Loading state saat submit — simple, tanpa CSRF refresh
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        const submitBtn = document.getElementById('loginBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner-border');

        submitBtn.disabled = true;
        btnText.textContent = 'Memproses...';
        spinner.classList.remove('d-none');

        // Biarkan form submit normal, jangan e.preventDefault()
    });

    // Handle session expired dari URL param
    document.addEventListener('DOMContentLoaded', function() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('expired') === '1') {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-warning alert-dismissible fade show';
            alertDiv.innerHTML = `
                <strong>Sesi Berakhir!</strong> Silakan login kembali untuk melanjutkan.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            const wrapper = document.querySelector('.w-lg-500px');
            wrapper.insertBefore(alertDiv, wrapper.firstChild);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    });
</script>
@endsection