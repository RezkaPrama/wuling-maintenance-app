<!DOCTYPE html>
<html lang="en">
<!--begin::Head-->
<head>
    {{-- FIX: <base href="{{ route('admin.dashboard.index') }}"> DIHAPUS.
         Tag <base> mengubah resolusi semua URL relatif di halaman,
         termasuk push-state React Router — kalau dibiarkan, navigasi
         client-side (link sidebar, redirect dari JS) bisa salah arah. --}}
    <title>Wuling - Web App Wuling</title>
    <meta charset="utf-8" />
    <meta name="description" content="Web App Wulling Maintenance apps." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="Wuling - Web App Wuling" />
    <meta property="og:site_name" content="Wuling | wuling.com" />
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <link rel="shortcut icon" href="{{ asset('assets/media/logos/favicon.png') }}" />

    <!--begin::Fonts-->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Poppins:300,400,500,600,700" />
    <!--end::Fonts-->
    <!--begin::Page Vendor Stylesheets(used by this page)-->
    <link href="{{ asset('assets/plugins/custom/fullcalendar/fullcalendar.bundle.css') }}" rel="stylesheet" type="text/css" />
    <link href="{{ asset('assets/plugins/custom/datatables/datatables.bundle.css') }}" rel="stylesheet" type="text/css" />
    <!--end::Page Vendor Stylesheets-->
    <!--begin::Global Stylesheets Bundle(used by all pages)-->
    <link href="{{ asset('assets/plugins/global/plugins.bundle.css') }}" rel="stylesheet" type="text/css" />
    <link href="{{ asset('assets/css/style.bundle.css') }}" rel="stylesheet" type="text/css" />
    <link href="{{ asset('assets/icons/phosphor/styles.min.css') }}" rel="stylesheet" type="text/css">
    @stack('styles')

    {{-- WAJIB sebelum @vite() untuk plugin React --}}
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<!--end::Head-->
<!--begin::Body-->
<body id="kt_body" class="header-fixed header-tablet-and-mobile-fixed toolbar-enabled toolbar-fixed aside-enabled aside-fixed" style="--kt-toolbar-height:55px;--kt-toolbar-height-tablet-and-mobile:55px">
    <!--begin::Main-->
    <!--begin::Root-->
    <div class="d-flex flex-column flex-root">
        <!--begin::Page-->
        <div class="page d-flex flex-row flex-column-fluid">
            <!--begin::Aside-->
            @include('layouts.sidebar')
            <!--end::Aside-->

            <!--begin::Wrapper-->
            <div class="wrapper d-flex flex-column flex-row-fluid" id="kt_wrapper">
                <!--begin::Header-->
                @include('layouts.topbar')
                <!--end::Header-->

                <!--begin::Content — INI yang diganti React, bukan @yield('content') lagi-->
                <div class="post d-flex flex-column-fluid" id="kt_post">
                    <div id="root" class="container-fluid"></div>
                </div>
                <!--end::Content-->

                <!--begin::Footer-->
                @include('layouts.footer')
                <!--end::Footer-->
            </div>
            <!--end::Wrapper-->
        </div>
        <!--end::Page-->
    </div>
    <!--end::Root-->

    <!--begin::Scrolltop-->
    <div id="kt_scrolltop" class="scrolltop" data-kt-scrolltop="true">
        <span class="svg-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect opacity="0.5" x="13" y="6" width="13" height="2" rx="1" transform="rotate(90 13 6)" fill="currentColor" />
                <path d="M12.5657 8.56569L16.75 12.75C17.1642 13.1642 17.8358 13.1642 18.25 12.75C18.6642 12.3358 18.6642 11.6642 18.25 11.25L12.7071 5.70711C12.3166 5.31658 11.6834 5.31658 11.2929 5.70711L5.75 11.25C5.33579 11.6642 5.33579 12.3358 5.75 12.75C6.16421 13.1642 6.83579 13.1642 7.25 12.75L11.4343 8.56569C11.7467 8.25327 12.2533 8.25327 12.5657 8.56569Z" fill="currentColor" />
            </svg>
        </span>
    </div>
    <!--end::Scrolltop-->

    <!--begin::Javascript-->
    @include('layouts.vendor-admin-scripts')
    <!--end::Javascript-->

    {{--
        FIX: link "Sign Out" di topbar.blade.php submit ke route('logout')
        Fortify (session-based), tapi auth React sekarang berbasis token
        Sanctum di localStorage. Kalau cuma logout session, token di
        localStorage TIDAK ikut kehapus — user kelihatan "logout" tapi
        token lama masih bisa dipakai manggil API sampai expired manual.
        Script ini nyisipin pembersihan token SEBELUM form submit jalan.
    --}}
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const logoutForm = document.getElementById('logout-form');
            if (logoutForm) {
                logoutForm.addEventListener('submit', function () {
                    localStorage.removeItem('sanctum_token');
                    // biarkan form tetap submit normal (logout session Fortify, kalaupun ada)
                });
            }
        });
    </script>
</body>
<!--end::Body-->
</html>