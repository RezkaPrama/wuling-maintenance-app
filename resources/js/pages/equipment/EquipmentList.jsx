// // resources/js/pages/equipment/EquipmentList.jsx
// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api from '../../services/api';

// export default function EquipmentList() {
//   const [equipment, setEquipment] = useState([]);
//   const [loading, setLoading]     = useState(true);
//   const [search, setSearch]       = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     api.get('/equipment/equipment')
//       .then(res => setEquipment(res.data.data ?? res.data))
//       .catch(err => console.error(err))
//       .finally(() => setLoading(false));
//   }, []);

//   // Filter client-side
//   const filtered = equipment.filter(eq =>
//     eq.name?.toLowerCase().includes(search.toLowerCase()) ||
//     eq.code?.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div className="d-flex flex-column flex-column-fluid">
//       {/* Toolbar */}
//       <div className="toolbar py-5 py-lg-10">
//         <div className="container-xxl d-flex flex-stack flex-wrap gap-2">
//           <h1 className="page-heading d-flex text-dark fw-bold fs-3 flex-column">
//             Equipment
//             <span className="text-muted fs-7 fw-semibold">Daftar semua unit equipment</span>
//           </h1>
//         </div>
//       </div>

//       <div className="container-xxl">
//         <div className="card card-flush">

//           {/* Card Header + Search */}
//           <div className="card-header pt-7 gap-3">
//             <div className="card-title">
//               <div className="d-flex align-items-center position-relative my-1">
//                 <i className="bi bi-search fs-3 position-absolute ms-5 text-muted"></i>
//                 <input
//                   type="text"
//                   className="form-control form-control-solid w-250px ps-13"
//                   placeholder="Cari equipment..."
//                   value={search}
//                   onChange={e => setSearch(e.target.value)}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Card Body — Tabel */}
//           <div className="card-body pt-3">
//             {loading ? (
//               <div className="d-flex justify-content-center py-10">
//                 <div className="spinner-border text-primary" />
//               </div>
//             ) : (
//               <table className="table align-middle table-row-dashed fs-6 gy-4">
//                 <thead>
//                   <tr className="text-start text-muted fw-bold fs-7 text-uppercase">
//                     <th>Kode</th>
//                     <th>Nama Equipment</th>
//                     <th>Lokasi</th>
//                     <th>Status</th>
//                     <th>Aksi</th>
//                   </tr>
//                 </thead>
//                 <tbody className="fw-semibold text-gray-600">
//                   {filtered.length ? filtered.map(eq => (
//                     <tr key={eq.id}>
//                       <td>
//                         <span className="badge badge-light-primary">{eq.code}</span>
//                       </td>
//                       <td>{eq.name}</td>
//                       <td>{eq.location ?? '-'}</td>
//                       <td>
//                         <span className={`badge badge-light-${eq.status === 'active' ? 'success' : 'danger'}`}>
//                           {eq.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
//                         </span>
//                       </td>
//                       <td>
//                         <button
//                           className="btn btn-sm btn-light-primary"
//                           onClick={() => navigate(`/equipment/${eq.id}`)}
//                         >
//                           <i className="bi bi-eye me-1"></i>Detail
//                         </button>
//                       </td>
//                     </tr>
//                   )) : (
//                     <tr>
//                       <td colSpan={5} className="text-center text-muted py-5">
//                         Tidak ada data equipment
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             )}
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }

export default function EquipmentList() {
    return <h2>Halaman Equipment</h2>
}