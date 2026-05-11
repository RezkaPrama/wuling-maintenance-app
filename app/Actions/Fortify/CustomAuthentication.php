<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomAuthentication
{
    public function __invoke(Request $request): mixed
    {
        $loginInput = $request->email; // field di form tetap "email"

        // Cari user berdasarkan employee_id ATAU name
        $user = User::where('is_active', 1)
            ->where('email', $loginInput)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return null;
        }

        return $user;
    }
}