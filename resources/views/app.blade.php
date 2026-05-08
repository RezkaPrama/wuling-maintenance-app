<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wuling Maintenance</title>

    {{-- CSS Metronic --}}
    <link rel="stylesheet" href="{{ asset('metronic/plugins/global/plugins.bundle.css') }}">
    <link rel="stylesheet" href="{{ asset('metronic/css/style.bundle.css') }}">

    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>
<body id="kt_body">
    <div id="root"></div>

    {{-- JS Metronic — urutan plugins dulu baru scripts --}}
    <script src="{{ asset('metronic/plugins/global/plugins.bundle.js') }}"></script>
    <script src="{{ asset('metronic/js/scripts.bundle.js') }}"></script>
</body>
</html>