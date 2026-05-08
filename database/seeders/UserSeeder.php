<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'employee_id' => 'ADMIN001',
            'name' => 'Administrator',
            'email' => 'admin@wuling.com',
            'password' => bcrypt('password'),
            'department' => 'IT',
            'role' => 'admin',
            'is_active' => true,
        ]);

        User::create([
            'employee_id' => 'SUP001',
            'name' => 'Koko Kurniawan',
            'email' => 'koko.kurniawan@wuling.com',
            'password' => bcrypt('password'),
            'department' => 'Body Shop',
            'role' => 'supervisor',
            'is_active' => true,
        ]);

        User::create([
            'employee_id' => 'TECH001',
            'name' => 'Technician 1',
            'email' => 'tech1@wuling.com',
            'password' => bcrypt('password'),
            'department' => 'Body Shop',
            'role' => 'technician',
            'is_active' => true,
        ]);

        User::create([
            'employee_id' => 'TECH002',
            'name' => 'Technician 2',
            'email' => 'tech2@wuling.com',
            'password' => bcrypt('password'),
            'department' => 'Body Shop',
            'role' => 'technician',
            'is_active' => true,
        ]);

    }
}
