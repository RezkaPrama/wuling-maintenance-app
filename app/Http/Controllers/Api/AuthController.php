<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // ============================================================
    // LOGIN — terima 'login' yang bisa berupa employee_id ATAU email
    // ============================================================
    public function login(Request $request)
    {
        $request->validate([
            'login'    => 'required|string', // isinya bisa employee_id ATAU email
            'password' => 'required|string',
        ]);

        $user = User::where(function ($q) use ($request) {
                $q->where('employee_id', $request->login)
                  ->orWhere('email', $request->login);
            })
            ->where('is_active', 1)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Employee ID / Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('web-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id'          => $user->id,
                    'employee_id' => $user->employee_id,
                    'name'        => $user->name,
                    'email'       => $user->email,
                    'department'  => $user->department,
                    'role'        => $user->role,
                ],
                'token' => $token,
            ],
        ]);
    }

    // ============================================================
    // LOGOUT — hapus token yang sedang dipakai
    // ============================================================
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    // ============================================================
    // ME — data user dari token aktif
    // ============================================================
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user(),
        ]);
    }
}