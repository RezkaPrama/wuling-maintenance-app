<!DOCTYPE html>
<html lang="en">
<!--begin::Head-->
<head>
    <base href="../../../">
    <title>Wuling - Maintenance</title>
    <meta charset="utf-8" />
    <meta name="description" content="Web App Wuling." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="Wuling - Maintenance" />
    <meta property="og:site_name" content="Wuling - Maintenance" />
    <link rel="shortcut icon" href="{{ asset('assets/media/logos/favicon.png') }}" />
    <!--begin::Fonts-->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Poppins:300,400,500,600,700" />
    <!--end::Fonts-->
    <!--begin::Global Stylesheets Bundle(used by all pages)-->
    @include('layouts.head-css')

    <!--end::Global Stylesheets Bundle-->
</head>
<!--end::Head-->
<!--begin::Body-->
<body id="kt_body" class="bg-body">
    <!--begin::Root-->
    <div class="d-flex flex-column flex-root">
        <!--begin::Authentication - Sign-in -->
        <div class="d-flex flex-column flex-lg-row flex-column-fluid">
            <!--begin::Aside-->
            <div class="d-flex flex-column flex-lg-row-auto w-xl-600px positon-xl-relative" style="background-color: #F2C98A">
                <div class="d-flex flex-column position-xl-fixed top-0 bottom-0 w-xl-600px scroll-y">
                    <div class="d-flex flex-row-fluid flex-column text-center p-10 pt-lg-20">

                        <h1 class="fw-bolder fs-2qx pb-5 pb-md-10" style="color: #986923;">Selamat Datang Di Wuling Apps</h1>
                        <p class="fw-bold fs-2" style="color: #986923;">Sign In Web
                            <br />Wuling Maintenance Apps</p>
                    </div>
                    <div class="d-flex flex-row-auto bgi-no-repeat bgi-position-x-center bgi-size-contain bgi-position-y-bottom min-h-100px min-h-lg-350px" style="background-image: url(assets/media/illustrations/cbb/vector-login-3.PNG"></div>
                </div>
            </div>
            <!--end::Aside-->

            <div class="d-flex flex-column flex-lg-row-fluid py-10">
                <div class="d-flex flex-center flex-column flex-column-fluid">
                    @yield('content')
                </div>
                
            </div>
        </div>
        <!--end::Authentication - Sign-in-->
    </div>
    <!--end::Root-->

    <!--begin::Javascript-->
    @include('layouts.vendor-scripts')
    <!--end::Javascript-->
</body>
<!--end::Body-->
</html>
