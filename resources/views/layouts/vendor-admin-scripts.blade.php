<!-- JavaScript -->
<script>
    var hostUrl = "assets/";

</script>
<!--begin::Global Javascript Bundle(used by all pages)-->
<script src="{{ asset('assets/plugins/global/plugins.bundle.js') }}"></script>
<script src="{{ asset('assets/js/scripts.bundle.js') }}"></script>
<!--end::Global Javascript Bundle-->
<!--begin::Page Vendors Javascript(used by this page)-->
<script src="{{ asset('assets/plugins/custom/fullcalendar/fullcalendar.bundle.js') }}"></script>
<script src="{{ asset('assets/plugins/custom/datatables/datatables.bundle.js') }}"></script>
<!--end::Page Vendors Javascript-->
<!--begin::Page Custom Javascript(used by this page)-->
<script src="{{ asset('assets/js/widgets.bundle.js') }}"></script>
<script src="{{ asset('assets/js/custom/widgets.js') }}"></script>
<script src="{{ asset('assets/js/custom/apps/chat/chat.js') }}"></script>
<script src="{{ asset('assets/js/custom/utilities/modals/upgrade-plan.js') }}"></script>
<script src="{{ asset('assets/js/custom/utilities/modals/create-app.js') }}"></script>
<script src="{{ asset('assets/js/custom/utilities/modals/users-search.js') }}"></script>
<script>
    //flash message
    @if(session()->has('success'))
    Swal.fire({
        type: "success", 
        icon: "success",
        title: "BERHASIL!", 
        text: "{{ session('success') }}",
        timer: 2000, 
        showConfirmButton: false, 
        showCancelButton: false,
        buttons: false, });
    @elseif(session()->has('error'))
    Swal.fire({
        type: "error",
        icon: "error",
        title: "GAGAL!", 
        text: "{{ session('error') }}",
        timer: 2000,
        showConfirmButton: false,
        showCancelButton: false,
        buttons: false,
     });
    @endif

</script>
<!--end::Page Custom Javascript-->
@stack('scripts')
